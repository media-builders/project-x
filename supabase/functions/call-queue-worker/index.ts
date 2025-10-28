import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ---------- Initialization ----------
const WORKER_ID = crypto.randomUUID();
console.log(`[Worker:${WORKER_ID}] Booting Queue Worker...`);
const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const queueApiUrl = Deno.env.get("QUEUE_API_URL");
const queueApiKey = Deno.env.get("QUEUE_API_KEY");
if (!supabaseUrl || !serviceKey || !queueApiUrl || !queueApiKey) {
  console.error(`[Worker:${WORKER_ID}] ❌ Missing required environment variables`);
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QUEUE_API_URL, or QUEUE_API_KEY");
}
console.log(`[Worker:${WORKER_ID}] ✅ Environment variables loaded`);
const supabase = createClient(supabaseUrl, serviceKey);
const sleep = (ms)=>new Promise((res)=>setTimeout(res, ms));
const RUNNING_JOB_STALE_MS = 30_000;
// ---------- Helper: touch running job (quiet logs) ----------
let lastHeartbeatLog = 0;
async function touchRunningJob(jobId) {
  try {
    const { error } = await supabase.from("call_queue_jobs").update({
      updated_at: new Date().toISOString()
    }).eq("id", jobId).eq("status", "running").eq("worker_id", WORKER_ID);
    const now = Date.now();
    if (!error && now - lastHeartbeatLog > 30_000) {
      console.log(`[Worker:${WORKER_ID}] 🔄 Refreshed heartbeat for job ${jobId}`);
      lastHeartbeatLog = now;
    }
  } catch (err) {
    console.error(`[Worker:${WORKER_ID}] touchRunningJob error:`, err);
  }
}
// ---------- Helper: poll conversation ----------
async function pollConversation(conversationId, jobId) {
  console.log(`[Worker:${WORKER_ID}] 🕓 Polling conversation ${conversationId} for job ${jobId}`);
  const timeoutAt = Date.now() + 10 * 60_000; // 10 minutes
  while(Date.now() < timeoutAt){
    const { data, error } = await supabase.from("call_logs").select("status, ended_at").eq("conversation_id", conversationId).maybeSingle();
    if (error) {
      console.error(`[Worker:${WORKER_ID}] poll error:`, error);
      await touchRunningJob(jobId);
      await sleep(4000);
      continue;
    }
    const status = data?.status ?? null;
    const ended = data?.ended_at ?? null;
    let hasEnded = false;
    if (ended instanceof Date) {
      hasEnded = Number.isFinite(ended.getTime());
    } else if (typeof ended === "string") {
      hasEnded = Number.isFinite(new Date(ended).getTime());
    }
    if (hasEnded) {
      console.log(`[Worker:${WORKER_ID}] ✅ Conversation ${conversationId} ended with status: ${status}`);
      return status && status !== "call.started" ? status : "call.ended";
    }
    if (status && status !== "call.started") {
      console.log(`[Worker:${WORKER_ID}] Conversation ${conversationId} status changed: ${status}`);
      return status;
    }
    await touchRunningJob(jobId);
    await sleep(4000);
  }
  console.warn(`[Worker:${WORKER_ID}] ⚠️ Conversation ${conversationId} polling timed out`);
  throw new Error("Call status polling timed out");
}
// ---------- Main Worker ----------
Deno.serve(async ()=>{
  console.log(`[Worker:${WORKER_ID}] --- Invocation start ---`);
  const now = Date.now();
  const nowIso = new Date(now).toISOString();
  let job = null;
  // 1️⃣ Atomic claim: oldest PENDING job
  console.log(`[Worker:${WORKER_ID}] Attempting to claim PENDING job...`);
  let claim1 = await supabase.from("call_queue_jobs").update({
    status: "running",
    worker_id: WORKER_ID,
    updated_at: nowIso
  }).eq("status", "pending").order("created_at", {
    ascending: true
  }).limit(1).select("*").single();
  if (claim1.error && claim1.error.code !== "PGRST116") {
    console.error(`[Worker:${WORKER_ID}] ❌ Claim PENDING failed:`, claim1.error);
    return new Response("claim error", {
      status: 500
    });
  }
  if (claim1.data) {
    job = claim1.data;
    console.log(`[Worker:${WORKER_ID}] ✅ Claimed PENDING queue user=${job.user_id} queue_id=${job.id} leads=${job.total_leads}`);
  }
  // 2️⃣ If none, atomic claim: oldest SCHEDULED job ready to run (scheduled_start_at <= now)
  if (!job) {
    console.log(`[Worker:${WORKER_ID}] No PENDING jobs; attempting to claim SCHEDULED-ready job...`);
    const claim2 = await supabase.from("call_queue_jobs").update({
      status: "running",
      worker_id: WORKER_ID,
      updated_at: nowIso
    }).eq("status", "scheduled").lte("scheduled_start_at", nowIso).order("scheduled_start_at", {
      ascending: true
    }).limit(1).select("*").single();
    if (claim2.error && claim2.error.code !== "PGRST116") {
      console.error(`[Worker:${WORKER_ID}] ❌ Claim SCHEDULED-ready failed:`, claim2.error);
      return new Response("claim error", {
        status: 500
      });
    }
    if (claim2.data) {
      job = claim2.data;
      console.log(`[Worker:${WORKER_ID}] ✅ Claimed SCHEDULED-ready queue user=${job.user_id} queue_id=${job.id} leads=${job.total_leads}`);
    }
  }
  // 3️⃣ If still none, try to reclaim a stale RUNNING job
  if (!job) {
    console.log(`[Worker:${WORKER_ID}] No ready jobs found; checking for STALE running jobs...`);
    const staleThreshold = new Date(now - RUNNING_JOB_STALE_MS).toISOString();
    const reclaim = await supabase.from("call_queue_jobs").update({
      updated_at: nowIso,
      worker_id: WORKER_ID
    }).eq("status", "running").lt("updated_at", staleThreshold).order("updated_at", {
      ascending: true
    }).limit(1).select("*").single();
    if (reclaim.error && reclaim.error.code !== "PGRST116") {
      console.error(`[Worker:${WORKER_ID}] ❌ Stale reclaim failed:`, reclaim.error);
      return new Response("reclaim error", {
        status: 500
      });
    }
    if (reclaim.data) {
      job = reclaim.data;
      console.log(`[Worker:${WORKER_ID}] ♻️ Reclaimed STALE job user=${job.user_id} queue_id=${job.id} leads=${job.total_leads}`);
    }
  }
  // 4️⃣ No job available at all
  if (!job) {
    console.log(`[Worker:${WORKER_ID}] No jobs ready`);
    return new Response("no jobs ready", {
      status: 200
    });
  }
  // 5️⃣ If scheduled for the future (race), put back to scheduled
  const scheduledStart = job.scheduled_start_at ? new Date(job.scheduled_start_at).getTime() : null;
  if (scheduledStart && scheduledStart > now) {
    console.log(`[Worker:${WORKER_ID}] Job ${job.id} is scheduled in the future; parking it`);
    await supabase.from("call_queue_jobs").update({
      status: "scheduled",
      updated_at: new Date().toISOString()
    }).eq("id", job.id).eq("worker_id", WORKER_ID);
    return new Response("scheduled future start", {
      status: 200
    });
  }
  // 6️⃣ Process leads sequentially
  let initiated = job.initiated ?? 0;
  let completed = job.completed ?? 0;
  let failed = job.failed ?? 0;
  console.log(`[Worker:${WORKER_ID}] 🚀 Starting job ${job.id} with ${job.total_leads} leads...`);
  for(let idx = job.current_index ?? 0; idx < job.total_leads; idx++){
    const lead = job.lead_snapshot?.[idx];
    if (!lead) continue;
    console.log(`[Worker:${WORKER_ID}] ▶️ Lead ${idx + 1}/${job.total_leads} starting...`);
    await supabase.from("call_queue_jobs").update({
      current_index: idx,
      current_lead: lead,
      updated_at: new Date().toISOString()
    }).eq("id", job.id).eq("worker_id", WORKER_ID);
    try {
      const response = await fetch(queueApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-queue-key": queueApiKey
        },
        body: JSON.stringify({
          user_id: job.user_id,
          leads: [
            lead
          ]
        })
      });
      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Queue API ${response.status}: ${errText}`);
      }
      const payload = await response.json();
      const conversationId = payload?.conversation_id ?? null;
      initiated += 1;
      console.log(`[Worker:${WORKER_ID}] Lead ${idx + 1}: initiated conversation_id=${conversationId}`);
      await supabase.from("call_queue_jobs").update({
        initiated,
        current_conversation_id: conversationId,
        updated_at: new Date().toISOString()
      }).eq("id", job.id).eq("worker_id", WORKER_ID);
      if (conversationId) {
        try {
          await pollConversation(conversationId, job.id);
          completed += 1;
          console.log(`[Worker:${WORKER_ID}] ✅ Lead ${idx + 1}: completed successfully`);
          await supabase.from("call_queue_jobs").update({
            completed,
            current_conversation_id: null,
            current_lead: null,
            current_index: Math.min(idx + 1, job.total_leads),
            updated_at: new Date().toISOString()
          }).eq("id", job.id).eq("worker_id", WORKER_ID);
        } catch (pollErr) {
          failed += 1;
          console.error(`[Worker:${WORKER_ID}] ❌ Lead ${idx + 1} poll error:`, pollErr);
          await supabase.from("call_queue_jobs").update({
            failed,
            error: String(pollErr),
            current_conversation_id: null,
            current_lead: null,
            current_index: Math.min(idx + 1, job.total_leads),
            updated_at: new Date().toISOString()
          }).eq("id", job.id).eq("worker_id", WORKER_ID);
        }
      } else {
        failed += 1;
        console.warn(`[Worker:${WORKER_ID}] ⚠️ Lead ${idx + 1}: no conversation_id returned`);
        await supabase.from("call_queue_jobs").update({
          failed,
          current_conversation_id: null,
          current_lead: null,
          current_index: Math.min(idx + 1, job.total_leads),
          updated_at: new Date().toISOString()
        }).eq("id", job.id).eq("worker_id", WORKER_ID);
      }
    } catch (err) {
      failed += 1;
      console.error(`[Worker:${WORKER_ID}] ❌ Lead ${idx + 1} request failed:`, err);
      await supabase.from("call_queue_jobs").update({
        failed,
        error: String(err),
        current_conversation_id: null,
        current_lead: null,
        current_index: Math.min(idx + 1, job.total_leads),
        updated_at: new Date().toISOString()
      }).eq("id", job.id).eq("worker_id", WORKER_ID);
    }
  }
  // 7️⃣ Finalize job
  const finalStatus = failed === 0 ? "succeeded" : completed > 0 ? "completed_with_errors" : "failed";
  console.log(`[Worker:${WORKER_ID}] 🏁 Job ${job.id} finished | user=${job.user_id} | initiated=${initiated} completed=${completed} failed=${failed} final=${finalStatus}`);
  await supabase.from("call_queue_jobs").update({
    status: finalStatus,
    completed,
    failed,
    initiated,
    current_index: null,
    current_lead: null,
    current_conversation_id: null,
    updated_at: new Date().toISOString(),
    worker_id: null
  }).eq("id", job.id).eq("worker_id", WORKER_ID);
  console.log(`[Worker:${WORKER_ID}] --- Invocation end ---`);
  return new Response("ok", {
    status: 200
  });
});
