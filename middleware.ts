// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const PUBLIC_FILE = /\.(.*)$/i;

// Webhook & public API paths that must NEVER be auth-redirected
const PUBLIC_API_PREFIXES = [
  "/api/outbound-calls/webhook",              // ElevenLabs unified webhook (init + post-call)
  "/api/elevenlabs/webhook",                  // (alt path if you switch later)
  "/api/elevenlabs-agent/twilio-call-inspect",
  "/api/twilio-call-inspect",
];

// Public pages (no auth)
const PUBLIC_PAGES = ["/", "/login", "/signup", "/privacy", "/terms"];

function startsWithAny(pathname: string, prefixes: string[]) {
  return prefixes.some((p) => pathname.startsWith(p));
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1) Let Next serve static assets & files directly
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon.ico") ||
    PUBLIC_FILE.test(pathname)
  ) {
    return NextResponse.next();
  }

  // 2) Always allow preflight
  if (req.method === "OPTIONS") {
    return NextResponse.next();
  }

  // 3) Bypass auth for webhook + public API endpoints
  if (startsWithAny(pathname, PUBLIC_API_PREFIXES)) {
    return NextResponse.next();
  }

  // 4) Allow explicitly public pages
  if (PUBLIC_PAGES.includes(pathname)) {
    return NextResponse.next();
  }

  // 5) Everything else requires Supabase auth via @supabase/ssr
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // read cookies from the request
        getAll: () =>
          req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        // write any auth cookie updates to the response
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirectedFrom", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return res;
}

export const config = {
  matcher: [],
};