import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;
const WEBHOOK_SECRET = process.env.ELEVENLABS_CALENDAR_WEBHOOK_SECRET;

type RefreshTokenRow = {
  userId: string;
  refreshToken: string;
};

function first<T = any>(...vals: any[]): T | undefined {
  for (const v of vals) if (v !== undefined && v !== null) return v as T;
  return undefined;
}

function extractDyn(evt: any) {
  return (
    first(
      evt?.conversationInitiationClientData?.dynamicVariables,
      evt?.conversation_initiation_client_data?.dynamic_variables,
      evt?.data?.conversationInitiationClientData?.dynamicVariables,
      evt?.data?.conversation_initiation_client_data?.dynamic_variables,
      evt?.conversation?.client_data?.dynamic_variables,
      evt?.conversation?.client_data?.dynamicVariables,
      evt?.client_data?.dynamic_variables,
      evt?.metadata?.dynamic_variables,
      evt?.metadata?.dynamicVariables
    ) || {}
  );
}

function normalizeAttendees(input: any): { email: string }[] | undefined {
  if (!input) return undefined;

  let arr: any[];
  if (Array.isArray(input)) {
    arr = input;
  } else if (typeof input === "object" && typeof input.email === "string") {
    arr = [input];
  } else {
    arr = String(input).split(/[,;]/);
  }

  const attendees = arr
    .map((a) => {
      if (!a) return null;
      if (typeof a === "string") {
        const trimmed = a.trim();
        return trimmed ? { email: trimmed } : null;
      }
      if (typeof a === "object" && typeof a.email === "string") {
        const trimmed = a.email.trim();
        return trimmed ? { email: trimmed } : null;
      }
      return null;
    })
    .filter(Boolean) as { email: string }[];
  return attendees.length ? attendees : undefined;
}

type DateLike =
  | string
  | number
  | Date
  | {
      date?: string;
      dateTime?: string;
      datetime?: string;
      start?: string;
      timeZone?: string;
      timezone?: string;
    };

function normalizeInstant(input: DateLike | undefined) {
  if (!input) return undefined;

  const isAllDayDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);
  const toIso = (value: string | number | Date) => {
    try {
      const dt = new Date(value);
      if (isNaN(dt.getTime())) return undefined;
      return dt.toISOString();
    } catch {
      return undefined;
    }
  };

  if (typeof input === "string" || typeof input === "number" || input instanceof Date) {
    const asString = String(input);
    if (isAllDayDate(asString)) {
      return { date: asString };
    }
    const iso = toIso(asString);
    return iso ? { dateTime: iso } : undefined;
  }

  if (typeof input === "object") {
    const dateCandidate = first<string>(
      input.date,
      (input as any).start,
      (input as any).date_only
    );
    if (dateCandidate && isAllDayDate(dateCandidate)) {
      return { date: dateCandidate };
    }

    const dateTimeCandidate = first<string>(
      input.dateTime,
      (input as any).datetime,
      (input as any).date_time,
      (input as any).timestamp
    );
    const iso = dateTimeCandidate ? toIso(dateTimeCandidate) : undefined;
    const tz = first<string>(input.timeZone, (input as any).timezone, (input as any).time_zone);
    if (iso) {
      return tz ? { dateTime: iso, timeZone: tz } : { dateTime: iso };
    }
  }

  return undefined;
}

function coerceBoolean(value: any): boolean | undefined {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  if (typeof value === "string") {
    const lowered = value.trim().toLowerCase();
    if (["true", "1", "yes", "y", "on"].includes(lowered)) return true;
    if (["false", "0", "no", "n", "off"].includes(lowered)) return false;
  }
  return undefined;
}

async function loadRefreshToken({
  userId,
  email,
}: {
  userId?: string;
  email?: string;
}): Promise<RefreshTokenRow | null> {
  if (userId) {
    const row = await db
      .select({
        userId: usersTable.id,
        refreshToken: usersTable.google_refresh_token,
      })
      .from(usersTable)
      .where(eq(usersTable.id, userId))
      .limit(1);

    const match = row?.[0];
    if (match?.refreshToken) return match as RefreshTokenRow;
  }

  if (email) {
    const row = await db
      .select({
        userId: usersTable.id,
        refreshToken: usersTable.google_refresh_token,
      })
      .from(usersTable)
      .where(eq(usersTable.email, email))
      .limit(1);

    const match = row?.[0];
    if (match?.refreshToken) return match as RefreshTokenRow;
  }

  return null;
}

async function refreshGoogleAccessToken(row: RefreshTokenRow) {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error("Google OAuth client credentials are not configured.");
  }

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    refresh_token: row.refreshToken,
    grant_type: "refresh_token",
  });

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
    },
    body: params.toString(),
  });

  const text = await response.text();
  let payload: any = {};
  try {
    payload = JSON.parse(text);
  } catch {
    throw new Error(`Google token endpoint returned non-JSON payload: ${text}`);
  }

  if (!response.ok) {
    const errorDesc = payload?.error_description ?? payload?.error ?? "Unknown token error";
    throw new Error(`Google token refresh failed: ${errorDesc}`);
  }

  const accessToken = payload?.access_token as string | undefined;
  const rotatedRefreshToken = payload?.refresh_token as string | undefined;

  if (!accessToken) {
    throw new Error("Google token endpoint did not return an access token.");
  }

  if (rotatedRefreshToken && rotatedRefreshToken !== row.refreshToken) {
    await db
      .update(usersTable)
      .set({ google_refresh_token: rotatedRefreshToken })
      .where(eq(usersTable.id, row.userId));
  }

  return accessToken;
}

function buildEventPayload(evt: any, dyn: any) {
  const eventRaw =
    first(
      evt?.event,
      evt?.calendar_event,
      evt?.google_event,
      evt?.data?.event,
      evt?.payload?.event,
      dyn?.event,
      dyn?.calendar_event
    ) ?? {};

  const summary = first<string>(
    eventRaw.summary,
    eventRaw.title,
    eventRaw.name,
    evt?.summary,
    evt?.title,
    dyn?.summary,
    dyn?.title
  );

  const description = first<string>(
    eventRaw.description,
    evt?.description,
    dyn?.description
  );

  const location = first<string>(
    eventRaw.location,
    evt?.location,
    dyn?.location
  );

  const attendees = normalizeAttendees(
    first(eventRaw.attendees, evt?.attendees, dyn?.attendees)
  );

  const colorId = first<string>(eventRaw.colorId, eventRaw.color_id, dyn?.color_id);
  const visibility = first<string>(
    eventRaw.visibility,
    dyn?.visibility,
    evt?.visibility
  ) as "default" | "public" | "private" | undefined;

  const reminders = first<any>(eventRaw.reminders, dyn?.reminders);
  const recurrence = first<string[]>(eventRaw.recurrence, dyn?.recurrence);
  const notifyGuests = coerceBoolean(
    first(eventRaw.notifyGuests, evt?.notifyGuests, dyn?.notifyGuests)
  );

  const createConference = coerceBoolean(
    first(eventRaw.createConference, evt?.createConference, dyn?.createConference)
  );

  const startRaw = first<DateLike>(
    eventRaw.start,
    evt?.start,
    dyn?.start,
    dyn?.start_time
  );
  const endRaw = first<DateLike>(
    eventRaw.end,
    evt?.end,
    dyn?.end,
    dyn?.end_time
  );
  const durationMinutes = Number(
    first(
      eventRaw.durationMinutes,
      eventRaw.duration_min,
      evt?.durationMinutes,
      dyn?.durationMinutes,
      dyn?.duration_minutes
    ) ?? NaN
  );

  const start = normalizeInstant(startRaw);
  let end = normalizeInstant(endRaw);

  if (!end && start && !Number.isNaN(durationMinutes) && isFinite(durationMinutes)) {
    const baseDateTime = start.dateTime ?? (start.date ? `${start.date}T00:00:00.000Z` : undefined);
    if (baseDateTime) {
      const computed = new Date(baseDateTime);
      if (!isNaN(computed.getTime())) {
        computed.setMinutes(computed.getMinutes() + durationMinutes);
        end = {
          dateTime: computed.toISOString(),
          ...(start.timeZone ? { timeZone: start.timeZone } : {}),
        };
      }
    }
  }

  const calendarId = first<string>(
    eventRaw.calendarId,
    eventRaw.calendar_id,
    evt?.calendarId,
    evt?.calendar_id,
    evt?.calendar?.id,
    dyn?.calendar_id
  ) ?? "primary";

  const googleEventId = first<string>(
    eventRaw.googleEventId,
    eventRaw.google_event_id,
    eventRaw.id,
    evt?.googleEventId,
    evt?.google_event_id,
    dyn?.google_event_id
  );

  const conferenceDataFromPayload = first<any>(
    eventRaw.conferenceData,
    evt?.conferenceData,
    dyn?.conferenceData
  );

  const payload: any = {};
  if (summary) payload.summary = summary;
  if (description) payload.description = description;
  if (location) payload.location = location;
  if (attendees) payload.attendees = attendees;
  if (start) payload.start = start;
  if (end) payload.end = end;
  if (colorId) payload.colorId = colorId;
  if (visibility) payload.visibility = visibility;
  if (reminders) payload.reminders = reminders;
  if (recurrence) payload.recurrence = recurrence;
  if (conferenceDataFromPayload) payload.conferenceData = conferenceDataFromPayload;

  return {
    calendarId,
    googleEventId,
    notifyGuests,
    createConference: createConference ?? false,
    payload,
  };
}

export async function POST(req: NextRequest) {
  try {
    if (WEBHOOK_SECRET) {
      const provided =
        req.headers.get("x-elevenlabs-signature") ??
        req.headers.get("x-elevenlabs-secret") ??
        req.headers.get("x-webhook-secret");
      if (provided !== WEBHOOK_SECRET) {
        return NextResponse.json({ error: "Unauthorized webhook caller." }, { status: 401 });
      }
    }

    const evt = await req.json().catch(() => ({}));
    if (!evt || typeof evt !== "object") {
      return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
    }

    const dyn = extractDyn(evt);

    const userId = first<string>(
      evt?.user_id,
      evt?.userId,
      evt?.user?.id,
      evt?.user?.user_id,
      evt?.data?.user_id,
      dyn?.user_id,
      dyn?.system_user_id
    );

    const userEmail = first<string>(
      evt?.user?.email,
      evt?.email,
      evt?.user_email,
      dyn?.user_email
    );

    if (!userId && !userEmail) {
      return NextResponse.json(
        { error: "User identifier (user_id or email) is required." },
        { status: 400 }
      );
    }

    const refreshRow = await loadRefreshToken({ userId, email: userEmail });
    if (!refreshRow) {
      return NextResponse.json(
        { error: "No Google refresh token stored for the specified user." },
        { status: 400 }
      );
    }

    const accessToken = await refreshGoogleAccessToken(refreshRow);

    const { calendarId, googleEventId, notifyGuests, createConference, payload } = buildEventPayload(
      evt,
      dyn
    );

    if (!payload.start || !payload.summary) {
      return NextResponse.json(
        { error: "Missing required event fields (summary/start)." },
        { status: 400 }
      );
    }

    if (!payload.end) {
      return NextResponse.json(
        { error: "Missing required event end time or duration." },
        { status: 400 }
      );
    }

    if (
      createConference &&
      !payload.conferenceData?.createRequest &&
      !payload.conferenceData?.entryPoints
    ) {
      payload.conferenceData = {
        createRequest: {
          requestId: randomUUID(),
        },
      };
    }

    const baseUrl = `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(
      calendarId
    )}/events`;
    const searchParams = new URLSearchParams();
    if (notifyGuests !== undefined) {
      searchParams.set("sendUpdates", notifyGuests ? "all" : "none");
    }
    if (payload.conferenceData?.createRequest) {
      searchParams.set("conferenceDataVersion", "1");
    }

    const method = googleEventId ? "PATCH" : "POST";
    const url = googleEventId
      ? `${baseUrl}/${encodeURIComponent(googleEventId)}${
          searchParams.toString() ? `?${searchParams.toString()}` : ""
        }`
      : `${baseUrl}${searchParams.toString() ? `?${searchParams.toString()}` : ""}`;

    const googleResponse = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const googleText = await googleResponse.text();
    let googleJson: any = {};
    if (googleText) {
      try {
        googleJson = JSON.parse(googleText);
      } catch {
        console.warn("Google Calendar response was not JSON:", googleText.slice(0, 200));
      }
    }

    if (!googleResponse.ok) {
      const status = googleResponse.status;
      const message =
        (googleJson?.error?.message ??
          googleJson?.error_description ??
          googleJson?.error ??
          googleText) ||
        `Google Calendar API responded with ${status}`;
      return NextResponse.json({ error: message, status }, { status: 502 });
    }

    const finalEventId =
      googleJson?.id ??
      googleEventId ??
      googleResponse.headers.get("x-goog-resource-id") ??
      null;

    return NextResponse.json(
      {
        success: true,
        calendarId,
        eventId: finalEventId,
        sendUpdates: notifyGuests ? "all" : "none",
        google: googleJson,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[ElevenLabs Calendar Webhook] error:", error);
    return NextResponse.json(
      { error: error?.message ?? "Calendar webhook error" },
      { status: 500 }
    );
  }
}
