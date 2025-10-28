import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import Twilio from "twilio";
import { db } from "@/utils/db/db";
import {
  usersTable,
  userAgentsTable,
  userTwilioSubaccountTable,
  callLogsTable,
  type SelectUser,
  type SelectUserAgent,
  type SelectUserSubaccount,
} from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { createHmac, randomUUID } from "crypto";

export type LeadIn = {
  id?: string;
  phone?: string;
  name?: string;
  first?: string;
  last?: string;
  email?: string;
};

export class OutboundCallError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 400, details?: unknown) {
    super(message);
    this.name = "OutboundCallError";
    this.status = status;
    this.details = details;
  }
}

export const assertEnv = (name: string) => {
  const value = process.env[name];
  if (!value) throw new OutboundCallError(`Missing required environment variable: ${name}`, 500);
  return value;
};

const toE164 = (raw: string, defaultCountry = "+1") => {
  const digits = (raw || "").replace(/\D/g, "");
  if (digits.length === 10) return `${defaultCountry}${digits}`; // NANP
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  return raw?.startsWith("+") ? raw : digits ? `+${digits}` : "";
};

export const hashStatusToken = (conversationId: string, token: string, secret: string) =>
  createHmac("sha256", secret).update(`${conversationId}:${token}`).digest("hex");

export const issueStatusToken = (conversationId: string, secret: string) => {
  const token = randomUUID();
  const hash = hashStatusToken(conversationId, token, secret);
  return { token, hash };
};

export type OutboundCallContext = {
  user: SelectUser;
  agent: SelectUserAgent;
  subaccount: SelectUserSubaccount;
};

export const fetchUserByEmailOrThrow = async (email: string): Promise<SelectUser> => {
  const rows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, email))
    .limit(1);

  if (!rows.length) {
    throw new OutboundCallError("User not found in DB", 404);
  }

  return rows[0];
};

export const fetchOutboundContextOrThrow = async (userId: string): Promise<OutboundCallContext> => {
  const userRows = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, userId))
    .limit(1);

  if (!userRows.length) {
    throw new OutboundCallError("User not found in DB", 404);
  }

  const user = userRows[0];

  const agentRows = await db
    .select()
    .from(userAgentsTable)
    .where(eq(userAgentsTable.user_id, userId))
    .limit(1);

  if (!agentRows.length) {
    throw new OutboundCallError(
      "No ElevenLabs agent found. Please create one before proceeding.",
      400
    );
  }

  const subaccountRows = await db
    .select()
    .from(userTwilioSubaccountTable)
    .where(eq(userTwilioSubaccountTable.user_id, userId))
    .limit(1);

  if (!subaccountRows.length) {
    throw new OutboundCallError("No Twilio subaccount found for this user.", 400);
  }

  return {
    user,
    agent: agentRows[0],
    subaccount: subaccountRows[0],
  };
};

export type InitiateOutboundCallResult = {
  status: "initiated";
  conversationId: string | null;
  statusToken: string | null;
  calledNumber: string;
  fromNumber: string;
  leadName: string;
  leadEmail: string;
  agentNumber: string;
  dynamicVariables: Record<string, any>;
  elevenlabsResponse: unknown;
  twilioCallSid: string | null;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const initiateOutboundCall = async (
  context: OutboundCallContext,
  lead: LeadIn,
  options?: { skipStatusToken?: boolean }
): Promise<InitiateOutboundCallResult> => {
  const ELEVENLABS_API_KEY = assertEnv("ELEVENLABS_API_KEY");
  const STATUS_TOKEN_SECRET = assertEnv("OUTBOUND_STATUS_SECRET");

  const { user, agent: agentRow, subaccount } = context;
  const userId = user.id;
  const userName = user.name ?? user.email;

  let agentPhoneNumberId = agentRow.agent_phone_number_id ?? null;
  let twilioPhoneNumber = agentRow.twilio_number ?? null;

  const twilioClient = Twilio(subaccount.subaccount_sid, subaccount.subaccount_auth_token);
  console.log("[Twilio] Using subaccount:", subaccount.subaccount_sid);

  if (!twilioPhoneNumber) {
    console.log("[Twilio] Fetching first incoming phone number from subaccount…");
    const incomingNumbers = await twilioClient.incomingPhoneNumbers.list({ limit: 1 });
    if (!incomingNumbers.length) {
      throw new OutboundCallError("No Twilio phone number found in subaccount.", 400);
    }
    twilioPhoneNumber = incomingNumbers[0].phoneNumber;
    await db
      .update(userAgentsTable)
      .set({ twilio_number: twilioPhoneNumber })
      .where(eq(userAgentsTable.user_id, userId));
    agentRow.twilio_number = twilioPhoneNumber;
    console.log("[Twilio] Saved subaccount number:", twilioPhoneNumber);
  }

  if (!agentPhoneNumberId) {
    console.log("[EL] Importing Twilio number into ElevenLabs…", {
      account_sid: subaccount.subaccount_sid,
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
        sid: subaccount.subaccount_sid,
        token: subaccount.subaccount_auth_token,
        provider: "twilio",
      }),
    });

    const importData = await importRes.json().catch(() => ({}));
    console.log("[EL] Import response:", importData);

    if (!importRes.ok) {
      throw new OutboundCallError(
        importData?.error ||
          importData?.detail ||
          "Twilio phone number import to ElevenLabs failed.",
        500,
        importData
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
    agentRow.agent_phone_number_id = agentPhoneNumberId;

    console.log("[EL] Saved agent_phone_number_id:", agentPhoneNumberId);
    // allow ElevenLabs to finish provisioning before assignment
    await sleep(500);
  }

  console.log("[EL] Assigning agent to phone number…", {
    agentId: agentRow.agent_id,
    agentPhoneNumberId,
  });

  const assignRes = await fetch(
    `https://api.elevenlabs.io/v1/convai/phone-numbers/${agentPhoneNumberId}`,
    {
      method: "PATCH",
      headers: {
        "xi-api-key": ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ agent_id: agentRow.agent_id }),
    }
  );
  const assignData = await assignRes.json().catch(() => ({}));
  console.log("[EL] Assign response:", assignData);

  if (!assignRes.ok) {
    throw new OutboundCallError(
      assignData?.error ||
        assignData?.detail ||
        "Failed to assign phone number to ElevenLabs agent.",
      500,
      assignData
    );
  }

  const TEST_MODE = process.env.TEST_MODE === "true";
  const TEST_PHONE_NUMBER = process.env.TEST_PHONE_NUMBER || "";
  const rawTo = TEST_MODE ? TEST_PHONE_NUMBER : lead?.phone;
  if (!rawTo) {
    throw new OutboundCallError("No phone number provided.", 400);
  }
  const toNumber = toE164(rawTo);
  if (!toNumber || !/^\+\d{10,15}$/.test(toNumber)) {
    throw new OutboundCallError(
      `Invalid phone number format. Received: "${rawTo}"`,
      400
    );
  }
  if (TEST_MODE && !/^\+\d{10,15}$/.test(TEST_PHONE_NUMBER)) {
    throw new OutboundCallError(
      "TEST_MODE is true but TEST_PHONE_NUMBER is not a valid E.164 number.",
      400
    );
  }

  const parsed = (lead?.name || "").trim().split(/\s+/);
  const inferredFirst = parsed[0] || "";
  const inferredLast = parsed.slice(1).join(" ");

  const firstName = lead?.first || inferredFirst || "there";
  const lastName = lead?.last || inferredLast || "";
  const leadEmail = lead?.email || "";
  const leadPhone = lead?.phone || "";

  const dynamicVars = {
    user_id: userId,
    lead_id: lead?.id ?? "",
    agent_id: agentRow.agent_id,
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

  const elClient = new ElevenLabsClient({ apiKey: ELEVENLABS_API_KEY });
  console.log("[EL] Placing outbound call…", {
    toNumber,
    fromNumber: twilioPhoneNumber,
    agentId: agentRow.agent_id,
    agentPhoneNumberId,
    TEST_MODE,
    echo_dynamic_vars: conversationInitiationClientData,
  });

  const call = await elClient.conversationalAi.twilio.outboundCall({
    agentId: agentRow.agent_id,
    agentPhoneNumberId: agentPhoneNumberId!,
    toNumber,
    conversationInitiationClientData,
  });

  let statusToken: string | null = null;
  let statusTokenHash: string | null = null;

  try {
    const conversationId = (call as any)?.conversationId as string | undefined;
    const callSid = (call as any)?.callSid as string | undefined;

    if (conversationId) {
      if (!options?.skipStatusToken) {
        const issued = issueStatusToken(conversationId, STATUS_TOKEN_SECRET);
        statusToken = issued.token;
        statusTokenHash = issued.hash;
      }

      await db
        .insert(callLogsTable)
        .values({
          conversation_id: conversationId,
          user_id: userId,
          agent_id: agentRow.agent_id,
          status: "call.started",
          to_number: toNumber,
          from_number: twilioPhoneNumber!,
          started_at: new Date(),
          metadata: {
            source: "outbound-route",
            twilio_call_sid: callSid ?? null,
            ...(statusTokenHash ? { status_token_hash: statusTokenHash } : {}),
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

  const leadName = `${firstName} ${lastName}`.trim() || "Unknown Lead";
  const agentNumber = twilioPhoneNumber ?? "";

  return {
    status: "initiated",
    conversationId: (call as any)?.conversationId ?? null,
    statusToken,
    calledNumber: toNumber,
    fromNumber: twilioPhoneNumber ?? "",
    leadName,
    leadEmail,
    agentNumber,
    dynamicVariables: dynamicVars,
    elevenlabsResponse: call,
    twilioCallSid: (call as any)?.callSid ?? null,
  };
};

