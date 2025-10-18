import { NextResponse } from "next/server";

const XI_API_KEY = process.env.ELEVENLABS_API_KEY!;
const ELEVEN_BASE = "https://api.elevenlabs.io/v1/convai";

/**
 * GET /api/elevenlabs-agent/debug
 * Options:
 *   ?q=<substring>    // filter by name (case-insensitive)
 *   ?raw=1            // return raw payload from ElevenLabs for inspection
 */
export async function GET(req: Request) {
  if (!XI_API_KEY) {
    return NextResponse.json({ error: "ELEVENLABS_API_KEY is not set" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").toLowerCase().trim();
  const raw = searchParams.get("raw") === "1";

  const res = await fetch(`${ELEVEN_BASE}/agents`, {
    headers: { "xi-api-key": XI_API_KEY },
    cache: "no-store",
  });

  const text = await res.text();
  let json: any;
  try {
    json = JSON.parse(text);
  } catch {
    return NextResponse.json({ error: `List failed: ${res.status} ${text}` }, { status: 500 });
  }

  if (raw) {
    // Return exactly what the API gave us to see real shapes/keys
    return NextResponse.json(json);
  }

  const agents = Array.isArray(json?.agents) ? json.agents : [];

  // Defensive extraction of id & name regardless of field naming
  const simplified = agents.map((a: any) => {
    const id =
      a?.id ??
      a?.agent_id ??
      a?.uuid ??
      a?.agent?.id ??
      a?.metadata?.id ??
      undefined;

    const name =
      a?.name ??
      a?.agent_name ??
      a?.agent?.name ??
      a?.metadata?.name ??
      "";

    const status = a?.status ?? a?.agent?.status ?? a?.metadata?.status ?? undefined;

    return { id, name, status, keys: Object.keys(a || {}) };
  });

  const filtered = q
    ? simplified.filter((a) => String(a.name || "").toLowerCase().includes(q))
    : simplified;

  return NextResponse.json({
    count: filtered.length,
    agents: filtered,
    note:
      "If id is still undefined, hit ?raw=1 to inspect the exact payload and tell me which field contains the id.",
  });
}
