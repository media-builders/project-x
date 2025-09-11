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
  }));

  return NextResponse.json({ people }, { status: 200 });
}
