import { Router, type IRouter } from "express";
import { and, desc, eq } from "drizzle-orm";
import { db, tagsTable, notificationsTable } from "@workspace/db";
import {
  GetDashboardResponse, ListTagsResponse, CreateTagBody, CreateTagResponse, DeleteTagParams,
  ListNotificationsResponse, MarkNotificationReadParams, MarkNotificationReadResponse,
} from "@workspace/api-zod";
import { getContacts, getFollowUps, getTags, HttpError, localClock, reply, syncReminders } from "../../lib/crm";

const router: IRouter = Router();

router.get("/dashboard", async (req, res): Promise<void> => {
  const userId: string = res.locals.userId;
  const [contacts, follows] = await Promise.all([getContacts(userId), getFollowUps(userId)]);
  const pending = follows.filter(f => f.status === "pending");
  const { today } = localClock(req);
  reply(res, GetDashboardResponse, {
    totalContacts: contacts.length,
    newLeads: contacts.filter(c => c.status === "New Lead").length,
    warmLeads: contacts.filter(c => c.status === "Warm Lead").length,
    activeClients: contacts.filter(c => c.status === "Client").length,
    dueToday: pending.filter(f => f.dueDate === today),
    overdue: pending.filter(f => f.dueDate < today),
    upcoming: pending.filter(f => f.dueDate > today),
    recentlyContacted: contacts.filter(c => c.lastContactedAt)
      .sort((a, b) => b.lastContactedAt!.getTime() - a.lastContactedAt!.getTime()).slice(0, 6),
  });
});

router.get("/tags", async (_req, res): Promise<void> => {
  reply(res, ListTagsResponse, await getTags(res.locals.userId));
});

router.post("/tags", async (req, res): Promise<void> => {
  const data = CreateTagBody.parse(req.body);
  const name = data.name.trim();
  if (!name) throw new HttpError(400, "Tag name is required.");
  const userId: string = res.locals.userId;
  const [existing] = await db.select().from(tagsTable).where(and(eq(tagsTable.userId, userId), eq(tagsTable.name, name)));
  if (existing) {
    reply(res, CreateTagResponse, (await getTags(userId)).find(t => t.id === existing.id), 201);
    return;
  }
  const [tag] = await db.insert(tagsTable).values({ name, userId }).onConflictDoNothing().returning();
  const result = tag ?? (await db.select().from(tagsTable).where(and(eq(tagsTable.userId, userId), eq(tagsTable.name, name))))[0];
  reply(res, CreateTagResponse, { id: result.id, name: result.name, contactCount: 0 }, 201);
});

router.delete("/tags/:id", async (req, res): Promise<void> => {
  const { id } = DeleteTagParams.parse(req.params);
  const rows = await db.delete(tagsTable).where(and(eq(tagsTable.id, id), eq(tagsTable.userId, res.locals.userId))).returning();
  if (!rows.length) throw new HttpError(404, "Tag not found.");
  res.sendStatus(204);
});

router.get("/notifications", async (req, res): Promise<void> => {
  await syncReminders(res.locals.userId, req);
  const rows = await db.select().from(notificationsTable).where(eq(notificationsTable.userId, res.locals.userId)).orderBy(desc(notificationsTable.createdAt)).limit(100);
  reply(res, ListNotificationsResponse, rows.map(({ userId: _owner, ...row }) => row));
});

router.patch("/notifications/:id/read", async (req, res): Promise<void> => {
  const { id } = MarkNotificationReadParams.parse(req.params);
  const [row] = await db.update(notificationsTable).set({ readAt: new Date() })
    .where(and(eq(notificationsTable.userId, res.locals.userId), eq(notificationsTable.id, id))).returning();
  if (!row) throw new HttpError(404, "Notification not found.");
  const { userId: _owner, ...notification } = row;
  reply(res, MarkNotificationReadResponse, notification);
});
export default router;
