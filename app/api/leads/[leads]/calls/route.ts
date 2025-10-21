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
  dynamic_variables: Record<string, any> | null; // jsonb
};

const toInt = (x: unknown): number | null => {
  const n = Number(x);
  return Number.isFinite(n) ? Math.floor(n) : null;
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

  const { data, error } = await supabase
    .from("call_logs")
    .select(
      "conversation_id, user_id, started_at, ended_at, duration_sec, transcript, dynamic_variables"
    )
    .eq("user_id", uid)
    .contains("dynamic_variables", { lead_id: leadId })
    .order("started_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: error.message, code: (error as any).code, details: (error as any).details, hint: (error as any).hint },
      { status: 500 }
    );
  }

  const rows = (data as Row[]) ?? [];

  const calls = rows.map((r) => {
    const dv = r.dynamic_variables || {};

    // Prefer dynamic vars:
    const utcISO: string | null =
      (typeof dv.system__time_utc === "string" && dv.system__time_utc) ||
      r.started_at ||
      null;

    let dur =
      toInt(dv.system__call_duration_secs) ??               // 1) dynamic var
      toInt(r.duration_sec);                                 // 2) column
    if (dur == null && r.started_at && r.ended_at) {         // 3) compute
      const s = Date.parse(r.started_at);
      const e = Date.parse(r.ended_at);
      if (Number.isFinite(s) && Number.isFinite(e) && e >= s) {
        dur = Math.floor((e - s) / 1000);
      }
    }

    return {
      id: r.conversation_id,         // keep UI simple
      date_time_utc: utcISO,         // <-- explicitly return UTC timestamp
      duration_seconds: dur ?? null, // <-- seconds as a number
      transcript: r.transcript ?? null,
    };
  });

  return NextResponse.json({ calls });
}
