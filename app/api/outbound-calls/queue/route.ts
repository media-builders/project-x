import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/utils/db/db";
import { callQueueJobsTable } from "@/utils/db/schema";
import {
  assertEnv,
  fetchUserByEmailOrThrow,
  OutboundCallError,
  type LeadIn,
} from "@/lib/outboundCallService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL = assertEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SUPABASE_ANON = assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    const body = await req.json().catch(() => ({}));
    const leads: LeadIn[] = body?.leads || [];
    const schedule = body?.schedule ?? null;

    let scheduledStartAt: Date | null = null;
    if (schedule) {
      if (typeof schedule.startAt === "string") {
        const parsed = new Date(schedule.startAt);
        if (Number.isNaN(parsed.getTime())) {
          return NextResponse.json(
            { error: "Invalid schedule.startAt value. Provide ISO 8601 string." },
            { status: 400 }
          );
        }
        scheduledStartAt = parsed;
      } else {
        const startDate = typeof schedule.startDate === "string" ? schedule.startDate : null;
        const startTime = typeof schedule.startTime === "string" ? schedule.startTime : null;
        const tzOffset =
          typeof schedule.timezoneOffset === "string" && schedule.timezoneOffset.length > 0
            ? schedule.timezoneOffset
            : "Z";
        if (startDate) {
          const isoCandidate = `${startDate}T${startTime ?? "00:00"}${tzOffset}`;
          const parsed = new Date(isoCandidate);
          if (Number.isNaN(parsed.getTime())) {
            return NextResponse.json(
              {
                error:
                  "Invalid schedule startDate/startTime. Provide ISO date (YYYY-MM-DD) and time (HH:mm or HH:mm:ss) in UTC, or send schedule.startAt instead.",
              },
              { status: 400 }
            );
          }
          scheduledStartAt = parsed;
        }
      }
    }

    if (!leads.length) {
      return NextResponse.json({ error: "No leads provided." }, { status: 400 });
    }

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

    const dbUser = await fetchUserByEmailOrThrow(user.email);
    const userId = dbUser.id;

    const leadSnapshot = leads.map((lead) => ({
      id: lead.id ?? null,
      first: lead.first ?? null,
      last: lead.last ?? null,
      phone: lead.phone ?? null,
      email: lead.email ?? null,
    }));

    const inserted = await db
      .insert(callQueueJobsTable)
      .values({
        user_id: userId,
        status:
          scheduledStartAt && scheduledStartAt.getTime() > Date.now()
            ? "scheduled"
            : "pending",
        scheduled_start_at: scheduledStartAt,
        total_leads: leads.length,
        initiated: 0,
        completed: 0,
        failed: 0,
        current_index: null,
        current_conversation_id: null,
        current_lead: null,
        error: null,
        lead_snapshot: leadSnapshot,
        created_at: new Date(),
        updated_at: new Date(),
      })
      .returning({ id: callQueueJobsTable.id });

    const jobId = inserted[0]?.id;
    if (!jobId) {
      throw new Error("Failed to create call queue job.");
    }

    return NextResponse.json(
      {
        job_id: jobId,
        status:
          scheduledStartAt && scheduledStartAt.getTime() > Date.now()
            ? "scheduled"
            : "pending",
        total_leads: leads.length,
        scheduled_start_at: scheduledStartAt?.toISOString() ?? null,
      },
      { status: 202 }
    );
  } catch (err: any) {
    console.error("[CallQueue] Error:", err);
    if (err instanceof OutboundCallError) {
      return NextResponse.json(
        { error: err.message, details: err.details ?? null },
        { status: err.status }
      );
    }

    return NextResponse.json(
      { error: err?.message || "Failed to enqueue outbound call queue." },
      { status: 500 }
    );
  }
}

