import { pgTable, text, timestamp , bigint, uuid} from 'drizzle-orm/pg-core';

export const usersTable = pgTable('users_table', {
    id: uuid('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    plan: text('plan').notNull(),
    stripe_id: text('stripe_id').notNull(),
    crm_api_key: text('crm_api_key'),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

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

export type InsertLead = typeof leadsTable.$inferInsert;
export type SelectLead = typeof leadsTable.$inferSelect;

export const userAgentsTable = pgTable("user_agents", {
    user_id: text("user_id").primaryKey(),
    agent_id: text("agent_id").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    twilio_number: text("twilio_number").unique(),
    agent_phone_number_id: text("agent_phone_number_id").unique(),
})

export type InsertUserAgent = typeof userAgentsTable.$inferInsert;
export type SelectUserAgent = typeof userAgentsTable.$inferSelect;

export const userTwilioSubaccountTable = pgTable("user_twilioSubAccounts", {
    user_id: text('user_id').primaryKey(),
    subaccount_sid: text('subaccount_sid').notNull().primaryKey(),
    subaccount_auth_token: text('subaccount_auth_token').notNull(),
    phone_number: text('phone_number'),
    created_at: timestamp("created_at").defaultNow().notNull(),
})

export type InsertUserSubaccount = typeof userTwilioSubaccountTable.$inferInsert;
export type SelectUserSubaccount = typeof userTwilioSubaccountTable.$inferSelect;


