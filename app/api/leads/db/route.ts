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

    // Fetches the logged in user from Supabase
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Debug log: confirm user.id and crm key
    console.log("Saving CRM key for user:", user.id);

    // Attempt to update CRM key for current user
    const updateResult = await db
      .update(usersTable)
      .set({ crm_api_key: crmApiKey })
      .where(eq(usersTable.id, user.id))
      .returning();

    // If no row was updated, something went wrong
    if (updateResult.length === 0) {
      console.warn("[CRM API Key] No user record found to update:", user.id);
      return NextResponse.json(
        { error: "User not found in users_table" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("[CRM KEY SAVE ERROR]", err);
    return NextResponse.json(
      { error: "Failed to save CRM API Key" },
      { status: 500 }
    );
  }
}
