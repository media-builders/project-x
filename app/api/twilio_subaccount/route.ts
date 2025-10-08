import { NextRequest, NextResponse } from "next/server";
import { Twilio } from 'twilio';
import { db } from "@/utils/db/db";
import { eq } from 'drizzle-orm';
import { usersTable, userTwilioSubaccountTable } from "@/utils/db/schema";
import { createServerClient } from "@supabase/ssr";

//MAIN ACCOUNT THAT CONTAINS SUBACCOUNTS
const twilioClient = new Twilio(
    process.env.TWILIO_ACCOUNT_SID!,
    process.env.TWILIO_AUTH_TOKEN!
);

export async function POST( req: NextRequest) {
    try {
        //Logged-in user's info first
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
            },}
        );

        //User Authentication
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

        const userFirstName = dbUser[0].name.split(" ")[0] || "User";
        const userId = dbUser[0].id;

        //Check for Subaccount
        const existingSubaccount = await db.select()
            .from(userTwilioSubaccountTable)
            .where(eq(userTwilioSubaccountTable.user_id, userId))
            .limit(1);

        //subaccount exists
        if(existingSubaccount.length > 0) {
            console.log("Account already exists");
            return NextResponse.json({
                message: "Twilio subaccount already exists.",
                subaccount: existingSubaccount[0]
            });
            
        }
        
        const newSubaccount = await twilioClient.api.v2010.accounts.create({
                    friendlyName: `${userFirstName}'s Subaccount`
        });
        console.log("Subaccount Created:", newSubaccount.sid);

        const subClient = new Twilio(newSubaccount.sid, newSubaccount.authToken);

        //Fetch phone number
        const availableNumbers = await subClient
            .availablePhoneNumbers("CA")
            .local.list({ limit: 1 });

        if (!availableNumbers.length) {
            return NextResponse.json({ error: "No available phone numbers" }, { status: 500 });
        }
        const phoneNumber = availableNumbers[0].phoneNumber;
        console.log(`Purchased phone number ${phoneNumber} for subaccount ${newSubaccount.sid}`);

        //Purchase phone number
        await subClient.incomingPhoneNumbers.create({ phoneNumber });

        //Store subaccount details and phone number
        const [subaccount] = await db.insert(userTwilioSubaccountTable)
            .values({
                user_id: userId,
                subaccount_sid: newSubaccount.sid,
                subaccount_auth_token: newSubaccount.authToken,
                phone_number: phoneNumber,

            }).returning();

        return NextResponse.json({
            message: "Twilio subaccount has been created!",
            subaccount,
        });

    } catch (err: any) {
        console.error("Could not create a subaccount!", err);
        return NextResponse.json(
            { error: err.message || "Something went wrong while creating your account."}, 
            { status: 500});
    }
            
}
