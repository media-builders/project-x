// app/api/agent-settings/route.ts
import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/utils/db/db";
import { agentSettingsTable, userAgentsTable } from "@/utils/db/schema";

export const dynamic = "force-dynamic";

/**
 * GET /api/agent-settings?user_id=<uuid>
 * Returns all agent settings for a given user.
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("user_id");

    if (!userId) {
      return NextResponse.json({ error: "Missing user_id" }, { status: 400 });
    }

    console.log("[GET] Fetching agent settings for:", userId);

    const results = await db
      .select({
        agent_id: agentSettingsTable.agent_id,
        user_id: agentSettingsTable.user_id,
        preferences: agentSettingsTable.preferences,
        created_at: agentSettingsTable.created_at,
        twilio_number: userAgentsTable.twilio_number, // ✅ join Twilio number
      })
      .from(agentSettingsTable)
      .leftJoin(
        userAgentsTable,
        eq(agentSettingsTable.agent_id, userAgentsTable.agent_id)
      )
      .where(eq(agentSettingsTable.user_id, userId));

    console.log("[GET] Found results:", results.length);
    return NextResponse.json(results);
  } catch (err: any) {
    console.error("[GET /agent-settings] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

/**
 * POST /api/agent-settings
 * Updates (or inserts) preferences for an agent.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, agentId, preferences } = body;

    if (!userId || !agentId) {
      return NextResponse.json(
        { error: "Missing userId or agentId" },
        { status: 400 }
      );
    }

    console.log("[POST] Saving preferences for agent:", agentId);

    const updated = await db
      .insert(agentSettingsTable)
      .values({
        user_id: userId,
        agent_id: agentId,
        preferences: preferences ?? {},
      })
      .onConflictDoUpdate({
        target: [agentSettingsTable.user_id, agentSettingsTable.agent_id],
        set: { preferences },
      })
      .returning();

    // ✅ Return full agent info including Twilio number
    const fullData = await db
      .select({
        agent_id: agentSettingsTable.agent_id,
        user_id: agentSettingsTable.user_id,
        preferences: agentSettingsTable.preferences,
        created_at: agentSettingsTable.created_at,
        twilio_number: userAgentsTable.twilio_number,
      })
      .from(agentSettingsTable)
      .leftJoin(
        userAgentsTable,
        eq(agentSettingsTable.agent_id, userAgentsTable.agent_id)
      )
      .where(eq(agentSettingsTable.agent_id, agentId))
      .limit(1);

    return NextResponse.json(fullData[0]);
  } catch (err: any) {
    console.error("[POST /agent-settings] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
