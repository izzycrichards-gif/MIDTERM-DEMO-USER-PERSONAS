import { pgTable, serial, text, integer, timestamp, uniqueIndex, index, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { followUpsTable } from "./follow-ups";

export const reminderDeliveriesTable = pgTable("crm_reminder_deliveries", {
  id: serial("id").primaryKey(),
  deliveryKey: uuid("delivery_key").notNull().defaultRandom().unique(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  followUpId: integer("follow_up_id").notNull().references(() => followUpsTable.id, { onDelete: "cascade" }),
  scheduleRevision: integer("schedule_revision").notNull(),
  state: text("state").notNull().default("pending"),
  attempts: integer("attempts").notNull().default(0),
  nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
  firstAttemptAt: timestamp("first_attempt_at", { withTimezone: true }),
  // Freeze the exact provider payload for idempotent retries.
  recipient: text("recipient"),
  sender: text("sender"),
  subject: text("subject"),
  body: text("body"),
  providerMessageId: text("provider_message_id"),
  lastError: text("last_error"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, t => [
  uniqueIndex("crm_reminder_delivery_schedule_idx").on(t.followUpId, t.scheduleRevision),
  index("crm_reminder_delivery_retry_idx").on(t.state, t.nextAttemptAt),
]);
export const insertReminderDeliverySchema = createInsertSchema(reminderDeliveriesTable).omit({ id: true, createdAt: true });
export type ReminderDeliveryRow = typeof reminderDeliveriesTable.$inferSelect;
