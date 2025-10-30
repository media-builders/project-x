// /lib/supabase-client.ts
"use client";
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    realtime: {
      params: {
        // ✅ This must exist so the handshake includes the anon key
        apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      },
    },
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  }
);
