import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createServerClient } from "@supabase/ssr";
import { usersTable, userAgentsTable, userTwilioSubaccountTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import Twilio from "twilio";
import { db } from "@/utils/db/db";
 
export async function POST(req: NextRequest) {
    try {
        const { leads } = await req.json();

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
        const userName = dbUser[0].name;
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
        let agentPhoneNumberId = userAgent[0].agent_phone_number_id;
        let twilioPhoneNumber = userAgent[0].twilio_number;
        /********************************************************************************************/

        //CALLING TEST MODE - Delete later//
        // You can enter your phone number into the TEST_PHONE_NUMBER env variable
        // This is the number you will get a call on
        const TEST_MODE = process.env.TEST_MODE === "true";
        const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || "";
        const toNumber = TEST_MODE ? TEST_PHONE_NUMBER : leads?.[0]?.phone;
        /**const toNumber = leads?.[0]?.phone;
        if (!toNumber) 
            return NextResponse.json({ error: "No phone number provided." }, { status: 400 });
        /********************************************************************************************/

        //Fetch user's subaccount details     
        const subaccount = await db
            .select()
            .from(userTwilioSubaccountTable)
            .where(eq(userTwilioSubaccountTable.user_id, userId))
            .limit(1);

        if (!subaccount.length) {
            return NextResponse.json(
                { error: "No twilio subaccount found for this user."},
                { status: 400 }
            );
        }

        const { subaccount_sid, subaccount_auth_token, phone_number } = subaccount[0];
        const twilioClient = Twilio(subaccount_sid, subaccount_auth_token);
        console.log(`Twilio subaccount: ${subaccount_sid}`);
        /********************************************************************************************/

        //Fetching phone number
        if (!twilioPhoneNumber) {
            console.log("Fetching Twilio phone number...");
            const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 1 });
            
            if (!incomingNumbers.length)
                return NextResponse.json({ error: "No phone number found."}, { status: 400});
            
            twilioPhoneNumber = incomingNumbers[0].phoneNumber;
            console.log("Your twilio phone number is: ", twilioPhoneNumber);

            await db
                .update(userAgentsTable)
                .set({ twilio_number: twilioPhoneNumber })
                .where(eq(userAgentsTable.user_id, userId));
            console.log("Twilio number saved!");
        } 
        /********************************************************************************************/

        //Import into Elevenlabs if not already imported
        const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY!;
        if (!agentPhoneNumberId) {
            //debugging purposes
            console.log("Sending to ElevenLabs import:", {
                account_sid: subaccount_sid,
                phone_number: twilioPhoneNumber,
            });
            const importRes = await fetch(
                "https://api.elevenlabs.io/v1/convai/phone-numbers", 
                {
                    method: "POST",
                    headers: {
                        "xi-api-key": ELEVENLABS_API_KEY,
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        phone_number: twilioPhoneNumber,
                        label: `${userName}'s Twilio Number`,
                        sid: subaccount_sid,
                        token: subaccount_auth_token, 
                        provider: "twilio", 
                    }),
                }
            );
            
            const importData = await importRes.json();
            console.log("ElevenLabs import response:", importData);
            if (!importRes.ok) {
                console.error("ElevenLabs import unsuccessful: ", importData);
                return NextResponse.json(
                    { error: importData.error || "Twilio phone number import failed."},
                    { status: 500 }
                );
            }
            agentPhoneNumberId = importData.phone_number_id;

            /**Updating table with info */
            await db
            .update(userAgentsTable)
            .set({ 
                twilio_number: twilioPhoneNumber,
                agent_phone_number_id: agentPhoneNumberId,
             })
            .where(eq(userAgentsTable.user_id, userId));

            console.log("Import successful!");
            
            /**Assigning the agent to the imported phone number */
            const assignRes = await fetch(
                `https://api.elevenlabs.io/v1/convai/phone-numbers/${agentPhoneNumberId}`,
                {
                    method: "PATCH",
                    headers: {
                    "xi-api-key": ELEVENLABS_API_KEY,
                    "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                    agent_id: agentId,
                    }),
                }
            );

            const assignData = await assignRes.json();
            console.log("Assign response:", assignData);

            if (!assignRes.ok) {
                console.error("Failed to assign phone number:", assignData);
                return NextResponse.json(
                    { error: assignData.error || "Failed to assign phone number to agent." },
                    { status: 500 }
                );
            }

            console.log("Phone number successfully assigned to agent!");
        }
        /********************************************************************************************/
        
        //Making Call via Elevenlabs
        const elClient = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
        console.log(`Calling ${leads[0].name}"})`);

        if (!agentPhoneNumberId)
            return NextResponse.json({ error: "No Twilio phone number found or imported." }, { status: 400 });

        const call = await elClient.conversationalAi.twilio.outboundCall({
            agentId: agentId,
            agentPhoneNumberId: agentPhoneNumberId,
            toNumber: toNumber,
        });

        return NextResponse.json({
            status: "initiated",
            called_number: toNumber,
            from_number: twilioPhoneNumber,
            agent_id: agentId,
            elevenlabs_response: call,
        });
        /********************************************************************************************/

    } catch (err: any) {
        console.error("Error in outbound call:", err);
        return NextResponse.json({ error: err.message || "Unexpected error" }, { status: 500 });
    }
}

