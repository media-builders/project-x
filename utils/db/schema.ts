import { pgTable, text, timestamp , bigint, jsonb, uuid, integer} from 'drizzle-orm/pg-core';

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
    id: uuid("id").primaryKey(),
    user_id: uuid("user_id").notNull(),         
    fub_id: bigint("fub_id", { mode: "number" }),       
    first: text("first").notNull(),
    last: text("last").notNull(),
    email: text("email"),
    phone: text("phone"),
    stage: text("stage"),
    created_at: timestamp("created_at").defaultNow().notNull(),
    updated_at: timestamp("updated_at").defaultNow().notNull(),
});

export type InsertLead = typeof leadsTable.$inferInsert;
export type SelectLead = typeof leadsTable.$inferSelect;

export const userAgentsTable = pgTable("user_agents", {
    user_id: uuid("user_id").primaryKey(),
    agent_id: text("agent_id").notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
    twilio_number: text("twilio_number").unique(),
    agent_phone_number_id: text("agent_phone_number_id").unique(),
})

export type InsertUserAgent = typeof userAgentsTable.$inferInsert;
export type SelectUserAgent = typeof userAgentsTable.$inferSelect;

export const userTwilioSubaccountTable = pgTable("user_twilioSubAccounts", {
    user_id: uuid('user_id').primaryKey(),
    subaccount_sid: text('subaccount_sid').notNull(),
    subaccount_auth_token: text('subaccount_auth_token').notNull(),
    phone_number: text('phone_number').notNull(),
    created_at: timestamp("created_at").defaultNow().notNull(),
})

export type InsertUserSubaccount = typeof userTwilioSubaccountTable.$inferInsert;
export type SelectUserSubaccount = typeof userTwilioSubaccountTable.$inferSelect;


export const callLogsTable = pgTable("call_logs", {
  conversation_id: text("conversation_id").primaryKey(),                     
  user_id: uuid('user_id').notNull(),              
  agent_id: text('agent_id').notNull(),            
  status: text('status').notNull(),
  to_number: text('to_number'),
  from_number: text('from_number'),
  started_at: timestamp('started_at', { withTimezone: true }),
  ended_at: timestamp('ended_at', { withTimezone: true }),
  duration_sec: integer('duration_sec'),           
  cost_cents: integer('cost_cents'),               
  transcript: jsonb('transcript').$type<any>(),
  analysis: jsonb('analysis').$type<any>(),
  metadata: jsonb('metadata').$type<any>(),
  dynamic_variables: jsonb('dynamic_variables').$type<any>(),
  created_at: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export type InsertcallLogsTable = typeof callLogsTable.$inferInsert;
export type SelectcallLogsTable = typeof callLogsTable.$inferSelect;

export const callQueueTable = pgTable("call_queue", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull(), 
  lead_id: uuid("lead_id").notNull(),  
  position: integer("position").notNull(), // queue order
  status: text("status").notNull().default("pending"), // pending | in_progress | completed
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type InsertCallQueue = typeof callQueueTable.$inferInsert;
export type SelectCallQueue = typeof callQueueTable.$inferSelect;
