// app/api/outbound-calls/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { callLogsTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Helper: return the first non-nullish value
function first<T = any>(...vals: any[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

// Extract dynamic variables from many possible paths/casings
function extractDyn(evt: any) {
  const dyn =
    first(
      evt?.conversationInitiationClientData?.dynamicVariables,
      evt?.conversation_initiation_client_data?.dynamic_variables,
      evt?.data?.conversationInitiationClientData?.dynamicVariables,
      evt?.data?.conversation_initiation_client_data?.dynamic_variables,
      evt?.conversation?.client_data?.dynamic_variables,
      evt?.conversation?.client_data?.dynamicVariables,
      evt?.client_data?.dynamic_variables,
      evt?.metadata?.dynamic_variables
    ) || {};
  return dyn;
}

function extractELConversationId(evt: any, dyn: any) {
    const conv = first<any>(evt?.conversation, evt?.data?.conversation);
    const candidates = [
      conv?.id,
      evt?.data?.conversation?.id,
      evt?.conversation_id,
      evt?.data?.conversation_id,
      evt?.conversation?.conversation_id,
      dyn?.conversation_id, // if you ever pass it yourself (not typical)
    ].filter((v) => typeof v === "string") as string[];

    const found = candidates.find((c) => c.startsWith("conv_"));
    const source =
      (found === conv?.id && "conversation.id") ||
      (found === evt?.data?.conversation?.id && "data.conversation.id") ||
      (found === evt?.conversation_id && "conversation_id") ||
      (found === evt?.data?.conversation_id && "data.conversation_id") ||
      (found === evt?.conversation?.conversation_id && "conversation.conversation_id") ||
      (found === dyn?.conversation_id && "dyn.conversation_id") ||
      "not_found";

  return { id: found ?? null, source };
}

export async function POST(req: NextRequest) {
  try {
    const evt = await req.json();

    const type = first<string>(evt?.type, evt?.event_type, evt?.event) ?? "event";
    const conv = first<any>(evt?.conversation, evt?.data?.conversation, null);
    const agent = first<any>(evt?.agent, evt?.data?.agent, null);
    const dyn = extractDyn(evt);
    const { id: conversationId, source: convIdSource } = extractELConversationId(evt, dyn);

    //
    if (!conversationId) {
      console.warn("[Webhook] Missing ElevenLabs conversation id  — skipping insert.", {
        knownTopLevelKeys: Object.keys(evt || {}),
      });
      return NextResponse.json({ accepted: true }, { status: 202 });
    }
    
    let userId = first<string>(dyn.user_id, dyn.system_user_id);
    // Fallback: resolve user from DB by conversation_id when event lacks dynamic vars
    if (!userId && conversationId) {
      const existing = await db.query.callLogsTable.findFirst({
        where: eq(callLogsTable.conversation_id, conversationId),
      });
      if (existing?.user_id) {
        userId = existing.user_id as string;
      }
    }
    if (!userId) {
      console.warn("[Webhook] user_id unresolved — skipping insert", {
        conv: conversationId,
      });
      return NextResponse.json({ accepted: true }, { status: 202 });
    }

    const agentId = first<string>(
      dyn?.agent_id, 
      agent?.id, 
      evt?.data?.assigned_agent?.agent_id, 
      evt?.assigned_agent?.agent_id
    );

    const fromNumber = first<string>(
      dyn.from_number,
      evt?.twilio?.from,
      evt?.call?.from,
      conv?.from,
      evt?.from
    );

    const toNumber = first<string>(
      dyn.to_number,
      evt?.twilio?.to,
      evt?.call?.to,
      conv?.to,
      evt?.to
    );

    // Transcript / analysis if present
    const transcript = first<any>(evt?.transcript, evt?.data?.transcript) ?? null;
    const analysis = first<any>(evt?.analysis, evt?.data?.analysis) ?? null;

    // Timestamps
    const startedAt =
      (evt?.timestamps?.started_at && new Date(evt.timestamps.started_at)) ||
      (evt?.data?.timestamps?.started_at && new Date(evt.data.timestamps.started_at)) ||
      new Date();

    // Only update dynamic_variables on conflict if we have meaningful data (avoid clobbering lead_id)
    const dynHasLeadId = !!(dyn && typeof dyn === "object" && (dyn as any).lead_id);
    const dynForInsert = dyn ?? null;
    const dynForUpdate = dynHasLeadId ? dyn : undefined;

    await db
      .insert(callLogsTable)
      .values({
        conversation_id: conversationId, 
        user_id: userId,
        agent_id: agentId ?? "unknown",
        status: type,
        to_number: toNumber ?? null,
        from_number: fromNumber ?? null,
        started_at: startedAt,
        ended_at:
          (evt?.timestamps?.ended_at && new Date(evt.timestamps.ended_at)) ||
          (evt?.data?.timestamps?.ended_at && new Date(evt.data.timestamps.ended_at)) ||
          null,
        duration_sec: first<number>(evt?.metrics?.duration_sec, evt?.data?.metrics?.duration_sec) ?? null,
        cost_cents: first<number>(evt?.billing?.cost_cents, evt?.data?.billing?.cost_cents) ?? null,
        transcript,
        analysis,
        metadata: {
          elevenlabs_event: type,
          raw_event_type: evt?.type ?? null,
        },
        dynamic_variables: dynForInsert,
      })
      .onConflictDoUpdate({
        target: callLogsTable.conversation_id,
        set: {
          status: type,
          to_number: toNumber ?? null,
          from_number: fromNumber ?? null,
          ended_at:
            (evt?.timestamps?.ended_at && new Date(evt.timestamps.ended_at)) ||
            (evt?.data?.timestamps?.ended_at && new Date(evt.data.timestamps.ended_at)) ||
            undefined,
          duration_sec:
            first<number>(evt?.metrics?.duration_sec, evt?.data?.metrics?.duration_sec) ?? undefined,
          cost_cents:
            first<number>(evt?.billing?.cost_cents, evt?.data?.billing?.cost_cents) ?? undefined,
          transcript: transcript ?? undefined,
          analysis: analysis ?? undefined,
          metadata: {
            elevenlabs_event: type,
            raw_event_type: evt?.type ?? null,
          },
          dynamic_variables: dynForUpdate,
        },
      });

    // Determine terminal (call-ended) conditions robustly
    const lowerType = String(type || "").toLowerCase();
    const endedAtTs =
      (evt?.timestamps?.ended_at && new Date(evt.timestamps.ended_at)) ||
      (evt?.data?.timestamps?.ended_at && new Date(evt.data.timestamps.ended_at)) ||
      null;
    const isTerminalEvent =
      !!endedAtTs ||
      /(ended|completed|terminated|finished|hangup|call\.ended|call\.completed|conversation\.completed)/.test(lowerType) ||
      (!!evt?.billing || !!evt?.data?.billing || typeof evt?.analysis === "object" || typeof evt?.data?.analysis === "object");

    // Queueing feature removed: no progression logic on terminal events
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[Webhook] error", e);
    return NextResponse.json({ error: e?.message ?? "Webhook error" }, { status: 500 });
  }
}
