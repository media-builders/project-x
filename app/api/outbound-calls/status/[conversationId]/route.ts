import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/utils/db/db";
import { callLogsTable, usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

const assertEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { conversationId: string } }
) {
  try {
    const conversationId = params.conversationId;
    if (!conversationId) {
      return NextResponse.json({ error: "conversationId is required" }, { status: 400 });
    }

    const SUPABASE_URL = assertEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SUPABASE_ANON = assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll: () =>
          req.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          })),
        setAll: () => {},
      },
    });

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json({ error: "User email missing" }, { status: 400 });
    }

    const dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email))
      .limit(1);

    if (!dbUser.length) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const userId = dbUser[0].id;

    const log = await db.query.callLogsTable.findFirst({
      where: eq(callLogsTable.conversation_id, conversationId),
    });

    if (!log || log.user_id !== userId) {
      return NextResponse.json({ status: null }, { status: 200 });
    }

    return NextResponse.json(
      {
        conversation_id: log.conversation_id,
        status: log.status,
        ended_at: log.ended_at,
        duration_sec: log.duration_sec,
        cost_cents: log.cost_cents,
        metadata: log.metadata,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[CallStatus] error", err);
    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch call status." },
      { status: 500 }
    );
  }
}
