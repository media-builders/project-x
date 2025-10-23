// app/api/outbound-calls/route.ts
import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { createServerClient } from "@supabase/ssr";
import { usersTable, userAgentsTable, userTwilioSubaccountTable, callLogsTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import Twilio from "twilio";
import { db } from "@/utils/db/db";
//import { PLAN_QUOTAS } from "@/utils/planQuota";
//import { getUserUsedMinutes } from "@/utils/getUserUsage";

type LeadIn = {
    id?: string;
    phone?: string;
    name?: string;
    first?: string;
    last?: string;
    email?: string;
};

const assertEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
};

const toE164 = (raw: string, defaultCountry = "+1") => {
    const digits = (raw || "").replace(/\D/g, "");
    if (digits.length === 10) return `${defaultCountry}${digits}`; // NANP
    if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
    return raw?.startsWith("+") ? raw : (digits ? `+${digits}` : "");
};

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const ELEVENLABS_API_KEY = assertEnv("ELEVENLABS_API_KEY");
    const SUPABASE_URL = assertEnv("NEXT_PUBLIC_SUPABASE_URL");
    const SUPABASE_ANON = assertEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY");

    const body = await req.json().catch(() => ({}));
    const leads: Array<{ phone?: string; name?: string; id?: string; first?: string; last?: string; email?: string }> = body?.leads || [];

    // Supabase auth
    const supabase = createServerClient(SUPABASE_URL, SUPABASE_ANON, {
      cookies: {
        getAll: () =>
          req.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          })),
        setAll: () => {},
      },
    });

    // Resolve user via Supabase auth
    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();
    if (authErr || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!user.email) return NextResponse.json({ error: "User email missing" }, { status: 400 });

    const dbUser = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email))
      .limit(1);
    if (!dbUser.length) {
      return NextResponse.json({ error: "User not found in DB" }, { status: 404 });
    }

    const userId = dbUser[0].id;
    const userName = dbUser[0].name ?? user.email;

    /**Checking Plan Quota
    const plan = dbUser[0].plan || "Basic";
    const quota = PLAN_QUOTAS[plan] ?? 500;

    const used = await db
      .select({ duration_sec: callLogsTable.duration_sec })
      .from(callLogsTable)
      .where(eq(callLogsTable.user_id, userId));

    const totalMinutes = Math.floor(
      used.reduce((sum, row) => sum + (Number(row.duration_sec) || 0), 0) / 60
    );

    if (totalMinutes >= quota) {
      return NextResponse.json(
        {
          error: `Quota exceeded: ${totalMinutes}/${quota} minutes used. Please upgrade your plan.`,
        },
        { status: 403 }
      );
    }**/

    // User's ElevenLabs agent
    const userAgentRows = await db
      .select()
      .from(userAgentsTable)
      .where(eq(userAgentsTable.user_id, userId))
      .limit(1);

    if (!userAgentRows.length) {
      return NextResponse.json(
        { error: "No ElevenLabs agent found. Please create one before proceeding." },
        { status: 400 }
      );
    }

    const { agent_id: agentId } = userAgentRows[0];
    let { agent_phone_number_id: agentPhoneNumberId, twilio_number: twilioPhoneNumber } = userAgentRows[0];

    // Twilio subaccount
    const subRows = await db
      .select()
      .from(userTwilioSubaccountTable)
      .where(eq(userTwilioSubaccountTable.user_id, userId))
      .limit(1);

    if (!subRows.length) {
      return NextResponse.json(
        { error: "No Twilio subaccount found for this user." },
        { status: 400 }
      );
    }

    const { subaccount_sid, subaccount_auth_token } = subRows[0];
    const twilioClient = Twilio(subaccount_sid, subaccount_auth_token);
    console.log("[Twilio] Using subaccount:", subaccount_sid);

    // Checking for twilio number
    if (!twilioPhoneNumber) {
      console.log("[Twilio] Fetching first incoming phone number from subaccount…");
      const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 1 });
      if (!incomingNumbers.length) {
        return NextResponse.json(
          { error: "No Twilio phone number found in subaccount." },
          { status: 400 }
        );
      }
      twilioPhoneNumber = incomingNumbers[0].phoneNumber;
      await db
        .update(userAgentsTable)
        .set({ twilio_number: twilioPhoneNumber })
        .where(eq(userAgentsTable.user_id, userId));
      console.log("[Twilio] Saved subaccount number:", twilioPhoneNumber);
    }

    // Import only if we don't already have a phone_number_id saved
    if (!agentPhoneNumberId) {
      console.log("[EL] Importing Twilio number into ElevenLabs…", {
        account_sid: subaccount_sid,
        phone_number: twilioPhoneNumber,
      });

      const importRes = await fetch("https://api.elevenlabs.io/v1/convai/phone-numbers", {
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
      });

      const importData = await importRes.json();
      console.log("[EL] Import response:", importData);

      if (!importRes.ok) {
        return NextResponse.json(
          {
            error:
              importData?.error ||
              importData?.detail ||
              "Twilio phone number import to ElevenLabs failed.",
          },
          { status: 500 }
        );
      }

      agentPhoneNumberId = importData.phone_number_id;
      await db
        .update(userAgentsTable)
        .set({
          twilio_number: twilioPhoneNumber,
          agent_phone_number_id: agentPhoneNumberId,
        })
        .where(eq(userAgentsTable.user_id, userId));

      console.log("[EL] Saved agent_phone_number_id:", agentPhoneNumberId);
    }

    console.log("[EL] Assigning agent to phone number…", { agentId, agentPhoneNumberId });
    const assignRes = await fetch(
      `https://api.elevenlabs.io/v1/convai/phone-numbers/${agentPhoneNumberId}`,
      {
        method: "PATCH",
        headers: {
          "xi-api-key": ELEVENLABS_API_KEY!,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ agent_id: agentId }),
      }
    );
    const assignData = await assignRes.json();
    console.log("[EL] Assign response:", assignData);

    if (!assignRes.ok) {
      return NextResponse.json(
        {
          error:
            assignData?.error ||
            assignData?.detail ||
            "Failed to assign phone number to ElevenLabs agent.",
        },
        { status: 500 }
      );
    }

    // ---- Destination number handling ----
    const TEST_MODE = process.env.TEST_MODE === "true";
    const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || "";
    const rawTo = TEST_MODE ? TEST_PHONE_NUMBER : leads?.[0]?.phone;
    if (!rawTo) {
      return NextResponse.json({ error: "No phone number provided." }, { status: 400 });
    }
    const toNumber = toE164(rawTo);
    if (!toNumber || !/^\+\d{10,15}$/.test(toNumber)) {
      return NextResponse.json(
        { error: `Invalid phone number format. Received: "${rawTo}"` },
        { status: 400 }
      );
    }
    if (TEST_MODE && !/^\+\d{10,15}$/.test(TEST_PHONE_NUMBER)) {
      return NextResponse.json(
        { error: "TEST_MODE is true but TEST_PHONE_NUMBER is not a valid E.164 number." },
        { status: 400 }
      );
    }

    // Mapping dynamic variables
    const lead: LeadIn = leads?.[0] ?? {};
    const parsed = (lead.name || "").trim().split(/\s+/);
    const inferredFirst = parsed[0] || "";
    const inferredLast = parsed.slice(1).join(" ");

    const firstName = lead.first || inferredFirst || "there";
    const lastName = lead.last || inferredLast || "";
    const leadEmail = lead.email || "";
    const leadPhone = lead.phone || "";

    const dynamicVars = {
      user_id: userId,
      lead_id: lead?.id ?? "",
      agent_id: agentId,
      to_number: toNumber,
      from_number: twilioPhoneNumber!,
      Lead_First_Name: firstName,
      Lead_Last_Name: lastName,
      Lead_Email: leadEmail,
      Lead_Phone: leadPhone,
      test_mode: TEST_MODE ? "true" : "false",
    };

    const conversationInitiationClientData = {
      dynamicVariables: dynamicVars,
    };

    // ---- Place the call via ElevenLabs ----
    const elClient = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
    console.log("[EL] Placing outbound call…", {
      toNumber,
      fromNumber: twilioPhoneNumber,
      agentId,
      agentPhoneNumberId,
      TEST_MODE,
      echo_dynamic_vars: dynamicVars,
    });

    
    const call = await (elClient.conversationalAi.twilio as any).outboundCall({
      agentId,
      agentPhoneNumberId: agentPhoneNumberId!,
      toNumber,
      conversation_initiation_client_data: {
        dynamic_variables: dynamicVars,
      },
    });


    // Immediately record a pending row
    try {
      const conversationId = (call as any)?.conversationId as string | undefined;
      const callSid = (call as any)?.callSid as string | undefined;

      if (conversationId) {
        await db
          .insert(callLogsTable)
          .values({
            conversation_id: conversationId,
            user_id: userId,
            agent_id: agentId,
            status: "call.started",
            to_number: toNumber,
            from_number: twilioPhoneNumber!,
            started_at: new Date(),
            metadata: {
              source: "outbound-route",
              twilio_call_sid: callSid ?? null,
            },
            dynamic_variables: dynamicVars,
          })
          .onConflictDoNothing();
      } else {
        console.warn("[Outbound] No conv_ id in response; skipping initial insert.");
      }
    } catch (e) {
      console.warn("[Outbound] Failed to insert initial call_log row:", e);
    }

    console.log("[EL] Outbound call response:", call as any);

    return NextResponse.json(
      {
        status: "initiated",
        called_number: toNumber,
        from_number: twilioPhoneNumber,
        lead_name: `${firstName} ${lastName}`.trim() || "Unknown Lead",
        agent_id: agentId,
        agent_phone_number_id: agentPhoneNumberId,
        elevenlabs_response: call,
        conversation_id: (call as any)?.conversationId ?? null,
        twilio_call_sid: (call as any)?.callSid ?? null,
        echo_dynamic_vars: dynamicVars,
      },
      { status: 200 }
    );
  } catch (err: any) {
    console.error("[Outbound Call] Error:", err);
    return NextResponse.json(
      { error: err?.message || "Unexpected error while initiating call." },
      { status: 500 }
    );
  }
}
