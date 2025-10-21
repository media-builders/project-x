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
  dynamic_variables: Record<string, any> | null;
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
    .select("*")
    .eq("user_id", uid)
    .filter("dynamic_variables->>lead_id", "eq", leadId)
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

  const calls = rows.map((r) => {
    const dv = r.dynamic_variables || {};
    const utcISO: string | null =
      (typeof dv.system__time_utc === "string" && dv.system__time_utc) ||
      r.started_at ||
      null;

    // Compute duration
    const dur =
      toInt(dv.system__call_duration_secs) ??
      toInt(r.duration_sec) ??
      (r.started_at && r.ended_at
        ? Math.floor(
            (Date.parse(r.ended_at) - Date.parse(r.started_at)) / 1000
          )
        : null);

    return {
      id: r.conversation_id,
      date_time_utc: utcISO,
      duration_seconds: dur,
      transcript: r.transcript ?? null,
    };
  });

  console.log("[calls]", {
    leadId,
    count: calls.length,
    first: calls[0],
  });

  return NextResponse.json({ calls });
}
