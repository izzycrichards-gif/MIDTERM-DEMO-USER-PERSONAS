import { and, eq, inArray } from "drizzle-orm";
import type { Request, Response } from "express";
import {
  db, contactsTable, tagsTable, contactTagsTable, followUpsTable,
  notificationsTable, type FollowUpRow,
} from "@workspace/db";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function reply(res: Response, schema: { parse: (data: unknown) => unknown }, data: unknown, status = 200) {
  schema.parse(data);
  // Send original calendar-date strings, not the generator's coerced Date values.
  res.status(status).json(data);
}

export function localClock(req: Request) {
  let timeZone = req.get("X-Timezone") || "UTC";
  try { new Intl.DateTimeFormat("en-US", { timeZone }).format(); }
  catch { timeZone = "UTC"; }
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value;
  return { today: `${get("year")}-${get("month")}-${get("day")}`, time: `${get("hour")}:${get("minute")}` };
}

export function validateSchedule(body: Record<string, unknown>) {
  const date = body.nextFollowUpDate;
  if (date != null && (typeof date !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(date)
    || !Number.isFinite(new Date(`${date}T00:00:00Z`).getTime())
    || new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) !== date)) {
    throw new HttpError(400, "Enter a valid follow-up date.");
  }
  const time = body.nextFollowUpTime;
  if (time != null && (typeof time !== "string" || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time))) {
    throw new HttpError(400, "Enter a valid follow-up time.");
  }
  if (typeof body.recurrenceDays === "number" && body.recurrenceDays > 3650) {
    throw new HttpError(400, "Recurring intervals cannot exceed 3650 days.");
  }
  for (const value of [body.website, ...(Array.isArray(body.socialLinks) ? body.socialLinks : [])]) {
    if (value != null && value !== "") {
      try {
        const url = new URL(String(value));
        if (!["http:", "https:"].includes(url.protocol)) throw new Error();
      } catch { throw new HttpError(400, "Website and social links must use http or https."); }
    }
  }
}

export async function getTags(userId: string) {
  const tags = await db.select().from(tagsTable).where(eq(tagsTable.userId, userId));
  const links = tags.length ? await db.select().from(contactTagsTable).where(inArray(contactTagsTable.tagId, tags.map(t => t.id))) : [];
  return tags.map(({ userId: _owner, ...tag }) => ({
    ...tag, contactCount: links.filter(l => l.tagId === tag.id).length,
  }));
}

export async function getContacts(userId: string) {
  const rows = await db.select().from(contactsTable).where(eq(contactsTable.userId, userId));
  if (!rows.length) return [];
  const ids = rows.map(c => c.id);
  const [tags, links, pending] = await Promise.all([
    getTags(userId),
    db.select().from(contactTagsTable).where(inArray(contactTagsTable.contactId, ids)),
    db.select().from(followUpsTable).where(and(eq(followUpsTable.userId, userId), eq(followUpsTable.status, "pending"))),
  ]);
  return rows.map(({ userId: _owner, ...contact }) => ({
    ...contact,
    tags: tags.filter(tag => links.some(l => l.contactId === contact.id && l.tagId === tag.id)),
    followUp: publicFollowUp(pending.find(f => f.contactId === contact.id)),
  }));
}

export function publicFollowUp(row: FollowUpRow | undefined) {
  if (!row) return null;
  const { userId: _owner, ...followUp } = row;
  return followUp;
}

export async function getFollowUps(userId: string) {
  const rows = await db.select({
    followUp: followUpsTable, firstName: contactsTable.firstName,
    lastName: contactsTable.lastName, company: contactsTable.company,
  }).from(followUpsTable).innerJoin(contactsTable, eq(followUpsTable.contactId, contactsTable.id))
    .where(and(eq(followUpsTable.userId, userId), eq(contactsTable.userId, userId)))
    .orderBy(followUpsTable.dueDate, followUpsTable.dueTime);
  return rows.map(row => ({
    ...publicFollowUp(row.followUp)!, contactName: `${row.firstName} ${row.lastName}`, company: row.company,
  }));
}

export async function syncReminders(userId: string, req: Request) {
  const { today, time } = localClock(req);
  const due = (await getFollowUps(userId)).filter(f =>
    f.status === "pending" && (f.dueDate < today || (f.dueDate === today && (!f.dueTime || f.dueTime <= time))));
  if (due.length) {
    await db.insert(notificationsTable).values(due.map(f => ({
      userId, contactId: f.contactId, followUpId: f.id, dueDate: f.dueDate,
      title: `Follow up with ${f.contactName}`,
      message: `Your follow-up${f.company ? ` at ${f.company}` : ""} is due ${f.dueDate}.`,
    }))).onConflictDoNothing();
  }
}
