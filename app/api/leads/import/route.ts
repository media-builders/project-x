import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/utils/db/db";
import { usersTable, leadsTable } from "@/utils/db/schema";
import { eq, and } from "drizzle-orm";

const s = (x: unknown) => (typeof x === "string" ? x : "");

// helpers to pull primary/first values from arrays
function primaryFrom(arr: any[] | undefined, key: "value"): string {
  if (!Array.isArray(arr) || arr.length === 0) return "";
  const primary = arr.find((e) => e?.isPrimary && s(e[key]));
  return s(primary?.[key]) || s(arr[0]?.[key]) || "";
}

// build Authorization header
function authHeader(rawKey: string) {
  const basic = Buffer.from(`${rawKey.trim()}:`).toString("base64");
  return `Basic ${basic}`;
}

export async function POST(req: NextRequest) {
  try {
    let stages: string[] | undefined = undefined;
    try {
      const body = await req.json();
      stages = Array.isArray(body?.stages) ? body.stages : undefined;
    } catch {
      // no JSON body -> fine, treat as import all
    }
    const wanted = (stages ?? []).map((x) => x.toLowerCase());

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll: () => req.cookies.getAll().map(c => ({ name: c.name, value: c.value })),
          setAll: (cookiesToSet) => {
            cookiesToSet.forEach(({ name, value, options }) => {
              req.cookies.set({ name, value, ...options });
            });
          },
        },
      }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { 0: profile } = await db
      .select({ crm_api_key: usersTable.crm_api_key })
      .from(usersTable)
      .where(eq(usersTable.id, user.id))
      .limit(1);

    const apiKey = profile?.crm_api_key?.trim();
    if (!apiKey) {
      return NextResponse.json({ error: "No CRM API Key saved" }, { status: 400 });
    }

    // fetch stages once -> map id->name
    const stagesRes = await fetch("https://api.followupboss.com/v1/stages", {
      headers: { 
        Authorization: authHeader(apiKey), 
        Accept: "application/json" 
      },
      method: "GET",
    });
    const stageMap = new Map<number, string>();
    if (stagesRes.ok) {
      const stagesJson = await stagesRes.json();
      (stagesJson?.stages || []).forEach((st: any) => {
        if (st?.id != null && typeof st?.name === "string") {
          stageMap.set(Number(st.id), st.name);
        }
      });
    } else {
      console.warn("FUB /stages failed:", stagesRes.status);
    }

    // Fetch people from FUB
    // If your FUB plan supports query filtering by stage, you can append query params.
    const basic = Buffer.from(`${apiKey}:`).toString("base64");
    const res = await fetch("https://api.followupboss.com/v1/people", {
      headers: {
        Authorization: `Basic ${basic}`,
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      method: "GET",
    });

    if (res.status === 401) {
      // Return a helpful message when auth fails
      const msg = await res.text().catch(() => "");
      return NextResponse.json(
        {
          error:
            "FollowUpBoss authentication failed (401). Ensure your API key is correct and the Authorization header is Basic base64('<API_KEY>:').",
          detail: msg,
        },
        { status: 502 }
      );
    }

    if (!res.ok) {
      const msg = await res.text().catch(() => "");
      return NextResponse.json({ error: `FUB error ${res.status}: ${msg}` }, { status: 502 });
    }

    const body = await res.json();
    const people: any[] = Array.isArray(body?.people) ? body.people : body?.items || [];

    let count = 0;
    for (const p of people) {
      const fubId = typeof p?.id === "number" ? p.id : null;

      const first = s(p?.firstName) || s(p?.first_name);
      const last  = s(p?.lastName)  || s(p?.last_name);
      const email = primaryFrom(p?.emails, "value"); 
      const phone = primaryFrom(p?.phones, "value"); 

      // resolve stage
      let stage: string | null = null;
      if (typeof p?.stage === "string" && p.stage.trim()) {
        stage = p.stage.trim();
      } else if (p?.stageId != null) {
        const nm = stageMap.get(Number(p.stageId));
        stage = nm ?? null;
      }

      //if user selected stage filters, skip people whose stage doesn’t match
      if (wanted.length) {
        const stLower = (stage || "").toLowerCase();
        if (!stLower || !wanted.includes(stLower)) continue;
      }

      if (!first && !last) continue;

      // [UPSERT-ish] check by (user_id, fub_id)
      const existing = await db.select().from(leadsTable)
        .where(and(eq(leadsTable.user_id, user.id), eq(leadsTable.fub_id, fubId as any)))
        .limit(1);

      if (existing.length) {
        await db.update(leadsTable)
          .set({ first, last, email, phone, stage, updated_at: new Date() })
          .where(eq(leadsTable.id, existing[0].id));
      } else {
        await db.insert(leadsTable).values({
          id: crypto.randomUUID(),
          user_id: user.id,
          fub_id: fubId,
          first,
          last,
          email,
          phone,
          stage,
          created_at: new Date(),
          updated_at: new Date(),
        });
      }
      count++;
    }

    return NextResponse.json({ ok: true, count }, { status: 200 });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ error: e?.message ?? "Import failed" }, { status: 500 });
  }
}
