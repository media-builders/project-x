// app/api/outbound-calls/queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { callQueueTable } from "@/utils/db/schema";
import { createServerClient } from "@supabase/ssr";
import { randomUUID } from "crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { leads } = body;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "No leads provided" }, { status: 400 });
    }

    // ✅ Supabase auth (keep consistent with outbound-calls route)
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () =>
            req.cookies.getAll().map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            })),
        },
      }
    );

    const { data: auth } = await supabase.auth.getUser();
    const userId = auth?.user?.id;
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // ✅ Insert queue records
    const queueRows = leads.map((lead: any, index: number) => ({
      id: randomUUID(),
      user_id: userId,
      lead_id: lead.id,
      position: index,
      status: index === 0 ? "in_progress" : "pending", // first starts immediately
    }));

    await db.insert(callQueueTable).values(queueRows);
    console.log(`[Queue] Inserted ${leads.length} leads into queue for user ${userId}`);

    // ✅ Prepare base URL (fix for undefined URL issue)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    // ✅ Initiate first call (same logic as manual single call)
    const firstLead = leads[0];
    console.log("[Queue] Initiating first queued call:", firstLead.phone);

    const res = await fetch(`${baseUrl}/api/outbound-calls`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leads: [firstLead],
        queueMode: true, // flag for webhook
      }),
    });

    console.log("[Queue] First call request sent, status:", res.status);

    // ✅ Handle potential call error
    if (!res.ok) {
      const errorText = await res.text().catch(() => "unknown error");
      console.error("[Queue] Failed to start first call:", errorText);
      return NextResponse.json(
        { error: "Failed to start first call" },
        { status: 500 }
      );
    }

    // ✅ Success
    console.log("[Queue] Queue successfully started with first call in progress.");
    return NextResponse.json({
      ok: true,
      message: `Queue started for ${leads.length} leads. The first call is now in progress.`,
    });
  } catch (err: any) {
    console.error("[Queue] Unexpected error:", err);
    return NextResponse.json(
      { error: err.message ?? "Queue initialization failed" },
      { status: 500 }
    );
  }
}
