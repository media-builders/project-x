import { pgTable, text, timestamp , bigint} from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users_table', {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    plan: text('plan').notNull(),
    stripe_id: text('stripe_id').notNull(),
    crm_api_key: text('crm_api_key'),
    twilio_number: text('twilio_number')
});

export const leadsTable = pgTable("leads", {
  id: text("id").primaryKey(),
  user_id: text("user_id").notNull(),         
  fub_id: bigint("fub_id", { mode: "number" }),       
  first: text("first").notNull(),
  last: text("last").notNull(),
  email: text("email"),
  phone: text("phone"),
  created_at: timestamp("created_at").defaultNow().notNull(),
  updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

export type InsertLead = typeof leadsTable.$inferInsert;
export type SelectLead = typeof leadsTable.$inferSelect;