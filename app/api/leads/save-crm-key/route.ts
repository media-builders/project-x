// SAVES USER'S CRM API KEY INTO SUPABASE
// app/api/leads/save-crm-key/route.ts

import { NextResponse } from "next/server";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers"

export async function POST(req: Request) {
    try {
        const { crmApiKey } = await req.json();
         
        const cookieStore = cookies();
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    get(name) {
                        return cookieStore.get(name)?.value;
                    },
                    set(name, value, options) {
                        try {
                        cookieStore.set({ name, value, ...options });
                        } catch {}
                    },
                    remove(name, options) {
                        try {
                        cookieStore.set({ name, value: "", ...options });
                        } catch {}
                    },
                },
            }
        );

        //User Authentication
        const { data: {user}, error: authErr, } = await supabase.auth.getUser();

        console.log("Supabase user: ", user);
        console.log("Supabase user error: ", authErr);
        
        if (!user)
                return NextResponse.json({ error: "Unauthorized" }, { status: 401 });  
        
        if (!user.email)
                return NextResponse.json({ error: "User email missing" }, { status: 400 }); 

        //Updates user's CRM API key in the DB
        await db
            .update(usersTable)
            .set({ crm_api_key: crmApiKey })
            .where(eq(usersTable.email, user.email));

        const result = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.email, user.email));

        console.log("DB Update result: ", result);

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error(err);
        return NextResponse.json(
            { error: "Failed to save CRM API Key" },
            { status: 500 }
        );
    }
}
