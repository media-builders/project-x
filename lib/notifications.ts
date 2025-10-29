"use server";

import { db } from "@/utils/db/db";
import {
  InsertNotification,
  SelectNotification,
  notificationsTable,
} from "@/utils/db/schema";
import { and, desc, eq, inArray, isNull, gte } from "drizzle-orm";

export type NotificationVariant = "default" | "success" | "error" | "warning";

export type NotificationRecord = {
  id: string;
  userId: string;
  title: string | null;
  message: string;
  variant: NotificationVariant;
  metadata: Record<string, unknown> | null;
  readAt: Date | null;
  createdAt: Date;
};

const mapRow = (row: SelectNotification): NotificationRecord => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  message: row.message,
  variant: (row.variant as NotificationVariant) ?? "default",
  metadata: (row.metadata as Record<string, unknown> | null) ?? null,
  readAt: row.read_at,
  createdAt: row.created_at,
});

type CreateNotificationInput = Pick<
  InsertNotification,
  "user_id" | "title" | "message" | "variant" | "metadata"
>;

const combineConditions = (conditions: any[]) =>
  conditions.slice(1).reduce((acc, condition) => and(acc, condition), conditions[0]);

export async function createNotification(
  input: CreateNotificationInput,
): Promise<NotificationRecord> {
  const [row] = await db
    .insert(notificationsTable)
    .values(input)
    .returning();
  return mapRow(row);
}

export async function listNotificationsForUser(
  userId: string,
  options: {
    limit?: number;
    includeRead?: boolean;
    since?: Date;
  } = {},
): Promise<NotificationRecord[]> {
  const { limit = 50, includeRead = true, since } = options;

  const conditions = [eq(notificationsTable.user_id, userId)];
  if (!includeRead) {
    conditions.push(isNull(notificationsTable.read_at));
  }
  if (since) {
    conditions.push(gte(notificationsTable.created_at, since));
  }

  const where = combineConditions(conditions);

  const rows = await db
    .select()
    .from(notificationsTable)
    .where(where)
    .orderBy(desc(notificationsTable.created_at))
    .limit(limit);

  return rows.map(mapRow);
}

export async function markNotificationsRead(
  userId: string,
  notificationIds?: string[],
): Promise<number> {
  const conditions = [eq(notificationsTable.user_id, userId)];
  if (notificationIds?.length) {
    conditions.push(inArray(notificationsTable.id, notificationIds));
  }

  const result = await db
    .update(notificationsTable)
    .set({ read_at: new Date() })
    .where(combineConditions(conditions))
    .returning({ id: notificationsTable.id });

  return result.length;
}

export async function clearNotifications(
  userId: string,
  notificationIds?: string[],
): Promise<number> {
  const conditions = [eq(notificationsTable.user_id, userId)];
  if (notificationIds?.length) {
    conditions.push(inArray(notificationsTable.id, notificationIds));
  }

  const result = await db
    .delete(notificationsTable)
    .where(combineConditions(conditions))
    .returning({ id: notificationsTable.id });

  return result.length;
}
