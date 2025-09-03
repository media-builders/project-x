import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
    const supabase = createClient()

    // Check if a user's logged in
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (user) {
        await supabase.auth.signOut()
    }

    revalidatePath('/', 'layout')
    return NextResponse.redirect(new URL('/login', req.url), {
        status: 302,
    })
}


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
