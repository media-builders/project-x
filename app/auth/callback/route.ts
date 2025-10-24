import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { createStripeCustomer } from "@/utils/stripe/api";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (!code) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const supabase = createClient();
  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
    code
  );

  if (exchangeError) {
    if (process.env.NODE_ENV === "development") {
      console.error("[auth/callback] exchange error:", exchangeError);
    }
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(`${origin}/auth/auth-code-error`);
  }

  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData?.session;
  const providerRefreshToken = session?.provider_refresh_token ?? null;

  if (process.env.NODE_ENV === "development") {
    console.log("🔐 Supabase session:", JSON.stringify(sessionData, null, 2));
    console.log("🔁 provider_refresh_token detected:", !!providerRefreshToken);
  }

  const [existingUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, user.email))
    .limit(1);

  if (existingUser) {
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
      console.log(
        "ℹ️ Existing user found but no provider_refresh_token; keeping previous value."
      );
    }
  } else {
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
      console.log("🧾 Inserted user row:", inserted);
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";

  if (isLocalEnv) {
    return NextResponse.redirect(`${origin}${next}`);
  }

  if (forwardedHost) {
    return NextResponse.redirect(`https://${forwardedHost}${next}`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
