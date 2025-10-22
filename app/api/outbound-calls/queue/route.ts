// app/api/outbound-calls/queue/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { callQueueTable, leadsTable } from "@/utils/db/schema";
import { eq, and, asc } from "drizzle-orm";
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

    const firstRowId = queueRows[0].id;
    const internalSecret = process.env.INTERNAL_QUEUE_SECRET || process.env.QUEUE_INTERNAL_SECRET || "";
    const res = await fetch(`${baseUrl}/api/outbound-calls`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(internalSecret ? { "x-internal-queue-secret": internalSecret } : {}),
      },
      // Detect auth redirects cleanly
      redirect: "manual",
      body: JSON.stringify({
        leads: [firstLead],
        userId,
        queueItemId: firstRowId,
        queueMode: true, // flag for webhook
      }),
    });

    console.log("[Queue] First call request sent, status:", res.status);

    // ✅ Handle potential call error
    const redirectedToLogin =
      (res.status >= 300 && res.status < 400 &&
        (res.headers.get("location") || "").includes("/login?redirectedFrom=%2Fapi%2Foutbound-calls")) ||
      (res.url && res.url.includes("/login?redirectedFrom=%2Fapi%2Foutbound-calls"));
    const isHtml = (res.headers.get("content-type") || "").includes("text/html");

    if (!res.ok || redirectedToLogin || isHtml) {
      const errorText = await res.text().catch(() => "unknown error");
      console.error("[Queue] Failed to start first call:", errorText);

      // Mark the first as completed to avoid a stuck queue
      await db
        .update(callQueueTable)
        .set({ status: "completed" })
        .where(eq(callQueueTable.id, firstRowId));

      // Find and start the next pending item, if any
      const next = await db.query.callQueueTable.findFirst({
        where: and(
          eq(callQueueTable.user_id, userId),
          eq(callQueueTable.status, "pending")
        ),
        orderBy: asc(callQueueTable.position),
      });

      if (next) {
        await db
          .update(callQueueTable)
          .set({ status: "in_progress" })
          .where(eq(callQueueTable.id, next.id));

        const nextLead = await db.query.leadsTable.findFirst({
          where: eq(leadsTable.id, next.lead_id),
        });

        if (nextLead) {
          console.log("[Queue] Retrying with next queued lead:", nextLead.phone);
          const retry = await fetch(`${baseUrl}/api/outbound-calls`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(internalSecret ? { "x-internal-queue-secret": internalSecret } : {}),
            },
            redirect: "manual",
            body: JSON.stringify({ leads: [nextLead], userId, queueItemId: next.id, queueMode: true }),
          });
          const retryRedirected =
            (retry.status >= 300 && retry.status < 400 &&
              (retry.headers.get("location") || "").includes("/login?redirectedFrom=%2Fapi%2Foutbound-calls")) ||
            (retry.url && retry.url.includes("/login?redirectedFrom=%2Fapi%2Foutbound-calls"));
          if (!retry.ok || retryRedirected) {
            console.warn("[Queue] Retry also failed or redirected to login");
          }
        } else {
          console.warn("[Queue] Next queued lead not found:", next.lead_id);
        }
      } else {
        console.warn("[Queue] No additional queued items to attempt for user", userId);
      }

      return NextResponse.json(
        { ok: false, error: "Failed to start first call; attempted next in queue." },
        { status: 502 }
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
