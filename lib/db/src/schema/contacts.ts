import { pgTable, text, serial, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";

export const contactsTable = pgTable("crm_contacts", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  company: text("company"),
  jobTitle: text("job_title"),
  email: text("email"),
  phone: text("phone"),
  website: text("website"),
  socialLinks: text("social_links").array().notNull().default([]),
  notes: text("notes").notNull().default(""),
  status: text("status").notNull().default("New Lead"),
  dateAdded: timestamp("date_added", { withTimezone: true }).notNull().defaultNow(),
  lastContactedAt: timestamp("last_contacted_at", { withTimezone: true }),
}, (t) => [index("crm_contacts_user_idx").on(t.userId)]);
export const insertContactSchema = createInsertSchema(contactsTable).omit({ id: true, dateAdded: true });
export type ContactRow = typeof contactsTable.$inferSelect;
