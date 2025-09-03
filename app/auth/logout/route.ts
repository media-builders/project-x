// app/auth/logout/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

/**
 * GET /auth/logout
 * Invalidates Supabase session and redirects to /login.
 */
export async function GET() {
  const supabase = createClient();
  await supabase.auth.signOut();

  const base =
    process.env.NEXT_PUBLIC_WEBSITE_URL?.replace(/\/+$/, "") ||
    "https://project-x-gamma-five.vercel.app/";
  return NextResponse.redirect(new URL("/login", base));
}
