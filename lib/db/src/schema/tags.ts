import { pgTable, text, serial, integer, primaryKey, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { usersTable } from "./users";
import { contactsTable } from "./contacts";

export const tagsTable = pgTable("crm_tags", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull().references(() => usersTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
}, (t) => [uniqueIndex("crm_tags_user_name_idx").on(t.userId, t.name)]);
export const contactTagsTable = pgTable("crm_contact_tags", {
  contactId: integer("contact_id").notNull().references(() => contactsTable.id, { onDelete: "cascade" }),
  tagId: integer("tag_id").notNull().references(() => tagsTable.id, { onDelete: "cascade" }),
}, (t) => [primaryKey({ columns: [t.contactId, t.tagId] })]);
export const insertTagSchema = createInsertSchema(tagsTable).omit({ id: true });
export type TagRow = typeof tagsTable.$inferSelect;
