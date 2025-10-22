import { db } from "@/utils/db/db";
import { callLogsTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

export async function getUserUsedMinutes(userId: string) {
  const rows = await db
    .select({ duration_sec: callLogsTable.duration_sec })
    .from(callLogsTable)
    .where(eq(callLogsTable.user_id, userId));

  const totalSec = rows.reduce(
    (sum, row) => sum + (Number(row.duration_sec) || 0),
    0
  );
  return Math.floor(totalSec / 60); // convert to minutes
}
