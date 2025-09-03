// app/auth/logout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /auth/logout
 * Server route to invalidate the Supabase session and redirect to /login.
 * Keeps secrets on the server; safe to link from any page (client or server).
 */
export async function GET() {
  const supabase = createClient();
  // clear session cookies
  await supabase.auth.signOut();
  // Redirect to the login screen after logout
  return NextResponse.redirect(new URL("/login", process.env.NEXT_PUBLIC_WEBSITE_URL || "https://project-x-gamma-five.vercel.app/"));
}
