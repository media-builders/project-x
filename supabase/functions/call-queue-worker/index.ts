import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("NEXT_PUBLIC_SUPABASE_URL");
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const queueApiUrl = Deno.env.get("QUEUE_API_URL");
const queueApiKey = Deno.env.get("QUEUE_API_KEY");

if (!supabaseUrl || !serviceKey || !queueApiUrl || !queueApiKey) {
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, QUEUE_API_URL, or QUEUE_API_KEY"
  );
}

const supabase = createClient(supabaseUrl, serviceKey);

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const JOB_STATUSES = ["pending", "running", "scheduled"] as const;

async function pollConversation(conversationId: string) {
  const timeoutAt = Date.now() + 10 * 60_000; // 10 minutes
  while (Date.now() < timeoutAt) {
    const { data, error } = await supabase
      .from("call_logs")
      .select("status")
      .eq("conversation_id", conversationId)
      .maybeSingle();

    if (error) {
      console.error("[QueueWorker] poll error", error);
      await sleep(4000);
      continue;
    }

    const status = data?.status ?? null;
    if (status && status !== "call.started") {
      return status;
    }
    await sleep(4000);
  }
  throw new Error("Call status polling timed out");
}

function getReadyJob(jobs: any[]) {
  if (!jobs || jobs.length === 0) return null;
  const now = Date.now();
  for (const job of jobs) {
    if (job.status === "running") {
      return job;
    }
    if (job.scheduled_start_at) {
      const scheduled = new Date(job.scheduled_start_at).getTime();
      if (!Number.isNaN(scheduled) && scheduled > now) {
        continue;
      }
    }
    return job;
  }
  return null;
}

Deno.serve(async () => {
  const { data: jobs, error: jobsErr } = await supabase
    .from("call_queue_jobs")
    .select("*")
    .in("status", JOB_STATUSES as unknown as string[])
    .order("created_at", { ascending: true })
    .limit(5);

  if (jobsErr) {
    console.error("[QueueWorker] Failed to fetch jobs:", jobsErr);
    return new Response("fetch error", { status: 500 });
  }

  const job = getReadyJob(jobs ?? []);

  if (!job) {
    // Ensure scheduled jobs stay marked as scheduled for observability
    if (jobs && jobs[0] && jobs[0].scheduled_start_at) {
      const scheduled = new Date(jobs[0].scheduled_start_at).getTime();
      if (!Number.isNaN(scheduled) && scheduled > Date.now() && jobs[0].status !== "scheduled") {
        await supabase
          .from("call_queue_jobs")
          .update({
            status: "scheduled",
            updated_at: new Date().toISOString(),
          })
          .eq("id", jobs[0].id);
      }
    }
    return new Response("no jobs ready", { status: 200 });
  }

  const now = Date.now();
  if (
    job.scheduled_start_at &&
    new Date(job.scheduled_start_at).getTime() > now
  ) {
    if (job.status !== "scheduled") {
      await supabase
        .from("call_queue_jobs")
        .update({
          status: "scheduled",
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
    return new Response("scheduled future start", { status: 200 });
  }

  if (job.status !== "running") {
    await supabase
      .from("call_queue_jobs")
      .update({
        status: "running",
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);
  }

  let initiated = job.initiated ?? 0;
  let completed = job.completed ?? 0;
  let failed = job.failed ?? 0;

  for (let idx = job.current_index ?? 0; idx < job.total_leads; idx++) {
    const lead = job.lead_snapshot?.[idx];
    if (!lead) continue;

    await supabase
      .from("call_queue_jobs")
      .update({
        current_index: idx,
        current_lead: lead,
        updated_at: new Date().toISOString(),
      })
      .eq("id", job.id);

    try {
      const response = await fetch(queueApiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-queue-key": queueApiKey,
        },
        body: JSON.stringify({
          user_id: job.user_id,
          leads: [lead],
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Queue API ${response.status}: ${errText}`);
      }

      const payload = await response.json();
      const conversationId = payload?.conversation_id ?? null;
      initiated += 1;

      await supabase
        .from("call_queue_jobs")
        .update({
          initiated,
          current_conversation_id: conversationId,
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);

      if (conversationId) {
        try {
          await pollConversation(conversationId);
          completed += 1;
        } catch (pollErr) {
          failed += 1;
          await supabase
            .from("call_queue_jobs")
            .update({
              failed,
              error: String(pollErr),
              updated_at: new Date().toISOString(),
            })
            .eq("id", job.id);
        }
      } else {
        failed += 1;
      }
    } catch (err) {
      failed += 1;
      await supabase
        .from("call_queue_jobs")
        .update({
          failed,
          error: String(err),
          updated_at: new Date().toISOString(),
        })
        .eq("id", job.id);
    }
  }

  const finalStatus =
    failed === 0
      ? "succeeded"
      : completed > 0
      ? "completed_with_errors"
      : "failed";

  await supabase
    .from("call_queue_jobs")
    .update({
      status: finalStatus,
      completed,
      failed,
      initiated,
      current_index: null,
      current_lead: null,
      current_conversation_id: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", job.id);

  return new Response("ok", { status: 200 });
});
