// app/api/leads/save-crm-key/route.ts

import { NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const { crmApiKey } = await req.json();

    const supabase = createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // DEBUG: Ensure we're logging the user ID that we’re trying to match
    console.log("Authenticated user ID:", user.id);

    const updateResult = await db
      .update(usersTable)
      .set({ crm_api_key: crmApiKey })
      .where(eq(usersTable.id, user.id));

    console.log("CRM Key Update Result:", updateResult);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Error updating CRM Key:", err);
    return NextResponse.json(
      { error: "Failed to save CRM API Key" },
      { status: 500 }
    );
  }
}
