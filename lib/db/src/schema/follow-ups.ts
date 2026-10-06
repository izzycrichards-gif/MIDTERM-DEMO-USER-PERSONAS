import { pgTable, text, serial, integer, timestamp, date, index, uniqueIndex } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";

export const followUpsTable = pgTable("crm_follow_ups", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  dueTime: text("due_time"),
  scheduleRevision: integer("schedule_revision").notNull().default(1),
  recurrenceDays: integer("recurrence_days"),
  status: text("status").notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
  index("crm_follow_ups_user_due_idx").on(t.userId, t.dueDate),
  uniqueIndex("crm_follow_ups_pending_contact_idx").on(t.contactId).where(sql`${t.status} = 'pending'`),
]);
export const insertFollowUpSchema = createInsertSchema(followUpsTable).omit({ id: true, createdAt: true });
export type FollowUpRow = typeof followUpsTable.$inferSelect;
