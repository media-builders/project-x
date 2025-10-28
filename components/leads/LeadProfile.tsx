"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLeadCallLogs } from "@/hooks/useLeadCallLogs";
import { useCallQueue, ACTIVE_QUEUE_STATUSES } from "@/context/CallQueueContext";

interface Lead {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  stage?: string | null;
  featured?: boolean;
}

interface LeadProfileProps {
  leads: Lead[];
}

const formatSeconds = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return "-";
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export default function LeadProfile({ leads }: LeadProfileProps) {
  const [index, setIndex] = useState(0);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  useEffect(() => {
    if (index >= leads.length) setIndex(0);
  }, [leads, index]);

  const next = () => setIndex((i) => (i + 1) % leads.length);
  const prev = () => setIndex((i) => (i - 1 + leads.length) % leads.length);

  const hasLeads = leads && leads.length > 0;
  const lead = hasLeads ? leads[index] : null;

  const { entries, loading, error, refresh } = useLeadCallLogs(lead?.id ?? null);
  const { status: queueStatus } = useCallQueue();

  useEffect(() => {
    if (!lead?.id) {
      setSelectedCallId(null);
      return;
    }

    if (entries.length === 0) {
      setSelectedCallId(null);
      return;
    }

    const hasSelection = entries.some((call) => call.id === selectedCallId);
    if (!hasSelection) {
      setSelectedCallId(entries[0]?.id ?? null);
    }
  }, [lead?.id, entries, selectedCallId]);

  useEffect(() => {
    if (!lead?.id || !queueStatus) return;
    if (ACTIVE_QUEUE_STATUSES.has(queueStatus.status)) return;

    const snapshot = Array.isArray(queueStatus.lead_snapshot)
      ? queueStatus.lead_snapshot
      : [];
    const involvesLead = snapshot.some(
      (item: any) =>
        item && typeof item === "object" && typeof item.id === "string" && item.id === lead.id
    );

    if (involvesLead) {
      refresh();
    }
  }, [queueStatus, lead?.id, refresh]);

  const activeCall = useMemo(
    () =>
      entries.find((call) => call.id === selectedCallId) ?? entries[0] ?? null,
    [entries, selectedCallId]
  );

  return (
    <div className="lead-profile-container">
      <div className="lead-profile-header">
        <div className="lead-profile-title">
          <h3 className="lead-profile-heading">Lead Profile</h3>
          {lead ? (
            <p className="lead-profile-subheading">
              {lead.first} {lead.last}
            </p>
          ) : (
            <p className="lead-profile-subheading">No lead selected</p>
          )}
        </div>

        <div className="lead-profile-controls">
          <div className="lead-profile-navigation">
            <button onClick={prev} disabled={!hasLeads}>
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button onClick={next} disabled={!hasLeads}>
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={refresh}
            disabled={!lead || loading}
            className="refresh-btn"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {!lead ? (
        <p className="lead-empty-state">Select one or more leads to view details.</p>
      ) : loading ? (
        <p className="lead-empty-state">Loading transcripts…</p>
      ) : error ? (
        <p className="lead-empty-state text-red-400">{error}</p>
      ) : entries.length === 0 ? (
        <p className="lead-empty-state">No call history yet.</p>
      ) : (
        <div className="lead-history-container">
          <div className="lead-conversations-container no-scroll-bar">
            <table className="contact-table">
              <thead>
                <tr>
                  <th>Conversation</th>
                  <th>Date</th>
                  <th>Duration</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((call, idx) => {
                  const isActive = activeCall?.id === call.id;
                  const title =
                    (call.analysis &&
                      typeof call.analysis.call_summary_title === "string" &&
                      call.analysis.call_summary_title.trim()) ||
                    `Call ${entries.length - idx}`;
                  return (
                    <tr
                      key={call.id}
                      onClick={() => setSelectedCallId(call.id)}
                      className={`cursor-pointer transition-colors ${
                        isActive
                          ? "bg-[rgba(73,179,255,0.16)] text-[var(--txt-1)]"
                          : "hover:bg-[rgba(73,179,255,0.08)]"
                      }`}
                    >
                      <td>
                        <div className="f">{title}</div>
                        {call.analysis &&
                        typeof call.analysis.transcript_summary === "string" &&
                        call.analysis.transcript_summary.trim().length > 0 ? (
                          <p>{call.analysis.transcript_summary}</p>
                        ) : null}
                      </td>
                      <td>
                        {call.dateTimeUtc
                          ? new Date(call.dateTimeUtc).toLocaleString()
                          : "-"}
                      </td>
                      <td>{formatSeconds(call.durationSeconds)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {activeCall ? (
            <div className="lead-transcript-container no-scroll-bar">
              {activeCall.analysis &&
              typeof activeCall.analysis.transcript_summary === "string" &&
              activeCall.analysis.transcript_summary.trim().length > 0 ? (
                <div className="lead-transcript-summary">
                  <h4>Summary</h4>
                  <p>{activeCall.analysis.transcript_summary}</p>
                </div>
              ) : null}

              <div className="lead-transcript-conversation">
                {activeCall.transcript.length > 0 ? (
                  activeCall.transcript.map((turn, idx) => {
                    const roleLabel =
                      turn.role === "agent"
                        ? "Agent"
                        : turn.role === "user"
                        ? `${lead.first || ""}`.trim() || "Lead"
                        : turn.role || "Unknown";
                    return (
                      <div key={`${turn.role}-${idx}`} className="role-message">
                        <p className="message">{turn.message || "-"}</p>
                        <div className="time-stamp">
                          <span className="role">{roleLabel}</span>
                          {turn.time_in_call_secs !== undefined ? (
                            <span>{formatSeconds(turn.time_in_call_secs)}</span>
                          ) : null}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <p className="lead-empty-state">
                    Transcript not available for this conversation.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="lead-empty-state">Select a conversation to view its transcript.</p>
          )}
        </div>
      )}
    </div>
  );
}

