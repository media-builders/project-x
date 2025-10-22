import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import { fetchFUBLeads } from "@/utils/fub";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name) {
            return cookieStore.get(name)?.value;
          },
          set(name, value, options) {
            try {
              cookieStore.set({ name, value, ...options });
            } catch {}
          },
          remove(name, options) {
            try {
              cookieStore.set({ name, value: "", ...options });
            } catch {}
          },
        },
      }
    );

    const {
      data: { user },
      error: authErr,
    } = await supabase.auth.getUser();

    if (authErr || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!user.email) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    const userRow = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, user.email))
      .limit(1);
    const crmKey = userRow[0]?.crm_api_key;

    if (!crmKey) {
      return NextResponse.json(
        {
          error:
            "No API key found. Please enter an API key in the Settings tab before importing again.",
        },
        { status: 400 }
      );
    }

    const leads = await fetchFUBLeads(crmKey);
    const uniqueStages = Array.from(
      new Set(
        leads
          .map((lead) => lead.stage?.trim())
          .filter(
            (stage): stage is string => typeof stage === "string" && stage.length > 0
          )
      )
    ).sort((a, b) => a.localeCompare(b));

    return NextResponse.json({ stages: uniqueStages }, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch stages" },
      { status: 500 }
    );
  }
}
