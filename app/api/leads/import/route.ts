// REDUNDANT FOR NOW UNTIL EXPORT IS IMPLEMENTED
// app/api/leads/import/route.ts

import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { fetchFUBLeads } from "@/utils/fub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

//FORMATTING FIRST & LAST NAMES
function formatName(name: string) {
  if (!name) return "";
  return name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();
}

//FORMATTING PHONE NUMBERS
function formatPhone(phone: string) {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, "");
    if (digits.length !== 10) return phone;
    return `${digits.slice(0,3)}-${digits.slice(3,6)}-${digits.slice(6)}`;
}

export async function POST() {
    try {
        //Get logged-in user
        const supabase = createClient();
        const { 
            data: {user},
            error: authErr,
        } = await supabase.auth.getUser();
        // no one is logged in
        if (authErr || !user) {
            return NextResponse.json({error: "Unauthorized" }, {status: 401});
        }

        //Fetch saved CRM API key
        const userRow = await db
            .select()
            .from(usersTable)
            .where(eq(usersTable.id, user.id))
            .limit(1);
        const crmKey = userRow[0]?.crm_api_key;

        //Error message if no API key is saved
        if (!crmKey){
            return NextResponse.json(
                { error: "No API key found. Please enter an API key in the Settings tab before importing again."},
                { status: 400}
            );
        }
        
        //Fetch leads from FUB using API key
        const leads = await fetchFUBLeads(crmKey);

        //Save leads into SUPABASE
        const rows = leads.map((p) => ({
            user_id: user.id,
            fub_id: Number.isFinite(Number(p.id)) ? Number(p.id) : null,
            first: formatName(p.first),
            last: formatName(p.last),
            email: p.email?.trim() || null,
            phone: formatPhone(p.phone),
        }));

        //No duplicate entries
        // Use the supabase client to upsert (insert-or-update) by user_id + fub_id
        const { error: upsertErr } = await supabase
            .from("leads")
            .upsert(rows, { onConflict: "user_id,fub_id" });
        if (upsertErr) {
            return NextResponse.json({ error: upsertErr.message }, { status: 500 });
        }

        return NextResponse.json({ ok: true, count: rows.length }, { status: 200 });
    } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to import leads" },
      { status: 500 }
    );
  }
}