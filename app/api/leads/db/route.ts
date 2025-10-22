// TO FETCH SAVED LEADS FOR EACH USER FROM SUPABASE
// app/api/leads/db/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LeadRow = {
  id: string;        // uuid in DB
  user_id: string;
  fub_id: number | null;
  first: string;
  last: string;
  email: string | null;
  phone: string | null;
  stage: string | null;
  created_at: string;
  updated_at: string;
};

// This returns the shape the table already expects
type LeadOut = {
  id: string;          // use DB uuid as stable row id
  first: string;
  last: string;
  email: string;
  phone: string;
  stage: string | null;
};

export async function GET() {
  const supabase = createClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const people: LeadOut[] = (data as LeadRow[]).map((r) => ({
    id: r.id,                          // DB uuid
    first: r.first ?? "",
    last: r.last ?? "",
    email: r.email ?? "",
    phone: r.phone ?? "",
    stage: r.stage ?? null,
  }));

  return NextResponse.json({ people }, { status: 200 });
}

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: auth, error: authErr } = await supabase.auth.getUser();
  if (authErr || !auth?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  const ids = Array.isArray(body?.ids)
    ? body.ids
        .map((id: unknown) => (typeof id === "string" ? id.trim() : ""))
        .filter((id: string) => id.length > 0)
    : [];

  if (ids.length === 0) {
    return NextResponse.json(
      { error: "No lead ids provided" },
      { status: 400 }
    );
  }

  const uniqueIds = Array.from(new Set(ids));

  const { error } = await supabase
    .from("leads")
    .delete()
    .in("id", uniqueIds)
    .eq("user_id", auth.user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(
    { ok: true, deleted: uniqueIds.length },
    { status: 200 }
  );
}
