import { NextRequest, NextResponse } from "next/server";
import { Twilio } from "twilio";
import { db } from "@/utils/db/db";
import { eq } from "drizzle-orm";
import { usersTable, userTwilioSubaccountTable } from "@/utils/db/schema";
import { createServerClient } from "@supabase/ssr";

// MAIN ACCOUNT THAT CONTAINS SUBACCOUNTS
const twilioClient = new Twilio(
  process.env.TWILIO_ACCOUNT_SID!,
  process.env.TWILIO_AUTH_TOKEN!
);

export async function POST(req: NextRequest) {
  try {
    // --- Authenticate user via Supabase ---
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

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.email)
      return NextResponse.json({ error: "User email missing" }, { status: 400 });

    // --- Fetch user from DB ---
    const dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email))
      .limit(1);

    if (!dbUser.length)
      return NextResponse.json({ error: "User not found in DB" }, { status: 404 });

    const userFirstName = dbUser[0].name.split(" ")[0] || "User";
    const userId = dbUser[0].id;

    // --- Check if user already has a Twilio subaccount ---
    const existingSubaccount = await db
      .select()
      .from(userTwilioSubaccountTable)
      .where(eq(userTwilioSubaccountTable.user_id, userId))
      .limit(1);

    if (existingSubaccount.length > 0) {
      console.log("Subaccount already exists for user.");
      return NextResponse.json({
        message: "Twilio subaccount already exists.",
        subaccount: existingSubaccount[0],
      });
    }

    // --- Create new Twilio subaccount ---
    const newSubaccount = await twilioClient.api.v2010.accounts.create({
      friendlyName: `${userFirstName}'s Subaccount`,
    });
    console.log("✅ Subaccount created:", newSubaccount.sid);

    const subClient = new Twilio(newSubaccount.sid, newSubaccount.authToken);

    // --- Search for Toronto-based phone number ---
    const preferredAreaCodes = [416, 647, 437];
    let availableNumbers: any[] = [];

    for (const code of preferredAreaCodes) {
      console.log(`🔍 Searching for area code ${code}...`);
      const numbers = await subClient
        .availablePhoneNumbers("CA")
        .local.list({ areaCode: code, limit: 1 } as any);

      if (numbers.length) {
        console.log(`✅ Found number in area code ${code}`);
        availableNumbers = numbers;
        break;
      }
    }

    // --- Fallback: search by locality name ---
    if (!availableNumbers.length) {
      console.log("⚠️ No 416/647/437 numbers found — trying Toronto locality...");
      availableNumbers = await subClient
        .availablePhoneNumbers("CA")
        .local.list({ inLocality: "Toronto", limit: 1 } as any);
    }

    // --- Fallback: any Canadian number ---
    if (!availableNumbers.length) {
      console.log("⚠️ No Toronto numbers found — trying any Canadian number...");
      availableNumbers = await subClient
        .availablePhoneNumbers("CA")
        .local.list({ limit: 1 } as any);
    }

    if (!availableNumbers.length) {
      throw new Error("No available phone numbers found in Canada.");
    }

    const phoneNumber = availableNumbers[0].phoneNumber;
    console.log(`📞 Purchased phone number ${phoneNumber} for subaccount ${newSubaccount.sid}`);

    // --- Purchase the number for the subaccount ---
    await subClient.incomingPhoneNumbers.create({ phoneNumber });

    // --- Save subaccount info in DB ---
    const [subaccount] = await db
      .insert(userTwilioSubaccountTable)
      .values({
        user_id: userId,
        subaccount_sid: newSubaccount.sid,
        subaccount_auth_token: newSubaccount.authToken,
        phone_number: phoneNumber,
      })
      .returning();

    console.log("✅ Subaccount and number successfully stored.");

    return NextResponse.json({
      message: "Twilio subaccount has been created successfully!",
      subaccount,
    });
  } catch (err: any) {
    console.error("❌ Could not create Twilio subaccount:", err);
    return NextResponse.json(
      {
        error: err.message || "Something went wrong while creating your account.",
      },
      { status: 500 }
    );
  }
}
