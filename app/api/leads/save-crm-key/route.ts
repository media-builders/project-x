// SAVES USER'S CRM API KEY INTO SUPABASE
// app/api/leads/save-crm-key/route.ts

import { NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { createClient} from "@/utils/supabase/server";

export async function POST(req: Request) {
    try {
        const { crmApiKey } = await req.json();

        //Fetches the logged in user from supabase
        const supabase = createClient();
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401});
        }

        //Updates user's CRM API key in the DB
        await db
            .update(usersTable)
            .set({ crm_api_key: crmApiKey })
            .where(eq(usersTable.id, user.id));

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to save CRM API Key" },
            { status: 500 }
        );
    }
}
