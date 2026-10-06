import { pgTable, text, serial, integer, timestamp, date, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";
import { followUpsTable } from "./follow-ups";

export const notificationsTable = pgTable("crm_notifications", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  followUpId: integer("follow_up_id").notNull().references(() => followUpsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  message: text("message").notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [uniqueIndex("crm_notifications_follow_up_idx").on(t.followUpId)]);
export const insertNotificationSchema = createInsertSchema(notificationsTable).omit({ id: true, createdAt: true });
export type NotificationRow = typeof notificationsTable.$inferSelect;
