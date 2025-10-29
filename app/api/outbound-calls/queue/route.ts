import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/utils/db/db";
import { callQueueJobsTable, usersTable } from "@/utils/db/schema";
import {
  assertEnv,
  fetchUserByEmailOrThrow,
  OutboundCallError,
  type LeadIn,
} from "@/lib/outboundCallService";
import { and, asc, eq, inArray } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const WORKER_HEADER = "x-queue-key";

type QueueJob = {
  id: string;
  status: string;
  scheduled_start_at: Date | null;
  total_leads: number;
  initiated: number;
  completed: number;
  failed: number;
  lead_snapshot: unknown;
  created_at: Date | null;
  updated_at: Date | null;
};

const serializeJob = (job: QueueJob) => ({
  id: job.id,
  status: job.status,
  scheduled_start_at: job.scheduled_start_at
    ? job.scheduled_start_at.toISOString()
    : null,
  total_leads: job.total_leads ?? 0,
  initiated: job.initiated ?? 0,
  completed: job.completed ?? 0,
  failed: job.failed ?? 0,
  lead_snapshot: job.lead_snapshot ?? [],
  created_at: job.created_at ? job.created_at.toISOString() : null,
  updated_at: job.updated_at ? job.updated_at.toISOString() : null,
});

const resolveQueueStatus = (scheduledStartAt: Date | null) =>
  scheduledStartAt && scheduledStartAt.getTime() > Date.now()
    ? "scheduled"
    : "pending";

async function resolveUser(
  req: NextRequest,
  opts: { bodyUserId?: string | null } = {}
) {
  const SUPABASE_URL = assertEnv("NEXT_PUBLIC_SUPABASE_URL");
  const SUPABASE_ANON = assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  const queueKey = process.env.QUEUE_API_KEY ?? null;
  const providedKey = req.headers.get(WORKER_HEADER);
  const isWorker = Boolean(queueKey && providedKey && providedKey === queueKey);

  if (isWorker) {
    const userId = opts.bodyUserId ?? req.nextUrl.searchParams.get("user_id");
    if (!userId) {
      throw NextResponse.json(
        { error: "Missing user_id for worker request." },
        { status: 400 }
      );
    }
    const user = await db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    });
    if (!user) {
      throw NextResponse.json({ error: "User not found." }, { status: 404 });
    }
    return { userId: user.id, isWorker: true };
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
    throw NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!user.email) {
    throw NextResponse.json({ error: "User email missing" }, { status: 400 });
  }

  const dbUser = await fetchUserByEmailOrThrow(user.email);
  return { userId: dbUser.id, isWorker: false };
}

export async function GET(req: NextRequest) {
  try {
    const { userId } = await resolveUser(req);

    const scope = req.nextUrl.searchParams.get("scope") ?? "all";
    const statuses =
      scope === "upcoming"
        ? ["pending", "scheduled"]
        : ["pending", "scheduled", "running"];

    const rows = await db
      .select({
        id: callQueueJobsTable.id,
        status: callQueueJobsTable.status,
        scheduled_start_at: callQueueJobsTable.scheduled_start_at,
        total_leads: callQueueJobsTable.total_leads,
        initiated: callQueueJobsTable.initiated,
        completed: callQueueJobsTable.completed,
        failed: callQueueJobsTable.failed,
        lead_snapshot: callQueueJobsTable.lead_snapshot,
        created_at: callQueueJobsTable.created_at,
        updated_at: callQueueJobsTable.updated_at,
      })
      .from(callQueueJobsTable)
      .where(
        and(
          eq(callQueueJobsTable.user_id, userId),
          inArray(callQueueJobsTable.status, statuses)
        )
      )
      .orderBy(
        asc(callQueueJobsTable.scheduled_start_at),
        asc(callQueueJobsTable.created_at)
      );

    const now = Date.now();
    const jobs =
      scope === "upcoming"
        ? rows.filter((job) => {
            const scheduledAt = job.scheduled_start_at
              ? job.scheduled_start_at.getTime()
              : null;
            if (scheduledAt === null) return false;
            return scheduledAt >= now - 60_000;
          })
        : rows;

    return NextResponse.json(
      {
        jobs: jobs.map(serializeJob),
      },
      { status: 200 }
    );
  } catch (res: any) {
    if (res instanceof NextResponse) {
      return res;
    }
    const err = res as Error;
    console.error("[CallQueue] GET error:", err);
    if (err instanceof OutboundCallError) {
      return NextResponse.json(
        { error: err.message, details: err.details ?? null },
        { status: err.status }
      );
    }
    return NextResponse.json(
      { error: err?.message || "Failed to fetch call queue jobs." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const leads: LeadIn[] = body?.leads || [];
    if (!leads.length) {
      return NextResponse.json({ error: "No leads provided." }, { status: 400 });
    }

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
                  "Invalid schedule startDate/startTime. Provide ISO date (YYYY-MM-DD) and time (HH:mm or HH:mm:ss), or send schedule.startAt instead.",
              },
              { status: 400 }
            );
          }
          scheduledStartAt = parsed;
        }
      }
    }

    const { userId, isWorker } = await resolveUser(req, {
      bodyUserId: typeof body?.user_id === "string" ? body.user_id : null,
    });

    const leadSnapshot = leads.map((lead) => ({
      id: lead.id ?? null,
      first: lead.first ?? null,
      last: lead.last ?? null,
      phone: lead.phone ?? null,
      email: lead.email ?? null,
    }));

    const status = resolveQueueStatus(scheduledStartAt);

    const inserted = await db
      .insert(callQueueJobsTable)
      .values({
        user_id: userId,
        status,
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
        status,
        total_leads: leads.length,
        scheduled_start_at: scheduledStartAt?.toISOString() ?? null,
        user_id: isWorker ? userId : undefined,
      },
      { status: 202 }
    );
  } catch (res: any) {
    if (res instanceof NextResponse) return res;
    const err = res as Error;
    console.error("[CallQueue] POST error:", err);
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
