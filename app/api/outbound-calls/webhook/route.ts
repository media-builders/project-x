// app/api/outbound-calls/webhook/route.ts

import { NextRequest, NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { callLogsTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type JsonRecord = Record<string, any>;

const first = <T = any>(...vals: any[]): T | undefined => {
  for (const v of vals) {
    if (v !== undefined && v !== null) return v as T;
  }
  return undefined;
};

const parseDate = (value: unknown): Date | null => {
  if (typeof value !== "string") return null;
  const ts = Date.parse(value);
  return Number.isFinite(ts) ? new Date(ts) : null;
};

const extractDyn = (evt: any): JsonRecord => {
  return (
    first<JsonRecord>(
      evt?.conversationInitiationClientData?.dynamicVariables,
      evt?.conversation_initiation_client_data?.dynamic_variables,
      evt?.data?.conversationInitiationClientData?.dynamicVariables,
      evt?.data?.conversation_initiation_client_data?.dynamic_variables,
      evt?.conversation?.client_data?.dynamic_variables,
      evt?.conversation?.client_data?.dynamicVariables,
      evt?.client_data?.dynamic_variables,
      evt?.metadata?.dynamic_variables
    ) || {}
  );
};

const extractConversationId = (evt: any, dyn: JsonRecord) => {
  const conv = first<any>(evt?.conversation, evt?.data?.conversation);
  const str = (value: unknown) => (typeof value === "string" ? value : null);

  const candidates = (
    [
      str(conv?.id),
      str(evt?.data?.conversation?.id),
      str(evt?.conversation_id),
      str(evt?.data?.conversation_id),
      str(evt?.conversation?.conversation_id),
      str(dyn?.conversation_id),
    ] as (string | null)[]
  ).filter(Boolean) as string[];

  const found = candidates.find((id) => id.startsWith("conv_")) ?? null;
  const source =
    (found === conv?.id && "conversation.id") ||
    (found === evt?.data?.conversation?.id && "data.conversation.id") ||
    (found === evt?.conversation_id && "conversation_id") ||
    (found === evt?.data?.conversation_id && "data.conversation_id") ||
    (found === evt?.conversation?.conversation_id && "conversation.conversation_id") ||
    (found === dyn?.conversation_id && "dyn.conversation_id") ||
    "not_found";

  return { id: found, source };
};

export async function POST(req: NextRequest) {
  try {
    const evt = await req.json();

    const type = first<string>(evt?.type, evt?.event_type, evt?.event) ?? "event";
    const conv = first<any>(evt?.conversation, evt?.data?.conversation, null);
    const agent = first<any>(evt?.agent, evt?.data?.agent, null);
    const dyn = extractDyn(evt);
    const { id: conversationId, source: convIdSource } = extractConversationId(evt, dyn);

    if (!conversationId) {
      console.warn("[Webhook] Missing conversation id. Skipping.", {
        knownKeys: Object.keys(evt || {}),
      });
      return NextResponse.json({ accepted: true }, { status: 202 });
    }

    let userId = first<string>(dyn.user_id, dyn.system_user_id);
    if (!userId) {
      const existing = await db.query.callLogsTable.findFirst({
        where: eq(callLogsTable.conversation_id, conversationId),
      });
      if (existing?.user_id) userId = String(existing.user_id);
    }
    if (!userId) {
      console.warn("[Webhook] Unable to resolve user_id; skipping insert.", {
        conversationId,
        convIdSource,
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

    const transcript = first<any>(evt?.transcript, evt?.data?.transcript) ?? null;
    const analysis = first<any>(evt?.analysis, evt?.data?.analysis) ?? null;

    const startedAt =
      parseDate(evt?.timestamps?.started_at) ??
      parseDate(evt?.data?.timestamps?.started_at) ??
      new Date();

    const endedAt =
      parseDate(evt?.timestamps?.ended_at) ??
      parseDate(evt?.data?.timestamps?.ended_at) ??
      null;

    const durationSec = first<number>(
      evt?.metrics?.duration_sec,
      evt?.data?.metrics?.duration_sec
    );
    const costCents = first<number>(
      evt?.billing?.cost_cents,
      evt?.data?.billing?.cost_cents
    );

    const dynHasLeadId = !!(dyn && typeof dyn === "object" && (dyn as any).lead_id);

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
        ended_at: endedAt,
        duration_sec: durationSec ?? null,
        cost_cents: costCents ?? null,
        transcript,
        analysis,
        metadata: {
          elevenlabs_event: type,
          raw_event_type: evt?.type ?? null,
        },
        dynamic_variables: dyn ?? null,
      })
      .onConflictDoUpdate({
        target: callLogsTable.conversation_id,
        set: {
          status: type,
          to_number: toNumber ?? null,
          from_number: fromNumber ?? null,
          ended_at: endedAt ?? undefined,
          duration_sec: durationSec ?? undefined,
          cost_cents: costCents ?? undefined,
          transcript: transcript ?? undefined,
          analysis: analysis ?? undefined,
          metadata: {
            elevenlabs_event: type,
            raw_event_type: evt?.type ?? null,
          },
          dynamic_variables: dynHasLeadId ? dyn : undefined,
        },
      });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error: any) {
    console.error("[Webhook] error", error);
    return NextResponse.json(
      { error: error?.message ?? "Webhook error" },
      { status: 500 }
    );
  }
}
