// app/api/elevenlabs-agent/route.ts
import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { db } from "@/utils/db/db";
import { userAgentsTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";

const XI_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVEN_BASE = "https://api.elevenlabs.io/v1/convai";
const TEMPLATE_AGENT_ID = process.env.ELEVENLABS_TEMPLATE_AGENT_ID;
const TEMPLATE_AGENT_NAME =
  process.env.ELEVENLABS_TEMPLATE_AGENT_NAME ?? "Sam — Real Estate Outbound Caller";

function supaFromRequest(req: NextRequest) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () =>
          req.cookies.getAll().map((c) => ({ name: c.name, value: c.value })),
        setAll: (cookiesToSet) => {
          cookiesToSet.forEach(({ name, value, options }) => {
            req.cookies.set({ name, value, ...options });
          });
        },
      },
    }
  );
}

async function getAgentById(id: string) {
  const res = await fetch(`${ELEVEN_BASE}/agents/${id}`, {
    headers: { "xi-api-key": XI_API_KEY },
    cache: "no-store",
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`GET /agents/${id} failed: ${res.status} ${text}`);
  }
  try {
    const json = JSON.parse(text);
    if (json && typeof json === "object") {
      if ("agent" in json) return json as { agent: any };
      return { agent: json } as { agent: any }; // normalize
    }
    throw new Error("Unexpected JSON type");
  } catch {
    throw new Error(`GET /agents/${id} returned non-JSON: ${text}`);
  }
}

async function listAgents() {
  const res = await fetch(`${ELEVEN_BASE}/agents`, {
    headers: { "xi-api-key": XI_API_KEY },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`List agents failed: ${res.status} ${await res.text()}`);
  return res.json(); // { agents: [...] }
}

// 
function resolveAgentId(a: any): string | undefined {
  return (
    a?.id ??
    a?.agent_id ??
    a?.uuid ??
    a?.agent?.id ??
    a?.metadata?.id ??
    undefined
  );
}
function resolveAgentIdFromAny(o: any): string | undefined {
  if (!o || typeof o !== "object") return undefined;
  return (
    o.id ??
    o.agent_id ??
    o.uuid ??
    o?.agent?.id ??
    o?.agent?.agent_id ??
    o?.metadata?.id ??
    undefined
  );
}
function resolveAgentNameFromAny(o: any): string | undefined {
  if (!o || typeof o !== "object") return undefined;
  return o.name ?? o?.agent?.name ?? o?.metadata?.name ?? undefined;
}

function toPossessive(name: string) {
  const n = (name || "").trim();
  if (!n) return "Agent";
  return n.endsWith("s") || n.endsWith("S") ? `${n}' Agent` : `${n}'s Agent`;
}
function extractFirstNameFromUser(user: any): string | undefined {
  const m = user?.user_metadata || {};
  const candidates = [
    m.given_name,
    m.first_name,
    m.givenName,
    m.firstName,
    (m.full_name || m.name)?.split?.(" ")?.[0],
  ].filter(Boolean);
  if (candidates.length) return String(candidates[0]);
  const email = user?.email as string | undefined;
  if (email && email.includes("@")) return email.split("@")[0];
  return undefined;
}

// Prefer ID via env; otherwise exact name match from list, then fetch full agent by ID.
async function getTemplateAgent() {
  if (!XI_API_KEY) throw new Error("ELEVENLABS_API_KEY is not set");

  // 1) Try exact ID
  if (TEMPLATE_AGENT_ID) {
    const byId = await getAgentById(TEMPLATE_AGENT_ID);
    if (byId?.agent) return byId.agent;
    console.warn("Template ID lookup failed; falling back to name match.");
  }

  // 2) Fallback: exact name match
  const list = await listAgents();
  const targetName = (TEMPLATE_AGENT_NAME ?? "").trim();
  const found = list?.agents?.find(
    (a: any) => String(a?.name ?? "").trim() === targetName
  );
  if (!found) {
    throw new Error(
      `Template agent not found (id=${TEMPLATE_AGENT_ID ?? "unset"}, name="${targetName}")`
    );
  }

  const foundId = resolveAgentId(found);
  if (!foundId) {
    throw new Error(
      `Template agent listed but missing ID field; keys=${Object.keys(found || {}).join(", ")}`
    );
  }

  const full = await getAgentById(foundId);
  if (!full?.agent) {
    throw new Error(`Failed to fetch full template agent for id=${foundId}`);
  }
  return full.agent;
}

// Copy only writable fields for create/patch payloads
function buildAgentPayloadFromTemplate(template: any) {
  const promptObj =
    template?.prompt && typeof template.prompt === "object"
      ? { prompt: template.prompt.prompt ?? "" }
      : template?.prompt
      ? { prompt: String(template.prompt) }
      : undefined;

  const payload: Record<string, any> = {};
  if (template?.name) payload.name = template.name;
  if (promptObj) payload.prompt = promptObj;
  if (template?.first_message) payload.first_message = template.first_message;
  if (template?.language) payload.language = template.language;
  if (template?.tts) payload.tts = template.tts;
  if (template?.conversation_config) payload.conversation_config = template.conversation_config;
  if (Array.isArray(template?.agent_tools)) payload.agent_tools = template.agent_tools;
  if (Array.isArray(template?.server_tools)) payload.server_tools = template.server_tools;
  if (Array.isArray(template?.client_tools)) payload.client_tools = template.client_tools;
  if (template?.knowledge_base) payload.knowledge_base = template.knowledge_base;
  if (template?.content_filters) payload.content_filters = template.content_filters;
  return payload;
}

async function createAgentFromTemplate(template: any, nameOverride?: string) {
  const body = buildAgentPayloadFromTemplate(template);
  if (nameOverride) body.name = nameOverride;

  const res = await fetch(`${ELEVEN_BASE}/agents/create`, {
    method: "POST",
    headers: {
      "xi-api-key": XI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Create agent failed: ${res.status} ${await res.text()}`);
  return res.json(); // could be { agent: {...} } or other shape
}

async function updateAgentFromTemplate(agentId: string, template: any, nameOverride?: string) {
  const body = buildAgentPayloadFromTemplate(template);
  if (nameOverride) body.name = nameOverride; // allow rename on update too

  const res = await fetch(`${ELEVEN_BASE}/agents/${agentId}`, {
    method: "PATCH",
    headers: {
      "xi-api-key": XI_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`Update agent failed: ${res.status} ${await res.text()}`);
  return res.json(); // PATCH may return {}, or agent object, etc.
}

// ===== Route handler =====
export async function POST(req: NextRequest) {
  try {
    const supabase = supaFromRequest(req);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Body: { agentId?, nameOverride? } but we'll also derive name by default
    const body = await req.json().catch(() => ({} as any));
    let agentIdFromBody = body.agentId as string | undefined;

    // Derive FIRSTNAME's Agent if no explicit override was provided
    let nameOverride = (body.nameOverride as string | undefined) ?? undefined;
    if (!nameOverride) {
      const first = extractFirstNameFromUser(user);
      if (first) nameOverride = toPossessive(first); // e.g., "Rania's Agent"
    }

    // 0) Check if THIS USER already has an agent bound in DB
    const existing = await db
      .select({
        user_id: userAgentsTable.user_id,
        agent_id: userAgentsTable.agent_id,
      })
      .from(userAgentsTable)
      .where(eq(userAgentsTable.user_id, user.id))
      .limit(1);

    const alreadyBoundAgentId = existing?.[0]?.agent_id;
    const effectiveAgentId = agentIdFromBody ?? alreadyBoundAgentId;

    // 1) Load template (single source of truth)
    const templateAgent = await getTemplateAgent();

    // 2) Branch: UPDATE if we have an existing agent ID, else CREATE a new one
    let result: any;
    let finalAgentId: string | undefined;
    if (effectiveAgentId) {
      // UPDATE existing agent to match the template (and optionally rename)
      result = await updateAgentFromTemplate(effectiveAgentId, templateAgent, nameOverride);

      // Prefer the known ID; PATCH responses can be empty / omit id
      finalAgentId =
        effectiveAgentId ??
        resolveAgentIdFromAny(result) ??
        resolveAgentIdFromAny(result?.agent);
    } else {
      // CREATE a brand-new per-user agent
      result = await createAgentFromTemplate(templateAgent, nameOverride);
      finalAgentId =
        resolveAgentIdFromAny(result) ?? resolveAgentIdFromAny(result?.agent);

      // FINAL FALLBACK: try to locate by name we just used
      if (!finalAgentId) {
        const targetName = (nameOverride ?? templateAgent?.name ?? "").trim();
        if (targetName) {
          try {
            const list = await listAgents();
            const found = list?.agents?.find(
              (a: any) => String(a?.name ?? "").trim() === targetName
            );
            finalAgentId = resolveAgentIdFromAny(found);
          } catch (e) {
            console.warn("Fallback listAgents lookup failed:", e);
          }
        }
      }
    }

    if (!finalAgentId) {
      console.warn("Agent API raw result keys:", Object.keys(result || {}));
      console.warn("Nested agent keys:", Object.keys(result?.agent || {}));
      const maybeName =
        resolveAgentNameFromAny(result) ?? resolveAgentNameFromAny(result?.agent);
      throw new Error(
        `Agent operation succeeded but no agent id was returned. name=${JSON.stringify(maybeName)}`
      );
    }

    // 3) Normalize the agent object for response (fetch if not present)
    let finalAgentObj = result?.agent;
    if (!finalAgentObj) {
      const fetched = await getAgentById(finalAgentId);
      finalAgentObj = fetched?.agent;
      if (!finalAgentObj) {
        throw new Error(`Created/updated agent ${finalAgentId} but failed to fetch it back`);
      }
    }

    // 4) Upsert binding in DB (userAgentsTable unique on user_id)
    await db
      .insert(userAgentsTable)
      .values({
        user_id: user.id,
        agent_id: finalAgentId,
      })
      .onConflictDoUpdate({
        target: userAgentsTable.user_id,
        set: { agent_id: finalAgentId },
      });

    return NextResponse.json({
      action: effectiveAgentId ? "updated" : "created",
      agent: finalAgentObj,
      bound_to_user: user.id,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Agent upsert failed" },
      { status: 500 }
    );
  }
}
