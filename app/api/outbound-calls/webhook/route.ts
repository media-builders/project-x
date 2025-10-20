// app/api/outbound-calls/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { callLogsTable } from "@/utils/db/schema";

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

  const matchedPath =
    (evt?.conversationInitiationClientData?.dynamicVariables && "conversationInitiationClientData.dynamicVariables") ||
    (evt?.conversation_initiation_client_data?.dynamic_variables && "conversation_initiation_client_data.dynamic_variables") ||
    (evt?.data?.conversationInitiationClientData?.dynamicVariables && "data.conversationInitiationClientData.dynamicVariables") ||
    (evt?.data?.conversation_initiation_client_data?.dynamic_variables && "data.conversation_initiation_client_data.dynamic_variables") ||
    (evt?.conversation?.client_data?.dynamic_variables && "conversation.client_data.dynamic_variables") ||
    (evt?.conversation?.client_data?.dynamicVariables && "conversation.client_data.dynamicVariables") ||
    (evt?.client_data?.dynamic_variables && "client_data.dynamic_variables") ||
    (evt?.metadata?.dynamic_variables && "metadata.dynamic_variables") ||
    "not_found";

  return { dyn, matchedPath };
}

export async function POST(req: NextRequest) {
  try {
    const evt = await req.json();

    // Normalize common top-level shapes
    const type = first<string>(evt?.type, evt?.event_type, evt?.event) ?? "event";
    const conv = first<any>(evt?.conversation, evt?.data?.conversation, null);
    const agent = first<any>(evt?.agent, evt?.data?.agent, null);

    // Extract dynamic variables
    const { dyn, matchedPath } = extractDyn(evt);

    // IDs / Numbers
    const userId = first<string>(dyn.user_id, dyn.system_user_id);
    const leadId = first<string>(dyn.lead_id);

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

    const agentId = first<string>(
      dyn.agent_id,
      agent?.id,
      evt?.data?.assigned_agent?.agent_id,
      evt?.assigned_agent?.agent_id
    );

    // Transcript / analysis if present
    const transcript = first<any>(evt?.transcript, evt?.data?.transcript) ?? null;
    const analysis = first<any>(evt?.analysis, evt?.data?.analysis) ?? null;

    // Timestamps
    const startedAt =
      (evt?.timestamps?.started_at && new Date(evt.timestamps.started_at)) ||
      (evt?.data?.timestamps?.started_at && new Date(evt.data.timestamps.started_at)) ||
      new Date();

    // Debug once (remove later if noisy)
    console.log("[Webhook] dyn matched at:", matchedPath, " keys:", Object.keys(dyn || {}));

    if (!userId) {
      console.warn("[Webhook] user_id unresolved — skipping insert", {
        conv: conv?.id ?? evt?.data?.conversation?.id,
        agent: agentId,
        from: fromNumber,
      });
      return NextResponse.json({ accepted: true }, { status: 202 });
    }

    // Build the insert to match YOUR schema exactly
    await db.insert(callLogsTable).values({
      id: (conv?.id as string) ?? (globalThis.crypto?.randomUUID?.() ?? `call_${Date.now()}`),
      user_id: userId,
      agent_id: agentId ?? "unknown",
      status: type,
      to_number: toNumber ?? null,
      from_number: fromNumber ?? null,
      started_at: startedAt,
      ended_at: null,
      duration_sec: null,     // integer | null
      cost_cents: null,       // integer | null — use cents, not cost_usd
      transcript,             // jsonb | null
      analysis,               // jsonb | null
      metadata: {
        elevenlabs_event: type,
        conversation_id: conv?.id ?? null,
        lead_id: leadId ?? null,
        dynamic_variables_path: matchedPath,
        raw_event_type: evt?.type ?? null,
      },
      dynamic_variables: dyn ?? null, // dedicated jsonb column in your schema
      // created_at is defaulted by DB
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (e: any) {
    console.error("[Webhook] error", e);
    return NextResponse.json({ error: e?.message ?? "Webhook error" }, { status: 500 });
  }
}
