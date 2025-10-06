// SAVES USER'S CRM API KEY INTO SUPABASE
// app/api/leads/save-crm-key/route.ts

import { NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const { crmApiKey } = await req.json();

    // Fetch the logged in user from Supabase
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Debug log: confirm which user we’re updating
    console.log("[SAVE CRM KEY] Attempting update for user ID:", user.id);

    // Update user's CRM API key in the DB and return the updated row(s)
    const result = await db
      .update(usersTable)
      .set({ crm_api_key: crmApiKey })
      .where(eq(usersTable.id, user.id))
      .returning();

    // If no row was updated, user ID didn’t match any row in users_table
    if (result.length === 0) {
      console.warn("[SAVE CRM KEY] No user found in users_table for ID:", user.id);
      return NextResponse.json(
        { error: "No user record found in users_table for this account" },
        { status: 404 }
      );
    }

    console.log("[SAVE CRM KEY] CRM key successfully saved for user:", user.id);
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CRM KEY SAVE ERROR]", err);
    return NextResponse.json(
      { error: "Failed to save CRM API Key" },
      { status: 500 }
    );
  }
}
