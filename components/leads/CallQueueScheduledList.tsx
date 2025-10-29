"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  useCallQueue,
  type QueueJobSummary,
} from "@/context/CallQueueContext";

const formatDateTime = (iso?: string | null) => {
  if (!iso) return "";
  const dt = new Date(iso);
  if (Number.isNaN(dt.getTime())) return "";
  return dt.toLocaleString(undefined, {
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getLeadLabel = (lead: unknown): string | null => {
  if (!lead || typeof lead !== "object") return null;
  const record = lead as Record<string, unknown>;
  const first = typeof record.first === "string" ? record.first : "";
  const last = typeof record.last === "string" ? record.last : "";
  const email = typeof record.email === "string" ? record.email : "";
  const phone = typeof record.phone === "string" ? record.phone : "";
  const name = [first, last].filter(Boolean).join(" ").trim();
  if (name) return name;
  if (email) return email;
  if (phone) return phone;
  return null;
};

export default function CallQueueScheduledList({
  onSelect,
}: {
  onSelect?: (job: QueueJobSummary | null) => void;
}) {
  const { upcomingJobs, status, refreshUpcoming } = useCallQueue();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void refreshUpcoming();
    const interval = setInterval(() => {
      void refreshUpcoming();
    }, 1000);
    return () => clearInterval(interval);
  }, [refreshUpcoming]);

  const sortedUpcoming = useMemo(() => {
    return [...(upcomingJobs || [])].sort((a, b) => {
      const left = a.scheduled_start_at ? new Date(a.scheduled_start_at).getTime() : 0;
      const right = b.scheduled_start_at ? new Date(b.scheduled_start_at).getTime() : 0;
      return left - right;
    });
  }, [upcomingJobs]);

  const activeJobId = status?.job_id ?? null;

  const handleToggle = (job: QueueJobSummary) => {
    setExpandedId((prev) => {
      const next = prev === job.id ? null : job.id;
      onSelect?.(next ? job : null);
      return next;
    });
  };

  return (
    <div className="call-queue-list">
      <p className="call-queue-list_title">Upcoming scheduled queues</p>
      {sortedUpcoming.length === 0 ? (
        <p className="mt-2 text-xs text-primary-foreground/50">
          No future queues scheduled.
        </p>
      ) : (
        <ul className="mt-2 space-y-2">
          {sortedUpcoming.map((job) => {
            const scheduled = job.scheduled_start_at
              ? new Date(job.scheduled_start_at)
              : null;
            const label = scheduled
              ? scheduled.toLocaleString(undefined, {
                  month: "short",
                  day: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })
              : "As soon as possible";
            const isExpanded = expandedId === job.id;
            const isActiveJob = activeJobId === job.id;
            const leads = Array.isArray(job.lead_snapshot) ? job.lead_snapshot : [];

            return (
              <li
                key={job.id}
                className={`rounded border ${
                  isExpanded || isActiveJob ? "border-primary" : "border-primary/20"
                }`}
              >
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-2 rounded bg-primary/10 px-3 py-2 text-left text-sm text-primary-foreground hover:bg-primary/20"
                  onClick={() => handleToggle(job)}
                >
                  <span>
                    {label} · {job.total_leads} lead{job.total_leads === 1 ? "" : "s"}
                  </span>
                  <span className="text-xs uppercase text-primary-foreground/60">
                    {isExpanded ? "Hide" : "View"}
                  </span>
                </button>
                {isExpanded && leads.length > 0 && (
                  <div className="px-3 py-2 text-xs text-primary-foreground/80">
                    <ul className="space-y-1">
                      {leads.map((lead: any, idx: number) => {
                        const name = getLeadLabel(lead) ?? "Unnamed lead";
                        const email =
                          typeof lead?.email === "string" ? lead.email : null;
                        const phone =
                          typeof lead?.phone === "string" ? lead.phone : null;
                        return (
                          <li
                            key={`${job.id}-${idx}`}
                            className="rounded bg-primary/5 px-2 py-1"
                          >
                            <p className="font-medium text-primary-foreground">
                              {name}
                            </p>
                            {(email || phone) && (
                              <p className="text-[11px] text-primary-foreground/70">
                                {email ?? phone}
                              </p>
                            )}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
