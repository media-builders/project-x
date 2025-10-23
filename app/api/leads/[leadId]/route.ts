// app/api/leads/[leadId]/calls/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type Row = {
  conversation_id: string;
  user_id: string | null;
  started_at: string | null;
  ended_at: string | null;
  duration_sec: number | null;
  transcript: unknown | null;
  analysis: Record<string, unknown> | null;
  dynamic_variables: Record<string, any> | null;
};

const toInt = (x: unknown): number | null => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.floor(n) : null;
};

// Minimal E.164 helper (NANP default +1)
const toE164 = (raw?: string | null, defaultCountry = "+1") => {
  const s = (raw || "").trim();
  if (!s) return "";
  const digits = s.replace(/\D/g, "");
  if (digits.length === 10) return `${defaultCountry}${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return s.startsWith("+") ? s : digits ? `+${digits}` : "";
};

export async function GET(
  req: NextRequest,
  { params }: { params: { leadId: string } }
) {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (toSet) => {
          toSet.forEach(({ name, value, options }) =>
            req.cookies.set({ name, value, ...options })
          );
        },
      },
    }
  );

  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const uid = auth.user.id;
  const leadId = params.leadId;

  // Step 1: find conversation_ids known for this lead (using dynamic_variables.lead_id)
  const { data: convRows, error: convErr } = await supabase
    .from("call_logs")
    .select("conversation_id")
    .eq("user_id", uid)
    .filter("dynamic_variables->>lead_id", "eq", leadId);

  if (convErr) {
    return NextResponse.json(
      {
        error: convErr.message,
        code: (convErr as any).code,
        details: (convErr as any).details,
        hint: (convErr as any).hint,
      },
      { status: 500 }
    );
  }

  let convIds = Array.from(new Set((convRows || []).map((r: any) => r.conversation_id).filter(Boolean)));

  // Fallback: if some events wiped dynamic_variables, include convs for this lead's phone number
  try {
    const { data: leadRow } = await supabase
      .from("leads")
      .select("phone")
      .eq("id", leadId)
      .single();
    const e164 = toE164(leadRow?.phone || "");
    if (e164) {
      const { data: byPhone } = await supabase
        .from("call_logs")
        .select("conversation_id")
        .eq("user_id", uid)
        .eq("to_number", e164);
      const phoneConvIds = (byPhone || []).map((r: any) => r.conversation_id).filter(Boolean);
      convIds = Array.from(new Set([...convIds, ...phoneConvIds]));
    }
  } catch {}

  if (convIds.length === 0) {
    return NextResponse.json({ calls: [] });
  }

  // Step 2: load all rows for those conversations and collapse to one entry per conversation
  const { data, error } = await supabase
    .from("call_logs")
    .select("*")
    .eq("user_id", uid)
    .in("conversation_id", convIds)
    .order("started_at", { ascending: false });



  if (error) {
    return NextResponse.json(
      {
        error: error.message,
        code: (error as any).code,
        details: (error as any).details,
        hint: (error as any).hint,
      },
      { status: 500 }
    );
  }

  const rows = (data as Row[]) ?? [];

  // Collapse by conversation_id, prefer a row with transcript, then with ended_at, else latest
  const byConv = new Map<string, Row>();
  for (const r of rows) {
    const key = (r as any).conversation_id as string;
    const prev = byConv.get(key);
    if (!prev) {
      byConv.set(key, r);
      continue;
    }
    const prevHasTranscript = Array.isArray(prev.transcript) || typeof prev.transcript === "string";
    const curHasTranscript = Array.isArray(r.transcript) || typeof r.transcript === "string";
    if (!prevHasTranscript && curHasTranscript) {
      byConv.set(key, r);
      continue;
    }
    const prevEnded = !!prev.ended_at;
    const curEnded = !!r.ended_at;
    if (!prevEnded && curEnded) {
      byConv.set(key, r);
      continue;
    }
    // Otherwise keep the earlier selected row
  }

  const calls = Array.from(byConv.values()).map((r) => {
    const dv = (r as any).dynamic_variables || {};
    const analysis = (r as any).analysis || null;
    const utcISO: string | null =
      (typeof (dv as any).system__time_utc === "string" && (dv as any).system__time_utc) ||
      r.started_at ||
      null;

    const dur =
      toInt((dv as any).system__call_duration_secs) ??
      toInt(r.duration_sec) ??
      (r.started_at && r.ended_at
        ? Math.floor((Date.parse(r.ended_at) - Date.parse(r.started_at)) / 1000)
        : null);

    return {
      id: (r as any).conversation_id,
      date_time_utc: utcISO,
      duration_seconds: dur,
      transcript: r.transcript ?? null,
      analysis: analysis,
    };
  });

  console.log("[calls]", {
    leadId,
    count: calls.length,
    first: calls[0],
  });

  return NextResponse.json({ calls });
}
