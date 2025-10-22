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

// format phone no  as xxx-xxx-xxxx 
function fmtPhone(s: string | null | undefined) {
  const digits = (s || "").replace(/\D/g, "");
  if (!digits) return "";
  const ten = digits.slice(-10); // use last 10 digits
  if (ten.length !== 10) return ""; // not enough digits to format
  return `${ten.slice(0,3)}-${ten.slice(3,6)}-${ten.slice(6)}`;
}

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
    .select("id, first, last, email, phone, stage, created_at") // 
    .eq("user_id", auth.user.id)                                 // return only the caller's leads
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const people: LeadOut[] = (data as LeadRow[]).map((r) => ({
    id: r.id,                          // DB uuid
    first: r.first ?? "",
    last: r.last ?? "",
    email: r.email ?? "",
    phone: fmtPhone(r.phone),
    stage: r.stage ?? null,
  }));

  return NextResponse.json({ people }, { status: 200 });
}
