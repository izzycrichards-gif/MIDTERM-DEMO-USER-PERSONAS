import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

export const usersTable = pgTable("crm_users", {
  id: text("id").primaryKey(),
  reminderTimezone: text("reminder_timezone").notNull().default("UTC"),
  emailRemindersEnabled: boolean("email_reminders_enabled").notNull().default(false),
  reminderEmail: text("reminder_email"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
export const insertUserSchema = createInsertSchema(usersTable);
export type User = typeof usersTable.$inferSelect;
