import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

const GOOGLE_CLIENT_ID = process.env.GOOGLE_OAUTH_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_OAUTH_CLIENT_SECRET;

export async function POST(request: Request) {
  try {
    // 🧩 Log cookie info (diagnostic)
    const cookieHeader = request.headers.get("cookie");
    if (process.env.NODE_ENV === "development") {
      console.log("🍪 Cookie header present:", !!cookieHeader);
      if (!cookieHeader) {
        console.warn(
          "[⚠️] No cookies detected. Make sure fetch() includes credentials: 'include'"
        );
      }
    }

    // 🧪 Verify Google OAuth environment variables
    if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
      console.error("❌ Missing Google OAuth credentials.");
      return NextResponse.json(
        { error: "Google OAuth client credentials are not configured." },
        { status: 500 }
      );
    }

    // 🔐 Initialize Supabase with SSR cookie store
    const supabase = createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      console.error("🚫 Unauthorized request: Supabase session invalid.", authError);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (process.env.NODE_ENV === "development") {
      console.log("[🔐] Token refresh requested by user ID:", user.id);
      console.log("[📧] User email:", user.email);
    }

    // 🔍 Query refresh token from database by user ID
    const [rowById] = await db
      .select({
        refreshToken: usersTable.google_refresh_token,
        userId: usersTable.id,
      })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    let refreshToken = rowById?.refreshToken;
    let targetUserId = rowById?.userId ?? null;

    // 🧩 Fallback lookup by email (in case Supabase ID mismatch)
    if (!refreshToken && user.email) {
      const [rowByEmail] = await db
        .select({
          refreshToken: usersTable.google_refresh_token,
          userId: usersTable.id,
        })
        .from(usersTable)
        .where(eq(usersTable.email, user.email))
        .limit(1);

      if (rowByEmail?.refreshToken) {
        refreshToken = rowByEmail.refreshToken;
        targetUserId = rowByEmail.userId;
        console.log(
          "[🔁] Refresh token resolved via email fallback:",
          rowByEmail.userId
        );
      }
    }

    if (!refreshToken || !targetUserId) {
      console.warn("[⚠️] No stored Google refresh token for user:", user.id);
      return NextResponse.json(
        { error: "No Google refresh token stored for this user." },
        { status: 400 }
      );
    }

    // ✅ Prepare Google OAuth token refresh payload
    const params = new URLSearchParams({
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    });

    const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
      },
      body: params.toString(),
    });

    const rawText = await tokenResponse.text();
    let payload: any = {};

    try {
      payload = JSON.parse(rawText);
    } catch (e) {
      console.error("[❌] Invalid JSON from Google token endpoint:", rawText);
    }

    if (!tokenResponse.ok) {
      const errorDesc =
        payload?.error_description || payload?.error || "Unknown token error";

      // Handle invalid or revoked refresh tokens
      if (
        tokenResponse.status === 400 &&
        typeof payload?.error === "string" &&
        payload.error.toLowerCase() === "invalid_grant"
      ) {
        await db
          .update(usersTable)
          .set({ google_refresh_token: null })
          .where(eq(usersTable.id, targetUserId));
        console.warn(`[🚫] Invalid refresh token. Cleared for user: ${targetUserId}`);
      }

      return NextResponse.json(
        { error: errorDesc },
        { status: tokenResponse.status }
      );
    }

    // 🎟️ Extract tokens
    const accessToken = payload.access_token as string;
    const expiresIn = payload.expires_in as number;
    const rotatedRefreshToken = payload.refresh_token as string | undefined;

    if (!accessToken) {
      console.error("[❌] No access_token returned from Google.");
      return NextResponse.json(
        { error: "Google did not return an access token." },
        { status: 500 }
      );
    }

    // 🔄 Rotate refresh token if updated
    if (rotatedRefreshToken && rotatedRefreshToken !== refreshToken) {
      await db
        .update(usersTable)
        .set({ google_refresh_token: rotatedRefreshToken })
        .where(eq(usersTable.id, targetUserId));
      console.log("[🔄] Rotated refresh token stored for user:", targetUserId);
    }

    const maskedToken =
      accessToken.length > 12
        ? `${accessToken.slice(0, 6)}…${accessToken.slice(-6)}`
        : accessToken;

    if (process.env.NODE_ENV === "development") {
      console.log("[✅] Google access token issued (masked):", maskedToken);
    }

    // 🧾 Return token payload
    return NextResponse.json({
      accessToken,
      expiresIn,
      rotated: Boolean(rotatedRefreshToken && rotatedRefreshToken !== refreshToken),
    });
  } catch (error: any) {
    console.error("[💥] /api/google/token refresh error:", error?.stack ?? error);
    return NextResponse.json(
      { error: error?.message ?? "Unexpected error refreshing Google token." },
      { status: 500 }
    );
  }
}
