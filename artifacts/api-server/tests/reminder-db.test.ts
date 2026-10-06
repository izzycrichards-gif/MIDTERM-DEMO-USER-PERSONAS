import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { db, pool, usersTable, contactsTable, followUpsTable, notificationsTable, reminderDeliveriesTable } from "@workspace/db";
import { enqueueDueReminders, prepareDelivery } from "../src/lib/reminder-worker";
import { retryDecision } from "../src/lib/reminder-policy";

test("durable reminders, deduplication, ownership, retry persistence, and lifecycle guards use real PostgreSQL", async () => {
  const userId = `reminder-test-${randomUUID()}`;
  const otherId = `reminder-test-${randomUUID()}`;
  try {
    await db.insert(usersTable).values([
      { id: userId, reminderTimezone: "America/New_York" },
      { id: otherId, reminderTimezone: "UTC" },
    ]);
    const [contact] = await db.insert(contactsTable).values({ userId, firstName: "Reminder", lastName: "Test" }).returning();
    const [other] = await db.insert(contactsTable).values({ userId: otherId, firstName: "Other", lastName: "Test" }).returning();
    const [follow] = await db.insert(followUpsTable).values({
      userId, contactId: contact.id, dueDate: "2026-10-06", dueTime: "09:30", recurrenceDays: 7,
    }).returning();
    // A corrupted cross-owner link must never materialize a notification.
    await db.insert(followUpsTable).values({ userId, contactId: other.id, dueDate: "2026-10-05" });
    await enqueueDueReminders(new Date("2026-10-06T13:29:59Z"), userId);
    assert.equal((await db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId))).length, 0);
    await Promise.all([
      enqueueDueReminders(new Date("2026-10-06T13:30:00Z"), userId),
      enqueueDueReminders(new Date("2026-10-06T13:30:00Z"), userId),
    ]);
    const notifications = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, userId));
    assert.equal(notifications.length, 1);
    assert.equal(notifications[0].contactId, contact.id);
    assert.equal((await db.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.userId, userId))).length, 0, "unconfigured sender creates no email jobs");

    const first = new Date("2026-10-06T13:30:00Z");
    const [job] = await db.insert(reminderDeliveriesTable).values({
      userId, followUpId: follow.id, scheduleRevision: 1, attempts: 1, firstAttemptAt: first,
      ...retryDecision(first, 1, first, true),
    }).returning();
    await db.insert(reminderDeliveriesTable).values({ userId, followUpId: follow.id, scheduleRevision: 1 }).onConflictDoNothing();
    const [persisted] = await db.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.id, job.id));
    assert.equal(persisted.state, "retry");
    assert.equal(persisted.attempts, 1);
    assert.equal(persisted.nextAttemptAt.toISOString(), "2026-10-06T13:31:00.000Z");
    assert.equal((await db.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.followUpId, follow.id))).length, 1);
    assert.equal(await prepareDelivery(job.id, new Date("2026-10-06T13:32:00Z")), false, "opt-out cancels before any provider call");
    assert.equal((await db.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.id, job.id)))[0].state, "cancelled");

    await db.update(usersTable).set({ emailRemindersEnabled: true, reminderEmail: "fixture@example.invalid" }).where(eq(usersTable.id, userId));
    await db.update(reminderDeliveriesTable).set({ state: "retry" }).where(eq(reminderDeliveriesTable.id, job.id));
    await db.update(followUpsTable).set({ scheduleRevision: sql`${followUpsTable.scheduleRevision} + 1`, dueDate: "2026-10-07" }).where(eq(followUpsTable.id, follow.id));
    assert.equal(await prepareDelivery(job.id, new Date("2026-10-06T13:32:00Z")), false, "reschedule cancels the old occurrence");
    const [newJob] = await db.insert(reminderDeliveriesTable).values({ userId, followUpId: follow.id, scheduleRevision: 2 }).returning();
    assert.notEqual(job.deliveryKey, newJob.deliveryKey);
    await db.update(followUpsTable).set({ status: "completed", completedAt: first }).where(eq(followUpsTable.id, follow.id));
    assert.equal(await prepareDelivery(newJob.id, new Date("2026-10-08T00:00:00Z")), false, "completed follow-up cannot send");
    const [next] = await db.insert(followUpsTable).values({ userId, contactId: contact.id, dueDate: "2026-10-13", recurrenceDays: 7 }).returning();
    assert.notEqual(next.id, follow.id);
    assert.equal(next.scheduleRevision, 1);
    const [nextJob] = await db.insert(reminderDeliveriesTable).values({
      userId, followUpId: next.id, scheduleRevision: 1, firstAttemptAt: first, state: "sending",
      nextAttemptAt: new Date("2026-10-06T13:35:00Z"),
    }).returning();
    assert.equal(await prepareDelivery(nextJob.id, new Date("2026-10-08T00:00:00Z")), false, "crash recovery outside the key window must not send");
    assert.equal((await db.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.id, nextJob.id)))[0].state, "uncertain");
    assert.equal((await db.select().from(reminderDeliveriesTable).where(and(eq(reminderDeliveriesTable.userId, otherId), eq(reminderDeliveriesTable.id, nextJob.id)))).length, 0);
    await db.delete(contactsTable).where(eq(contactsTable.id, contact.id));
    assert.equal((await db.select().from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.userId, userId))).length, 0, "deletion removes related queue entries");
  } finally {
    await db.delete(usersTable).where(eq(usersTable.id, userId));
    await db.delete(usersTable).where(eq(usersTable.id, otherId));
    await pool.end();
  }
});
