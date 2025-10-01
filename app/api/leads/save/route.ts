// TO SAVE LEADS FOR EACH USER INTO SUPABASE
// app/api/leads/save/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Shape coming from your existing /api/leads
type Lead = {
  id: string;       // FUB id as string
  first: string;
  last: string;
  email: string;
  phone: string;
};

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: auth, error: authErr } = await supabase.auth.getUser();
    if (authErr || !auth?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const people: Lead[] = body?.people ?? [];
    if (!Array.isArray(people)) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    // Map to DB rows
    const rows = people.map((p) => ({
      user_id: auth.user.id,
      fub_id: Number.isFinite(Number(p.id)) ? Number(p.id) : null,
      first: (p.first ?? "").trim(),
      last: (p.last ?? "").trim(),
      email: (p.email ?? "").trim() || null,
      phone: (p.phone ?? "").trim() || null,
    }));

    // Upsert on (user_id, fub_id)
    // NOTE: requires the unique index created above.
    const { error: upsertErr } = await supabase
      .from("leads")
      .upsert(rows, { onConflict: "user_id,fub_id" });

    if (upsertErr) {
      return NextResponse.json({ error: upsertErr.message }, { status: 500 });
    }

    return NextResponse.json({ ok: true, count: rows.length }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to save leads" },
      { status: 500 }
    );
  }
}
