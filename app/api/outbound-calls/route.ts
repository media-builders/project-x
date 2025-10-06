/**
 * WHEN CALL IS CLICKED:
 * 1. Create ElevenLabs Agent if it doesnt already exist
 * 2. Create Twilio subaccount if it doesnt already exist
 * 3. Store Subaccount SID into db
 * 4. Fetch an available phone number
 * 5. Save Twilio phone number into db
 * 
 * THE PURPOSE OF THIS API
 * (5) Make a call
 * (6) USE OUTBOUND CALL VIA TWILLIO THROUGH ELEVENLABS API
 * (7)
 */

import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createServerClient } from "@supabase/ssr";
import { usersTable, userAgentsTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import Twilio from "twilio";
import { db } from "@/utils/db/db";

 
export async function POST(req: NextRequest) {
    try {
        //User Authentication + fetching user id
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
                cookies: {
                    getAll: () =>
                    req.cookies.getAll().map((cookie) => ({
                        name: cookie.name,
                        value: cookie.value,
                    })),
                    setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        req.cookies.set({ name, value, ...options });
                    });
                    },
                },
            }
        );
        const { data: {user}, error: authErr, } = await supabase.auth.getUser();
        if (authErr || !user)
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        if (!user.email) 
            return NextResponse.json({ error: "User email missing" }, { status: 400 });
        
        const dbUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, user.email))
        .limit(1);
    
        if (!dbUser.length)
            return NextResponse.json({ error: "User not found in DB" }, { status: 404 });
        const userId = dbUser[0].id;
        /********************************************************************************************/
        
        //Fetching User's ElevenLabs Agent
        const userAgent = await db
            .select()
            .from(userAgentsTable)
            .where(eq(userAgentsTable.user_id, userId))
            .limit(1);

        if (!userAgent.length)
            return NextResponse.json({ error: "No ElevenLabs agent found. Please create one before proceeding."});

        const agentId = userAgent[0].agent_id;
        let agentPhoneNumberId = userAgent[0].twilio_number;
        /********************************************************************************************/

        //CALLING TEST MODE - Delete later//
        const TEST_MODE = process.env.TEST_MODE === "true";
        const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || "";
        const toNumber = TEST_MODE ? TEST_PHONE_NUMBER : leads?.[0]?.phone;
        if (!toNumber) 
            return NextResponse.json({ error: "No phone number provided." }, { status: 400 });
        /********************************************************************************************/

        /**
         * FETCH USER'S TWILIO PHONE NUMBER
         * Currently using the main twilio account sid and auth token 
         * Twilio's trial Account limitation is preventing
         * phone number registration, hence using main account
         * Will implement fetching user's sid+token once trial account
         * limitations are removed.
         */
        const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID!;
        const TWILIO_AUTH = process.env.TWILIO_AUTH_TOKEN!; 
        const ELEVENLABS_API = process.env.ELEVENLABS_API_KEY!;

        const twilioClient = Twilio(TWILIO_SID, TWILIO_AUTH);
        const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 1 });
        if (!incomingNumbers.length)
            return NextResponse.json({ error: "No phone number found."}, { status: 400});
        const twilioNumber = incomingNumbers[0].phoneNumber;
        /********************************************************************************************/

    } catch (err: any) {
        console.error("❌ Error in outbound call:", err);
        return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
    }
}

