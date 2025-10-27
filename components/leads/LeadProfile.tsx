"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  stage?: string | null;
  featured?: boolean;
};

type TranscriptTurn = {
  role?: string;
  message?: string | null;
  original_message?: string | null;
  time_in_call_secs?: number | null;
};

type CallEntry = {
  id: string;
  dateTimeUtc: string | null;
  durationSeconds: number | null;
  transcript: TranscriptTurn[];
  summaryTitle: string | null;
  summaryBody: string | null;
};

type CallApiResponse = {
  calls?: Array<{
    id?: string | null;
    date_time_utc?: string | null;
    duration_seconds?: number | null;
    transcript?: unknown;
    analysis?: Record<string, unknown> | null;
  }>;
};

interface LeadProfileProps {
  leads: Lead[];
}

const formatSeconds = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  const minutes = Math.floor(value / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(value % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

const normaliseTranscript = (raw: unknown): TranscriptTurn[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const turn = entry as TranscriptTurn;
      const fallback =
        typeof turn.original_message === "string" ? turn.original_message : "";
      const message =
        typeof turn.message === "string" && turn.message.trim().length > 0
          ? turn.message
          : fallback;
      return {
        role: typeof turn.role === "string" ? turn.role : "unknown",
        message,
        original_message: turn.original_message,
        time_in_call_secs:
          typeof turn.time_in_call_secs === "number" ? turn.time_in_call_secs : null,
      };
    })
    .filter(Boolean) as TranscriptTurn[];
};

const extractSummaryTitle = (analysis: Record<string, unknown> | null | undefined) => {
  const title = analysis && typeof analysis.call_summary_title === "string" ? analysis.call_summary_title.trim() : "";
  return title || null;
};

const extractSummaryBody = (analysis: Record<string, unknown> | null | undefined) => {
  const summary =
    analysis && typeof analysis.transcript_summary === "string"
      ? analysis.transcript_summary.trim()
      : "";
  return summary || null;
};

const normaliseCallEntry = (
  raw: NonNullable<CallApiResponse["calls"]>[number],
  index: number
): CallEntry => {
  const analysis = raw?.analysis ?? null;
  const callId =
    typeof raw?.id === "string" && raw.id.trim().length > 0
      ? raw.id.trim()
      : `call-${index}`;

  return {
    id: callId,
    dateTimeUtc: raw?.date_time_utc ?? null,
    durationSeconds: raw?.duration_seconds ?? null,
    transcript: normaliseTranscript(raw?.transcript),
    summaryTitle: extractSummaryTitle(analysis),
    summaryBody: extractSummaryBody(analysis),
  };
};

export default function LeadProfile({ leads }: LeadProfileProps) {
  const [index, setIndex] = useState(0);
  const [leadCalls, setLeadCalls] = useState<CallEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const prevLeadIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (index >= leads.length) setIndex(0);
  }, [leads, index]);

  const next = () => setIndex((i) => (i + 1) % leads.length);
  const prev = () => setIndex((i) => (i - 1 + leads.length) % leads.length);

  const hasLeads = leads && leads.length > 0;
  const lead = hasLeads ? leads[index] : null;
  useEffect(() => {
    if (!lead?.id) {
      setSelectedCallId(null);
      return;
    }

    if (leadCalls.length === 0) {
      setSelectedCallId(null);
      return;
    }

    const hasSelection = leadCalls.some((call) => call.id === selectedCallId);
    if (!hasSelection) {
      setSelectedCallId(leadCalls[0]?.id ?? null);
    }
  }, [lead?.id, leadCalls, selectedCallId]);

  const activeCall =
    leadCalls.find((call) => call.id === selectedCallId) ?? leadCalls[0] ?? null;
  const loadingTranscript = loading;

  useEffect(() => {
    if (!lead?.id) {
      setLeadCalls([]);
      setSelectedCallId(null);
      setCallError(null);
      setLoading(false);
      prevLeadIdRef.current = null;
      return;
    }

    const isNewLead = lead.id !== prevLeadIdRef.current;
    prevLeadIdRef.current = lead.id;

    const controller = new AbortController();
    setLoading(true);
    setCallError(null);
    if (isNewLead) {
      setLeadCalls([]);
      setSelectedCallId(null);
    }

    const loadTranscripts = async () => {
      try {
        const res = await fetch(`/api/leads/${lead.id}?t=${Date.now()}`, {
          signal: controller.signal,
          cache: "no-store",
          credentials: "include",
          headers: {
            "Cache-Control": "no-store",
          },
        });
        if (!res.ok) {
          throw new Error(`Failed to load call history (${res.status})`);
        }
        const data: CallApiResponse = await res.json();
        const rawCalls = Array.isArray(data?.calls) ? data.calls : [];
        const parsedCalls = rawCalls.map((call, idx) => normaliseCallEntry(call, idx));

        setLeadCalls(parsedCalls);
        setCallError(null);
      } catch (error: any) {
        if (controller.signal.aborted) return;
        setCallError(error?.message ?? "Unable to load call history.");
        setLeadCalls([]);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    loadTranscripts();

    return () => {
      controller.abort();
    };
  }, [lead?.id, refreshKey]);

  const handleRefresh = () => {
    if (!lead?.id) return;
    setRefreshKey((key) => key + 1);
  };

  return (
    <div className="lead-profile-container">


      {/* Content */}
      {hasLeads ? (
        <div className="animate-fadeIn">
          <div className="lead-profile">
            <div className="lead-profile-info">
              <h2 className="profile-lead-name">
                {lead?.first} {lead?.last}
              </h2>
              
              <div className="profile-lead-email">
                <p className="select-all">
                  {lead?.email || "—"}
                  </p>
              </div>

              <div className="profile-lead-phone">
                <p className="select-all">
                  {lead?.phone || "—"}
                  </p>
              </div>

              <div className="profile-lead-stage">
                <p className="">
                  Stage:{" "}
                </p>
                <p className="">
                  {lead?.stage?.trim() || "Unassigned"}
                </p>
              </div>
            </div>

            {/* Header with pagination */}
            <div className="lead-profile-pagination">
              {/* <h2 className="text-lg font-semibold text-[var(--txt-1)]">
                {hasLeads ? `Lead ${index + 1} of ${leads.length}` : "Lead Profile"}
              </h2> */}

              {hasLeads && leads.length > 1 && (
                <div className="flex space-x-2">
                  <Button variant="ghost" size="icon" onClick={prev}>
                    <ChevronLeft className="h-5 w-5" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={next}>
                    <ChevronRight className="h-5 w-5" />
                  </Button>
                </div>
              )}
            </div>
          </div>

          <div className="">
            <div className="lead-profile-header">
              <Button className="refresh-button" variant="ghost" >
                <RefreshCcw className={`${loadingTranscript ? "animate-spin" : ""}`} />
                <span className="">Refresh</span>
              </Button>
              {activeCall?.durationSeconds ? (
                <span className="">
                  Duration {formatSeconds(activeCall.durationSeconds)}
                </span>
              ) : null}
            {activeCall?.dateTimeUtc ? (
              <p className="">
                {new Date(activeCall.dateTimeUtc).toLocaleString()}
              </p>
            ) : null}
            </div>

            {loadingTranscript ? (
              <p className="">Loading call history…</p>
            ) : callError ? (
              <p className="" role="alert">
                {callError}
              </p>
            ) : leadCalls.length === 0 ? (
              <p className="">
                No call history available for this lead yet.
              </p>
            ) : (
              <div className="lead-history-container">
                <div className="lead-conversations-container no-scroll-bar">
                  <table className="">
                    <thead className="">
                      <tr>
                        <th className="">Conversation</th>
                        <th className="">Date</th>
                        <th className="">Duration</th>
                      </tr>
                    </thead>
                    <tbody>
                      {leadCalls.map((call, idx) => {
                        const isActive = activeCall?.id === call.id;
                        const displayTitle =
                          call.summaryTitle ||
                          `Call ${leadCalls.length - idx}`;
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
                            <td className="">
                              <div className="f">{displayTitle}</div>
                              {call.summaryBody ? (
                                <p className="">
                                  {call.summaryBody}
                                </p>
                              ) : null}
                            </td>
                            <td className="">
                              {call.dateTimeUtc
                                ? new Date(call.dateTimeUtc).toLocaleString()
                                : "—"}
                            </td>
                            <td className="">
                              {formatSeconds(call.durationSeconds) ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {activeCall ? (
                  <div className="lead-transcript-container no-scroll-bar">
                    {activeCall.summaryBody ? (
                      <div className="lead-transcript-summary">
                        <h4 className="">
                          Summary
                        </h4>
                        <p className="">
                          {activeCall.summaryBody}
                        </p>
                      </div>
                    ) : null}

                    <div className="lead-transcript-conversation">
                      {activeCall.transcript.length > 0 ? (
                        activeCall.transcript.map((turn, idx) => {
                          const roleLabel =
                            turn.role === "agent"
                              ? "Agent"
                              : turn.role === "user"
                              ? `${lead?.first || ''}`.trim() || "Lead"
                              : turn.role || "Unknown";
                          const timeLabel = formatSeconds(turn.time_in_call_secs);
                          return (
                            <div key={`${turn.role}-${idx}`} className="role-message">
                              <p className="message">
                                {turn.message || "—"}
                              </p>
                              <div className="time-stamp">
                                <span className="role">
                                  {roleLabel}
                                </span>
                                {timeLabel ? <span>{timeLabel}</span> : null}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <p className="">
                          Transcript not available for this conversation.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="">
                    Select a conversation to view its transcript.
                  </p>
                )}
              </div>
            )}
          </div>

        </div>
      ) : (
        <div className="animate-fadeIn">
          Select one or more leads to view details here.
        </div>
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(5px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease-out;
        }
      `}</style>
    </div>
  );
}
