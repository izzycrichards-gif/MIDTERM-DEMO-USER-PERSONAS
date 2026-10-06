import { Router, type IRouter } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { clerkClient } from "@clerk/express";
import { db, usersTable, reminderDeliveriesTable } from "@workspace/db";
import { GetReminderPreferencesResponse, UpdateReminderPreferencesBody, UpdateReminderPreferencesResponse } from "@workspace/api-zod";
import { HttpError, reply } from "../../lib/crm";
import { emailDeliveryConfigured } from "../../lib/reminder-email";

const router: IRouter = Router();

async function preferences(userId: string) {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
  const recentDeliveries = await db.select({
    id: reminderDeliveriesTable.id, followUpId: reminderDeliveriesTable.followUpId,
    state: reminderDeliveriesTable.state, attempts: reminderDeliveriesTable.attempts,
    sentAt: reminderDeliveriesTable.sentAt, lastError: reminderDeliveriesTable.lastError,
  }).from(reminderDeliveriesTable).where(eq(reminderDeliveriesTable.userId, userId))
    .orderBy(desc(reminderDeliveriesTable.createdAt)).limit(10);
  return {
    emailEnabled: user.emailRemindersEnabled, timezone: user.reminderTimezone,
    email: user.reminderEmail, deliveryAvailable: emailDeliveryConfigured(), recentDeliveries,
  };
}

router.get("/reminder-preferences", async (_req, res): Promise<void> => {
  reply(res, GetReminderPreferencesResponse, await preferences(res.locals.userId));
});

router.put("/reminder-preferences", async (req, res): Promise<void> => {
  const data = UpdateReminderPreferencesBody.parse(req.body);
  try { new Intl.DateTimeFormat("en-US", { timeZone: data.timezone }).format(); }
  catch { throw new HttpError(400, "Choose a valid IANA timezone, such as America/New_York."); }
  let email: string | null = null;
  if (data.emailEnabled) {
    if (!emailDeliveryConfigured()) throw new HttpError(503, "Email delivery is not configured. In-app reminders still work.");
    const account = await clerkClient.users.getUser(res.locals.userId);
    email = account.emailAddresses.find(e => e.id === account.primaryEmailAddressId && e.verification?.status === "verified")?.emailAddress ?? null;
    if (!email) throw new HttpError(400, "Verify your primary account email before enabling reminders.");
  }
  const userId: string = res.locals.userId;
  await db.transaction(async tx => {
    // Synchronize opt-out with a send already in progress.
    await tx.select().from(usersTable).where(eq(usersTable.id, userId)).for("update");
    await tx.update(usersTable).set({
      emailRemindersEnabled: data.emailEnabled, reminderTimezone: data.timezone, reminderEmail: email,
    }).where(eq(usersTable.id, userId));
    if (!data.emailEnabled) await tx.update(reminderDeliveriesTable).set({
      state: "cancelled", lastError: "Email reminders were disabled",
    }).where(and(eq(reminderDeliveriesTable.userId, userId), inArray(reminderDeliveriesTable.state, ["pending", "retry", "sending"])));
  });
  reply(res, UpdateReminderPreferencesResponse, await preferences(userId));
});

export default router;
