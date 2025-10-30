import { pgTable, text, timestamp, bigint, jsonb, uuid, integer,uniqueIndex } from "drizzle-orm/pg-core";
import { relations, sql } from "drizzle-orm";

// ==========================
// USERS TABLE
// ==========================
export const usersTable = pgTable("users_table", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  plan: text("plan").notNull(),
  stripe_id: text("stripe_id").notNull(),
  crm_api_key: text("crm_api_key"),
  google_refresh_token: text("google_refresh_token"),
});

export type InsertUser = typeof usersTable.$inferInsert;
export type SelectUser = typeof usersTable.$inferSelect;

// ==========================
// LEADS TABLE
// ==========================
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

// ==========================
// USER AGENTS TABLE
// ==========================
export const userAgentsTable = pgTable("user_agents", {
  user_id: uuid("user_id").primaryKey(),
  agent_id: text("agent_id").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
  twilio_number: text("twilio_number").unique(),
  agent_phone_number_id: text("agent_phone_number_id").unique(),
});

export type InsertUserAgent = typeof userAgentsTable.$inferInsert;
export type SelectUserAgent = typeof userAgentsTable.$inferSelect;

// ==========================
// TWILIO SUBACCOUNTS TABLE
// ==========================
export const userTwilioSubaccountTable = pgTable("user_twilioSubAccounts", {
  user_id: uuid("user_id").primaryKey(),
  subaccount_sid: text("subaccount_sid").notNull(),
  subaccount_auth_token: text("subaccount_auth_token").notNull(),
  phone_number: text("phone_number").notNull(),
  created_at: timestamp("created_at").defaultNow().notNull(),
});

export type InsertUserSubaccount = typeof userTwilioSubaccountTable.$inferInsert;
export type SelectUserSubaccount = typeof userTwilioSubaccountTable.$inferSelect;

// ==========================
// CALL LOGS TABLE
// ==========================
export const callLogsTable = pgTable("call_logs", {
  conversation_id: text("conversation_id").primaryKey(),
  user_id: uuid("user_id").notNull(),
  agent_id: text("agent_id").notNull(),
  status: text("status").notNull(),
  to_number: text("to_number"),
  from_number: text("from_number"),
  started_at: timestamp("started_at", { withTimezone: true }),
  ended_at: timestamp("ended_at", { withTimezone: true }),
  duration_sec: integer("duration_sec"),
  cost_cents: integer("cost_cents"),
  transcript: jsonb("transcript").$type<any>(),
  analysis: jsonb("analysis").$type<any>(),
  metadata: jsonb("metadata").$type<any>(),
  dynamic_variables: jsonb("dynamic_variables").$type<any>(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type InsertCallLogsTable = typeof callLogsTable.$inferInsert;
export type SelectCallLogsTable = typeof callLogsTable.$inferSelect;

// ==========================
// CALL QUEUE JOBS TABLE
// ==========================
export const callQueueJobsTable = pgTable("call_queue_jobs", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  status: text("status").notNull().default("pending"),
  scheduled_start_at: timestamp("scheduled_start_at", {
    withTimezone: true,
  }),
  total_leads: integer("total_leads").notNull(),
  initiated: integer("initiated").notNull().default(0),
  completed: integer("completed").notNull().default(0),
  failed: integer("failed").notNull().default(0),
  current_index: integer("current_index"),
  current_conversation_id: text("current_conversation_id"),
  current_lead: jsonb("current_lead").$type<any>(),
  error: text("error"),
  lead_snapshot: jsonb("lead_snapshot").$type<any>(),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type InsertCallQueueJob = typeof callQueueJobsTable.$inferInsert;
export type SelectCallQueueJob = typeof callQueueJobsTable.$inferSelect;

// ==========================
// AGENT SETTINGS TABLE
// ==========================

export const agentSettingsTable = pgTable("agent_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  user_id: uuid("user_id").notNull(),
  agent_id: text("agent_id").notNull(),
  twilio_number: text("twilio_number"),
  preferences: jsonb("preferences").$type<Record<string, any>>().default({}),
  created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updated_at: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export type InsertAgentSettings = typeof agentSettingsTable.$inferInsert;
export type SelectAgentSettings = typeof agentSettingsTable.$inferSelect;

// ==========================
// NOTIFICATIONS TABLE
// ==========================
export const notificationsTable = pgTable("notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  user_id: uuid("user_id").notNull().default(sql`auth.uid()`),
  title: text("title"),
  message: text("message").notNull(),
  variant: text("variant").notNull().default("default"),
  metadata: jsonb("metadata"),
  read_at: timestamp("read_at", { withTimezone: true }),
  created_at: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type InsertNotification = typeof notificationsTable.$inferInsert;
export type SelectNotification = typeof notificationsTable.$inferSelect;

// ==========================
// RELATIONS (OPTIONAL)
// ==========================
export const agentSettingsRelations = relations(agentSettingsTable, ({ one }) => ({
  user: one(usersTable, {
    fields: [agentSettingsTable.user_id],
    references: [usersTable.id],
  }),
  agent: one(userAgentsTable, {
    fields: [agentSettingsTable.agent_id],
    references: [userAgentsTable.agent_id],
  }),
}));

// USER RELATIONS

export const userRelationshipInvites = pgTable(
  "user_relationship_invites",
  {
    id: uuid("id").defaultRandom().primaryKey(),

    // The sender’s user ID
    masterUserId: uuid("master_user_id").notNull(),

    // The sender’s email address
    inviteeEmail: text("invitee_email").notNull(),

    // The invited user’s email address
    invitedEmail: text("invited_email").notNull(),

    // Invite metadata
    inviteToken: text("invite_token").notNull().unique(),
    permissions: jsonb("permissions")
      .$type<Record<string, any>>()
      .notNull()
      .default({}),
    status: text("status").notNull().default("pending"),

    // Timestamps
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    acceptedAt: timestamp("accepted_at", { withTimezone: true }),

    // The invited user’s ID (set when known)
    invitedUserId: uuid("invited_user_id"),

    // Optional expiration
    expiresAt: timestamp("expires_at", { withTimezone: true }),
  },
  (table) => ({
    // ✅ Each sender can only invite a specific email once
    uniqueInvitePerPair: uniqueIndex("user_relationship_invites_master_invited_idx").on(
      table.masterUserId,
      table.invitedEmail
    ),

    // ✅ Unique invite token constraint
    tokenUnique: uniqueIndex("user_relationship_invites_token_idx").on(table.inviteToken),
  })
);

export const userRelationshipInvitesRelations = relations(
  userRelationshipInvites,
  ({ one }) => ({
    // sender
    masterUser: one(usersTable, {
      fields: [userRelationshipInvites.masterUserId],
      references: [usersTable.id],
    }),

    // recipient (once accepted or if they exist)
    invitedUser: one(usersTable, {
      fields: [userRelationshipInvites.invitedUserId],
      references: [usersTable.id],
    }),
  })
);