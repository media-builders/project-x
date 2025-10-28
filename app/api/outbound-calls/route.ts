// app/api/outbound-calls/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/utils/db/db";
import { callLogsTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import {
  assertEnv,
  initiateOutboundCall,
  fetchUserByEmailOrThrow,
  fetchOutboundContextOrThrow,
  OutboundCallError,
  type LeadIn,
} from "@/lib/outboundCallService";
//import { PLAN_QUOTAS } from "@/utils/planQuota";
//import { getUserUsedMinutes } from "@/utils/getUserUsage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const SUPABASE_URL = assertEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SUPABASE_ANON = assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    const queueSecret = process.env.QUEUE_API_KEY ?? "";
    const providedQueueKey = req.headers.get("x-queue-key");
    if (providedQueueKey && (!queueSecret || providedQueueKey !== queueSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const leads: LeadIn[] = body?.leads || [];
    if (!leads.length) {
      return NextResponse.json({ error: "No leads provided." }, { status: 400 });
    }

    const isQueueRequest = !!queueSecret && providedQueueKey === queueSecret;
    let userId: string;

    if (isQueueRequest) {
      const overrideUserId =
        (body?.user_id as string | undefined) ??
        (body?.userId as string | undefined) ??
        (body?.userID as string | undefined);

      if (!overrideUserId) {
        return NextResponse.json(
          { error: "Missing user_id for queue invocation." },
          { status: 400 }
        );
      }
      userId = overrideUserId;
    } else {
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
      userId = dbUser.id;
    }

    /**Checking Plan Quota
    const plan = dbUser.plan || "Basic";
    const quota = PLAN_QUOTAS[plan] ?? 500;

    const used = await db
      .select({ duration_sec: callLogsTable.duration_sec })
      .from(callLogsTable)
      .where(eq(callLogsTable.user_id, userId));

    const totalMinutes = Math.floor(
      used.reduce((sum, row) => sum + (Number(row.duration_sec) || 0), 0) / 60
    );

    if (totalMinutes >= quota) {
      return NextResponse.json(
        {
          error: `Quota exceeded: ${totalMinutes}/${quota} minutes used. Please upgrade your plan.`,
        },
        { status: 403 }
      );
    }**/

    const context = await fetchOutboundContextOrThrow(userId);

    const lead: LeadIn = leads?.[0] ?? {};

    const result = await initiateOutboundCall(context, lead);

    return NextResponse.json(
      {
        status: result.status,
        called_number: result.calledNumber,
        from_number: result.fromNumber,
        lead_name: result.leadName,
        agent_id: context.agent.agent_id,
        agent_phone_number_id: context.agent.agent_phone_number_id,
        elevenlabs_response: result.elevenlabsResponse,
        conversation_id: result.conversationId,
        twilio_call_sid: result.twilioCallSid,
        echo_dynamic_vars: result.dynamicVariables,
        status_token: result.statusToken,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Outbound Call] Error:", err);
    if (err instanceof OutboundCallError) {
      return NextResponse.json(
        { error: err.message, details: err.details ?? null },
        { status: err.status }
      );
    }

    return NextResponse.json(
      { error: err?.message || "Unexpected error while initiating call." },
      { status: 500 }
    );
  }
}
