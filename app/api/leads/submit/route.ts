import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(req: Request) {
  // ✅ Use admin privileges — safe on server only
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY! // bypasses RLS
  );

  const body = await req.json();
  const { user_id, first, last, email, phone } = body;

  if (!user_id || !first || !last) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // 1️⃣ Check for user in users_table
  const { data: userFromTable, error: userErr } = await supabase
    .from("users_table")
    .select("id")
    .eq("id", user_id)
    .maybeSingle();

  if (userErr) {
    console.error("users_table check error:", userErr);
    return NextResponse.json({ error: "User lookup failed" }, { status: 500 });
  }

  // 2️⃣ If user missing, auto-create
  if (!userFromTable) {
    const { error: insertUserErr } = await supabase
      .from("users_table")
      .insert([{ id: user_id, name: "Unknown", email }]);

    if (insertUserErr) {
      console.error("User insert failed:", insertUserErr);
      return NextResponse.json({ error: "Failed to register user" }, { status: 500 });
    }
  }

  // 3️⃣ Insert the lead (bypasses RLS)
  const { error: leadErr } = await supabase.from("leads").insert([
    { user_id, first, last, email, phone },
  ]);

  if (leadErr) {
    console.error("Lead insert failed:", leadErr);
    return NextResponse.json({ error: leadErr.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
