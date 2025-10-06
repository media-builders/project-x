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

        console.log("Authenticated user ID:", user.id);

        // Debug select to verify user presence
        const checkUser = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, user.id));

        console.log("Found user in users_table:", checkUser);

        // Update user's CRM API key in the DB
        const result = await db
            .update(usersTable)
            .set({ crm_api_key: crmApiKey })
            .where(eq(usersTable.id, user.id));

        console.log("Update result:", result);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("Error saving CRM key:", err);
        return NextResponse.json(
            { error: "Failed to save CRM API Key" },
            { status: 500 }
        );
    }
}
