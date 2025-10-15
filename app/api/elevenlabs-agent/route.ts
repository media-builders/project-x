import { NextRequest, NextResponse } from "next/server";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { db } from "@/utils/db/db";
import { userAgentsTable, usersTable } from "@/utils/db/schema";
import { eq } from 'drizzle-orm';
import { createServerClient } from "@supabase/ssr";

export  async function POST( req: NextRequest) {
    try {
        const supabase = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
            {
              cookies: {
                getAll: () =>
                  req.cookies.getAll().map((cookie) => ({
                    name: cookie.name,
                    value: cookie.value,
                  })),
                setAll: (cookiesToSet) => {
                  cookiesToSet.forEach(({ name, value, options }) => {
                    req.cookies.set({ name, value, ...options });
                  });
                },
              },
            } 
        );

        const { data: {user}, error: authErr, } = await supabase.auth.getUser();

        if (authErr || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }
        
        if (!user.email) {
            return NextResponse.json({ error: "User email missing" }, { status: 400 });
        }

        const dbUser = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, user.email))
        .limit(1);

        if (!dbUser.length)
            return NextResponse.json({ error: "User not found in DB" }, { status: 404 });

        const userFirstName = dbUser[0].name.split(" ")[0] || "User";
        
        const userId = dbUser[0].id;

        const body = await req.json();
        const { voiceId, llmSettings } = body;
            
        const client = new ElevenLabsClient({
          //environment: "https://api.elevenlabs.io",
          apiKey: process.env.ELEVENLABS_API_KEY,
        });

        // Check if agent exists
        const existingAgent = await db 
            .select()
            .from(userAgentsTable)
            .where(eq(userAgentsTable.user_id, userId))
            .limit(1);
        let agentData;

        if (existingAgent.length === 0) {
            // Create new agent
            const agentName = `${userFirstName}'s Agent`;
            const createResponse = await client.conversationalAi.agents.create({
                name: agentName,
                llmSettings: llmSettings || undefined,
                conversationConfig: {
                // Required fields — you can adjust these as needed
                maxHistoryTokens: 5000, // maximum context size
                initialSystemPrompt: " ", // default prompt
                },
            } as any); 

            //Fetch Agent Info
            const fullAgent = await client.conversationalAi.agents.get(createResponse.agentId);
            agentData = {
                id: fullAgent.agentId ?? "unknown",
                name: fullAgent.name ?? agentName,
                voiceId,
                llmSettings,
            };

            //Save New Agent to User-Agents Table
            await db.insert(userAgentsTable).values({
                user_id: userId,
                agent_id: agentData.id,
            });
        } else {
                //When Agent already exists
            const agentId = existingAgent[0].agent_id;
            const fullAgent = await client.conversationalAi.agents.get(agentId);

            agentData = {
                id: fullAgent.agentId ?? "unknown",
                name: fullAgent.name,
                voiceId,
                llmSettings,
            };
        }

        return NextResponse.json({ agent: agentData }, { status: 200 });
        } catch (error) {
          console.error("Error in ElevenLabs route: ", error);
          return NextResponse.json({ error: "Failed to create or retrieve agent" }, { status: 500 });
        }
}