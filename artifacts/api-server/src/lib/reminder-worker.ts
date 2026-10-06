import { and, eq, inArray, lte } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import {
  db, contactsTable, followUpsTable, usersTable, notificationsTable, reminderDeliveriesTable,
} from "@workspace/db";
import { logger } from "./logger";
import { canAttempt, idempotencyKey, isReminderDue, retryDecision } from "./reminder-policy";
import { emailDeliveryConfigured, EmailDeliveryError, sendReminderEmail } from "./reminder-email";

const activeStates = ["pending", "retry", "sending"];

export async function enqueueDueReminders(now = new Date(), userId?: string) {
  const rows = await db.select({ followUp: followUpsTable, user: usersTable, contact: contactsTable })
    .from(followUpsTable)
    .innerJoin(usersTable, eq(usersTable.id, followUpsTable.userId))
    .innerJoin(contactsTable, and(eq(contactsTable.id, followUpsTable.contactId), eq(contactsTable.userId, followUpsTable.userId)))
    .where(and(eq(followUpsTable.status, "pending"), userId ? eq(followUpsTable.userId, userId) : undefined));
  for (const { followUp: f, user: u, contact: c } of rows) {
    if (!isReminderDue(f.dueDate, f.dueTime, u.reminderTimezone, now)) continue;
    await db.insert(notificationsTable).values({
      userId: u.id, followUpId: f.id, contactId: c.id, dueDate: f.dueDate,
      title: `Follow up with ${c.firstName} ${c.lastName}`,
      message: `Your follow-up${c.company ? ` at ${c.company}` : ""} is due ${f.dueDate}.`,
    }).onConflictDoNothing();
    if (u.emailRemindersEnabled && u.reminderEmail && emailDeliveryConfigured()) {
      await db.insert(reminderDeliveriesTable).values({
        userId: u.id, followUpId: f.id, scheduleRevision: f.scheduleRevision,
      }).onConflictDoNothing();
    }
  }
}

// Both preparation and sending use the lifecycle's contact -> follow-up lock
// order. Holding these locks through the bounded provider request means a
// completed/cancelled/rescheduled follow-up cannot race the final eligibility check.
export async function prepareDelivery(id: number, now: Date) {
  const [snapshot] = await db.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.id, id));
  if (!snapshot) return false;
  return db.transaction(async tx => {
    const [f0] = await tx.select().from(followUpsTable).where(and(eq(followUpsTable.id, snapshot.followUpId), eq(followUpsTable.userId, snapshot.userId)));
    if (!f0) return false;
    const [c] = await tx.select().from(contactsTable).where(and(eq(contactsTable.id, f0.contactId), eq(contactsTable.userId, snapshot.userId))).for("update");
    const [f] = await tx.select().from(followUpsTable).where(eq(followUpsTable.id, f0.id)).for("update");
    const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, snapshot.userId)).for("update");
    const [d] = await tx.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.id, id)).for("update");
    if (!d || !activeStates.includes(d.state) || d.nextAttemptAt > now) return false;
    if (!c || !f || !u || f.status !== "pending" || f.scheduleRevision !== d.scheduleRevision
      || !u.emailRemindersEnabled || !u.reminderEmail || (d.recipient && d.recipient !== u.reminderEmail)) {
      await tx.update(reminderDeliveriesTable).set({ state: "cancelled", lastError: "Reminder is no longer eligible" }).where(eq(reminderDeliveriesTable.id, id));
      return false;
    }
    if (d.attempts >= 8 || !canAttempt(d.firstAttemptAt, now)) {
      await tx.update(reminderDeliveriesTable).set({ state: "uncertain", lastError: "Retry safety window expired; reconcile with provider before retrying" }).where(eq(reminderDeliveriesTable.id, id));
      return false;
    }
    if (!isReminderDue(f.dueDate, f.dueTime, u.reminderTimezone, now)) return false;
    const account = await clerkClient.users.getUser(u.id);
    const email = account.emailAddresses.find(e => e.id === account.primaryEmailAddressId && e.verification?.status === "verified");
    if (!email || email.emailAddress !== u.reminderEmail) {
      await tx.update(reminderDeliveriesTable).set({ state: "cancelled", lastError: "Save settings again with your verified account email" }).where(eq(reminderDeliveriesTable.id, id));
      return false;
    }
    await tx.update(reminderDeliveriesTable).set({
      state: "sending", attempts: d.attempts + 1,
      firstAttemptAt: d.firstAttemptAt ?? now,
      nextAttemptAt: new Date(now.getTime() + 5 * 60_000),
      recipient: d.recipient ?? email.emailAddress,
      sender: d.sender ?? process.env.RESEND_EMAIL_FROM!,
      subject: d.subject ?? `Follow up with ${c.firstName} ${c.lastName}`,
      body: d.body ?? `Your follow-up with ${c.firstName} ${c.lastName}${c.company ? ` at ${c.company}` : ""} is due ${f.dueDate}${f.dueTime ? ` at ${f.dueTime}` : ""} (${u.reminderTimezone}).\n\nYou opted in to Full Circle reminders. Turn off email reminders in Settings.`,
    }).where(eq(reminderDeliveriesTable.id, id));
    return true;
  });
}

async function deliver(id: number) {
  const [snapshot] = await db.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.id, id));
  if (!snapshot) return;
  await db.transaction(async tx => {
    const [f0] = await tx.select().from(followUpsTable).where(and(eq(followUpsTable.id, snapshot.followUpId), eq(followUpsTable.userId, snapshot.userId)));
    if (!f0) return;
    const [c] = await tx.select().from(contactsTable).where(and(eq(contactsTable.id, f0.contactId), eq(contactsTable.userId, snapshot.userId))).for("update");
    const [f] = await tx.select().from(followUpsTable).where(eq(followUpsTable.id, f0.id)).for("update");
    const [u] = await tx.select().from(usersTable).where(eq(usersTable.id, snapshot.userId)).for("update");
    const [d] = await tx.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.id, id)).for("update");
    if (!d || d.state !== "sending") return;
    if (!c || !f || !u || !u.emailRemindersEnabled || f.status !== "pending"
      || f.scheduleRevision !== d.scheduleRevision || u.reminderEmail !== d.recipient
      || !isReminderDue(f.dueDate, f.dueTime, u.reminderTimezone, new Date())) {
      await tx.update(reminderDeliveriesTable).set({ state: "cancelled", lastError: "Reminder is no longer eligible" }).where(eq(reminderDeliveriesTable.id, id));
      return;
    }
    if (!canAttempt(d.firstAttemptAt, new Date())) {
      await tx.update(reminderDeliveriesTable).set({ state: "uncertain", lastError: "Retry safety window expired" }).where(eq(reminderDeliveriesTable.id, id));
      return;
    }
    try {
      const providerMessageId = await sendReminderEmail({
        from: d.sender!, to: d.recipient!, subject: d.subject!, text: d.body!,
      }, idempotencyKey(d.deliveryKey));
      await tx.update(reminderDeliveriesTable).set({
        state: "sent", providerMessageId, sentAt: new Date(), lastError: null,
      }).where(eq(reminderDeliveriesTable.id, id));
    } catch (error) {
      const retryable = !(error instanceof EmailDeliveryError) || error.retryable;
      await tx.update(reminderDeliveriesTable).set({
        ...retryDecision(d.firstAttemptAt!, d.attempts, new Date(), retryable),
        lastError: error instanceof EmailDeliveryError ? error.message : "Email delivery failed",
      }).where(eq(reminderDeliveriesTable.id, id));
    }
  });
}

export async function runReminderTick() {
  await enqueueDueReminders();
  if (!emailDeliveryConfigured()) return;
  const jobs = await db.select({ id: reminderDeliveriesTable.id }).from(reminderDeliveriesTable)
    .where(and(inArray(reminderDeliveriesTable.state, activeStates), lte(reminderDeliveriesTable.nextAttemptAt, new Date())))
    .orderBy(reminderDeliveriesTable.nextAttemptAt).limit(50);
  for (const job of jobs) {
    try {
      if (await prepareDelivery(job.id, new Date())) await deliver(job.id);
    } catch {
      // Durable attempts survive database/process failures. Do not log account data.
      logger.warn({ deliveryId: job.id }, "Reminder processing failed; will retry on next tick");
    }
  }
}

export function startReminderWorker() {
  let running = false;
  const tick = async () => {
    if (running) return;
    running = true;
    try { await runReminderTick(); }
    catch { logger.error("Background reminder tick failed"); }
    finally { running = false; }
  };
  if (!emailDeliveryConfigured()) logger.info("Email reminders disabled: configure a real sender and explicitly enable the worker");
  void tick();
  const timer = setInterval(() => void tick(), 60_000);
  timer.unref();
  return () => clearInterval(timer);
}
