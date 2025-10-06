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
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // ✅ Ensure UUID is passed as string (Drizzle accepts string UUID if schema is correct)
        const userId = user.id;

        const result = await db
            .update(usersTable)
            .set({ crm_api_key: crmApiKey })
            .where(eq(usersTable.id, userId));

        return NextResponse.json({ success: true, result });
    } catch (err) {
        console.error("Save CRM API Key Error:", err);
        return NextResponse.json(
            { error: "Failed to save CRM API Key" },
            { status: 500 }
        );
    }
}
