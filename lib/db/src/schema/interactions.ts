import { pgTable, text, serial, integer, timestamp, index } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";

export const interactionsTable = pgTable("crm_interactions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  notes: text("notes").notNull().default(""),
}, (t) => [index("crm_interactions_user_contact_idx").on(t.userId, t.contactId)]);
export const insertInteractionSchema = createInsertSchema(interactionsTable).omit({ id: true });
export type InteractionRow = typeof interactionsTable.$inferSelect;
