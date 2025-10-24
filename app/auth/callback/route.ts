import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { createStripeCustomer } from "@/utils/stripe/api";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/dashboard"; // default redirect

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  // ✅ Proper Supabase client for route handlers (writes cookies)
  const supabase = createRouteHandlerClient({ cookies });

  // Exchange the code for a Supabase session
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

  if (exchangeError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/callback] exchange error:", exchangeError);
    }
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  // Fetch the authenticated user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user?.email) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/callback] getUser error:", userError);
    }
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  // Retrieve the full session (to extract provider_refresh_token)
  const { data: sessionData, error: sessionError } = await supabase.auth.getSession();

  if (sessionError && process.env.NODE_ENV === "development") {
    console.error("[auth/callback] getSession error:", sessionError);
  }

  const session = sessionData?.session;
  const providerRefreshToken = session?.provider_refresh_token ?? null;

  if (process.env.NODE_ENV === "development") {
    console.log("🔐 Supabase session:", JSON.stringify(sessionData, null, 2));
    console.log("🔁 provider_refresh_token detected:", !!providerRefreshToken);
  }

  // --- 🔸 Check if user exists in DB ---
  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, user.email))
    .limit(1);

  if (existingUser) {
    // Update Google refresh token if available
    if (providerRefreshToken) {
      const updated = await db
        .update(usersTable)
        .set({ google_refresh_token: providerRefreshToken })
        .where(eq(usersTable.email, user.email))
        .returning({
          id: usersTable.id,
          refresh: usersTable.google_refresh_token,
        });

      if (process.env.NODE_ENV === "development") {
        console.log("🧾 Updated user row:", updated);
      }
    } else if (process.env.NODE_ENV === "development") {
      console.log("ℹ️ Existing user found but no provider_refresh_token; keeping previous value.");
    }
  } else {
    // --- 🔸 New user: create Stripe customer + DB record ---
    const stripeID = await createStripeCustomer(
      user.id,
      user.email,
      user.user_metadata.full_name
    );

    const inserted = await db
      .insert(usersTable)
      .values({
        id: user.id,
        name: user.user_metadata.full_name,
        email: user.email,
        stripe_id: stripeID,
        plan: "none",
        google_refresh_token: providerRefreshToken,
      })
      .returning({
        id: usersTable.id,
        refresh: usersTable.google_refresh_token,
      });

    if (process.env.NODE_ENV === "development") {
      console.log("🧾 Inserted new user row:", inserted);
    }
  }

  // --- 🔸 Redirect logic ---
  const forwardedHost = request.headers.get("x-forwarded-host");
  const targetURL =
    process.env.NODE_ENV === "development"
      ? `${origin}${next}`
      : forwardedHost
      ? `https://${forwardedHost}${next}`
      : `${origin}${next}`;

  return NextResponse.redirect(targetURL);
}
