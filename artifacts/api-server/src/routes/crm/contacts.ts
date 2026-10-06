import { Router, type IRouter } from "express";
import { scheduleChanged } from "../../lib/reminder-policy";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import {
  db, contactsTable, tagsTable, contactTagsTable, followUpsTable,
  notificationsTable, interactionsTable,
} from "@workspace/db";
import {
  ListContactsQueryParams, ListContactsResponse, CreateContactBody, CreateContactResponse,
  GetContactParams, GetContactResponse, UpdateContactParams, UpdateContactBody, UpdateContactResponse,
  DeleteContactParams, ListInteractionsParams, ListInteractionsResponse,
  CreateInteractionParams, CreateInteractionBody, CreateInteractionResponse,
} from "@workspace/api-zod";
import { getContacts, HttpError, localClock, reply, validateSchedule } from "../../lib/crm";

const router: IRouter = Router();

router.get("/contacts", async (req, res): Promise<void> => {
  const q = ListContactsQueryParams.parse(req.query);
  let contacts = await getContacts(res.locals.userId);
  const { today } = localClock(req);
  if (q.search) {
    const search = q.search.toLowerCase();
    contacts = contacts.filter(c => [c.firstName, c.lastName, `${c.firstName} ${c.lastName}`, c.company, c.email, c.phone]
      .some(v => v?.toLowerCase().includes(search)));
  }
  if (q.status) contacts = contacts.filter(c => c.status === q.status);
  if (q.tagId) contacts = contacts.filter(c => c.tags.some(t => t.id === q.tagId));
  if (q.followUp && q.followUp !== "all") contacts = contacts.filter(c => {
    if (!c.followUp) return false;
    if (q.followUp === "overdue") return c.followUp.dueDate < today;
    if (q.followUp === "today") return c.followUp.dueDate === today;
    if (q.followUp === "upcoming") return c.followUp.dueDate > today;
    return false;
  });
  contacts.sort((a, b) => {
    if (q.sort === "recently-contacted") return (b.lastContactedAt?.getTime() ?? 0) - (a.lastContactedAt?.getTime() ?? 0);
    if (q.sort === "next-follow-up") return (a.followUp?.dueDate ?? "9999").localeCompare(b.followUp?.dueDate ?? "9999");
    return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
  });
  reply(res, ListContactsResponse, contacts);
});

router.post("/contacts", async (req, res): Promise<void> => {
  validateSchedule(req.body);
  const data = CreateContactBody.parse(req.body);
  if (!data.firstName.trim() || !data.lastName.trim()) throw new HttpError(400, "First and last name are required.");
  const userId: string = res.locals.userId;
  const { tagIds = [], nextFollowUpDate, nextFollowUpTime, recurrenceDays, ...fields } = data;
  const ids = [...new Set(tagIds)];
  const ownedTags = ids.length ? await db.select().from(tagsTable).where(and(eq(tagsTable.userId, userId), inArray(tagsTable.id, ids))) : [];
  if (ids.length !== ownedTags.length) throw new HttpError(400, "Invalid tags.");
  const id = await db.transaction(async tx => {
    const [contact] = await tx.insert(contactsTable).values({ ...fields, firstName: data.firstName.trim(), lastName: data.lastName.trim(), userId }).returning();
    if (ids.length) await tx.insert(contactTagsTable).values(ids.map(tagId => ({ contactId: contact.id, tagId })));
    if (nextFollowUpDate) await tx.insert(followUpsTable).values({
      userId, contactId: contact.id, dueDate: nextFollowUpDate.toISOString().slice(0, 10),
      dueTime: nextFollowUpTime, recurrenceDays,
    });
    return contact.id;
  });
  reply(res, CreateContactResponse, (await getContacts(userId)).find(c => c.id === id), 201);
});

router.get("/contacts/:id", async (req, res): Promise<void> => {
  const { id } = GetContactParams.parse(req.params);
  const userId: string = res.locals.userId;
  const contact = (await getContacts(userId)).find(c => c.id === id);
  if (!contact) throw new HttpError(404, "Contact not found.");
  const rows = await db.select().from(interactionsTable).where(and(eq(interactionsTable.userId, userId), eq(interactionsTable.contactId, id))).orderBy(desc(interactionsTable.occurredAt));
  const interactions = rows.map(({ userId: _owner, ...row }) => row);
  reply(res, GetContactResponse, { ...contact, interactions });
});

router.patch("/contacts/:id", async (req, res): Promise<void> => {
  const { id } = UpdateContactParams.parse(req.params);
  validateSchedule(req.body);
  const data = UpdateContactBody.parse(req.body);
  if (data.firstName !== undefined && !data.firstName.trim() || data.lastName !== undefined && !data.lastName.trim()) {
    throw new HttpError(400, "First and last name are required.");
  }
  const userId: string = res.locals.userId;
  const { tagIds, nextFollowUpDate, nextFollowUpTime, recurrenceDays, ...fields } = data;
  await db.transaction(async tx => {
    const [contact] = await tx.select().from(contactsTable).where(and(eq(contactsTable.userId, userId), eq(contactsTable.id, id))).for("update");
    if (!contact) throw new HttpError(404, "Contact not found.");
    if (Object.keys(fields).length) await tx.update(contactsTable).set(fields).where(eq(contactsTable.id, id));
    if (tagIds !== undefined) {
      const ids = [...new Set(tagIds)];
      const tags = ids.length ? await tx.select().from(tagsTable).where(and(eq(tagsTable.userId, userId), inArray(tagsTable.id, ids))) : [];
      if (ids.length !== tags.length) throw new HttpError(400, "Invalid tags.");
      await tx.delete(contactTagsTable).where(eq(contactTagsTable.contactId, id));
      if (ids.length) await tx.insert(contactTagsTable).values(ids.map(tagId => ({ contactId: id, tagId })));
    }
    const changed = ["nextFollowUpDate", "nextFollowUpTime", "recurrenceDays"].some(key => key in req.body);
    if (changed) {
      const [pending] = await tx.select().from(followUpsTable).where(and(eq(followUpsTable.contactId, id), eq(followUpsTable.status, "pending")));
      if (pending) {
        if (nextFollowUpDate === null) await tx.delete(followUpsTable).where(eq(followUpsTable.id, pending.id));
        else {
          await tx.update(followUpsTable).set({
            ...(scheduleChanged(pending.dueDate, pending.dueTime, nextFollowUpDate?.toISOString().slice(0, 10), nextFollowUpTime)
              ? { scheduleRevision: sql`${followUpsTable.scheduleRevision} + 1` } : {}),
            ...(nextFollowUpDate ? { dueDate: nextFollowUpDate.toISOString().slice(0, 10) } : {}),
            ...(nextFollowUpTime !== undefined ? { dueTime: nextFollowUpTime } : {}),
            ...(recurrenceDays !== undefined ? { recurrenceDays } : {}),
          }).where(eq(followUpsTable.id, pending.id));
          await tx.delete(notificationsTable).where(eq(notificationsTable.followUpId, pending.id));
        }
      } else if (nextFollowUpDate) {
        await tx.insert(followUpsTable).values({
          userId, contactId: id, dueDate: nextFollowUpDate.toISOString().slice(0, 10),
          dueTime: nextFollowUpTime, recurrenceDays,
        });
      }
    }
  });
  reply(res, UpdateContactResponse, (await getContacts(userId)).find(c => c.id === id));
});

router.delete("/contacts/:id", async (req, res): Promise<void> => {
  const { id } = DeleteContactParams.parse(req.params);
  const rows = await db.delete(contactsTable).where(and(eq(contactsTable.userId, res.locals.userId), eq(contactsTable.id, id))).returning();
  if (!rows.length) throw new HttpError(404, "Contact not found.");
  res.sendStatus(204);
});

router.get("/contacts/:id/interactions", async (req, res): Promise<void> => {
  const { id } = ListInteractionsParams.parse(req.params);
  const rows = await db.select().from(interactionsTable).where(and(eq(interactionsTable.userId, res.locals.userId), eq(interactionsTable.contactId, id))).orderBy(desc(interactionsTable.occurredAt));
  reply(res, ListInteractionsResponse, rows.map(({ userId: _owner, ...row }) => row));
});

router.post("/contacts/:id/interactions", async (req, res): Promise<void> => {
  const { id } = CreateInteractionParams.parse(req.params);
  const data = CreateInteractionBody.parse(req.body);
  const userId: string = res.locals.userId;
  const interaction = await db.transaction(async tx => {
    const [contact] = await tx.select().from(contactsTable).where(and(eq(contactsTable.userId, userId), eq(contactsTable.id, id))).for("update");
    if (!contact) throw new HttpError(404, "Contact not found.");
    const [row] = await tx.insert(interactionsTable).values({ ...data, userId, contactId: id }).returning();
    if (!contact.lastContactedAt || data.occurredAt > contact.lastContactedAt) {
      await tx.update(contactsTable).set({ lastContactedAt: data.occurredAt }).where(eq(contactsTable.id, id));
    }
    const { userId: _owner, ...result } = row;
    return result;
  });
  reply(res, CreateInteractionResponse, interaction, 201);
});
export default router;
