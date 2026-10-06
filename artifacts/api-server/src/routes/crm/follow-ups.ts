import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, contactsTable, followUpsTable, notificationsTable } from "@workspace/db";
import {
  ListFollowUpsQueryParams, ListFollowUpsResponse, CompleteFollowUpParams,
  CompleteFollowUpBody, CompleteFollowUpResponse,
} from "@workspace/api-zod";
import { getFollowUps, HttpError, localClock, publicFollowUp, reply, validateSchedule } from "../../lib/crm";

const router: IRouter = Router();

router.get("/follow-ups", async (req, res): Promise<void> => {
  const { filter } = ListFollowUpsQueryParams.parse(req.query);
  const { today } = localClock(req);
  let rows = await getFollowUps(res.locals.userId);
  if (filter === "completed") rows = rows.filter(f => f.status === "completed");
  else if (filter !== "all") {
    rows = rows.filter(f => f.status === "pending");
    if (filter === "overdue") rows = rows.filter(f => f.dueDate < today);
    if (filter === "today") rows = rows.filter(f => f.dueDate === today);
    if (filter === "upcoming") rows = rows.filter(f => f.dueDate > today);
  }
  reply(res, ListFollowUpsResponse, rows);
});

router.post("/follow-ups/:id/complete", async (req, res): Promise<void> => {
  const { id } = CompleteFollowUpParams.parse(req.params);
  validateSchedule(req.body ?? {});
  const data = CompleteFollowUpBody.parse(req.body ?? {});
  const userId: string = res.locals.userId;
  const [initial] = await db.select().from(followUpsTable).where(and(eq(followUpsTable.id, id), eq(followUpsTable.userId, userId)));
  if (!initial) throw new HttpError(404, "Follow-up not found.");
  const result = await db.transaction(async tx => {
    const [contact] = await tx.select().from(contactsTable).where(and(eq(contactsTable.id, initial.contactId), eq(contactsTable.userId, userId))).for("update");
    if (!contact) throw new HttpError(404, "Contact not found.");
    const [current] = await tx.select().from(followUpsTable).where(and(eq(followUpsTable.id, id), eq(followUpsTable.userId, userId))).for("update");
    if (!current) throw new HttpError(404, "Follow-up not found.");
    if (current.status === "completed") throw new HttpError(409, "This follow-up is already completed.");
    const completedAt = new Date();
    const [completed] = await tx.update(followUpsTable).set({ status: "completed", completedAt }).where(eq(followUpsTable.id, id)).returning();
    await tx.update(contactsTable).set({ lastContactedAt: completedAt }).where(eq(contactsTable.id, contact.id));
    await tx.update(notificationsTable).set({ readAt: completedAt }).where(eq(notificationsTable.followUpId, id));
    const recurrenceDays = data.recurrenceDays !== undefined ? data.recurrenceDays : current.recurrenceDays;
    let nextDate = data.nextFollowUpDate?.toISOString().slice(0, 10) ?? null;
    if (data.nextFollowUpDate === undefined && recurrenceDays) {
      const date = new Date(`${localClock(req).today}T00:00:00Z`);
      date.setUTCDate(date.getUTCDate() + recurrenceDays);
      nextDate = date.toISOString().slice(0, 10);
    }
    let nextFollowUp = null;
    if (nextDate) {
      const [next] = await tx.insert(followUpsTable).values({
        userId, contactId: contact.id, dueDate: nextDate,
        dueTime: data.nextFollowUpTime !== undefined ? data.nextFollowUpTime : current.dueTime,
        recurrenceDays,
      }).returning();
      nextFollowUp = publicFollowUp(next);
    }
    return { completed: publicFollowUp(completed), nextFollowUp };
  });
  reply(res, CompleteFollowUpResponse, result);
});
export default router;
