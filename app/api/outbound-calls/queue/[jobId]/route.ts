import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/utils/db/db";
import { callQueueJobsTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { assertEnv, fetchUserByEmailOrThrow, OutboundCallError } from "@/lib/outboundCallService";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: { jobId: string } }
) {
  try {
    const jobId = params.jobId;
    if (!jobId) {
      return NextResponse.json({ error: "jobId is required" }, { status: 400 });
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

    const dbUser = await fetchUserByEmailOrThrow(user.email);

    const job = await db.query.callQueueJobsTable.findFirst({
      where: eq(callQueueJobsTable.id, jobId),
    });

    if (!job || job.user_id !== dbUser.id) {
      return NextResponse.json({ error: "Job not found" }, { status: 404 });
    }

    return NextResponse.json(
      {
        job_id: job.id,
        status: job.status,
        scheduled_start_at: job.scheduled_start_at,
        total_leads: job.total_leads,
        initiated: job.initiated,
        completed: job.completed,
        failed: job.failed,
        current_index: job.current_index,
        current_conversation_id: job.current_conversation_id,
        current_lead: job.current_lead,
        error: job.error,
        lead_snapshot: job.lead_snapshot,
        created_at: job.created_at,
        updated_at: job.updated_at,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[CallQueueStatus] error", err);
    if (err instanceof OutboundCallError) {
      return NextResponse.json(
        { error: err.message, details: err.details ?? null },
        { status: err.status }
      );
    }

    return NextResponse.json(
      { error: err?.message ?? "Failed to fetch queue job status." },
      { status: 500 }
    );
  }
}
