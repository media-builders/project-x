"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
  const [callCache, setCallCache] = useState<Record<string, CallEntry[]>>({});
  const [loadingLeadId, setLoadingLeadId] = useState<string | null>(null);
  const [callError, setCallError] = useState<string | null>(null);
  const [selectedCallId, setSelectedCallId] = useState<string | null>(null);

  useEffect(() => {
    if (index >= leads.length) setIndex(0);
  }, [leads, index]);

  const next = () => setIndex((i) => (i + 1) % leads.length);
  const prev = () => setIndex((i) => (i - 1 + leads.length) % leads.length);

  const hasLeads = leads && leads.length > 0;
  const lead = hasLeads ? leads[index] : null;
  const leadCalls = useMemo(() => {
    if (!lead?.id) return [];
    return callCache[lead.id] ?? [];
  }, [lead?.id, callCache]);

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
  const loadingTranscript = lead?.id ? loadingLeadId === lead.id : false;

  useEffect(() => {
    if (!lead?.id) {
      setLoadingLeadId(null);
      setCallError(null);
      return;
    }

    if (callCache[lead.id]) {
      setLoadingLeadId(null);
      setCallError(null);
      return;
    }

    const controller = new AbortController();
    setLoadingLeadId(lead.id);
    setCallError(null);

    const loadTranscripts = async () => {
      try {
        const res = await fetch(`/api/leads/${lead.id}`, { signal: controller.signal });
        if (!res.ok) {
          throw new Error(`Failed to load call history (${res.status})`);
        }
        const data: CallApiResponse = await res.json();
        const rawCalls = Array.isArray(data?.calls) ? data.calls : [];
        const parsedCalls = rawCalls.map((call, idx) => normaliseCallEntry(call, idx));

        setCallCache((prev) => ({
          ...prev,
          [lead.id]: parsedCalls,
        }));
        setLoadingLeadId((prev) => (prev === lead.id ? null : prev));
      } catch (error: any) {
        if (controller.signal.aborted) return;
        setCallError(error?.message ?? "Unable to load call history.");
        setLoadingLeadId((prev) => (prev === lead.id ? null : prev));
      }
    };

    loadTranscripts();

    return () => controller.abort();
  }, [lead?.id, callCache]);

  return (
    <div className="bg-[var(--navy-2)] border border-[var(--hairline)] rounded-lg p-4 shadow-sm mb-6 transition-all duration-200">
      {/* Header with pagination */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-[var(--txt-1)]">
          {hasLeads ? `Lead ${index + 1} of ${leads.length}` : "Lead Profile"}
        </h2>

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

      {/* Content */}
      {hasLeads ? (
        <div className="animate-fadeIn space-y-4">
          <div>
            <p className="text-xl font-medium text-[var(--txt-1)] mb-1">
              {lead?.first} {lead?.last}
            </p>
            <p className="text-[var(--txt-2)] mb-1">
              Email: <span className="select-all">{lead?.email || "—"}</span>
            </p>
            <p className="text-[var(--txt-2)]">
              Phone: <span className="select-all">{lead?.phone || "—"}</span>
            </p>
            <p className="text-[var(--txt-2)] mt-1">
              Stage:{" "}
              <span className="font-medium text-[var(--txt-1)]">
                {lead?.stage?.trim() || "Unassigned"}
              </span>
            </p>
          </div>

          <div className="border-t border-[var(--hairline)] pt-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-[var(--txt-1)] uppercase tracking-wide">
                Call History
              </h3>
              {activeCall?.durationSeconds ? (
                <span className="text-xs text-[var(--txt-3)]">
                  Duration {formatSeconds(activeCall.durationSeconds)}
                </span>
              ) : null}
            </div>
            {activeCall?.dateTimeUtc ? (
              <p className="text-xs text-[var(--txt-3)] mt-1">
                {new Date(activeCall.dateTimeUtc).toLocaleString()}
              </p>
            ) : null}

            {loadingTranscript ? (
              <p className="text-sm text-[var(--txt-3)] mt-3">Loading call history…</p>
            ) : callError ? (
              <p className="text-sm text-red-400 mt-3" role="alert">
                {callError}
              </p>
            ) : leadCalls.length === 0 ? (
              <p className="text-sm text-[var(--txt-3)] mt-3">
                No call history available for this lead yet.
              </p>
            ) : (
              <div className="mt-3 space-y-4">
                <div className="overflow-x-auto border border-[var(--hairline)] rounded-md">
                  <table className="min-w-full text-sm text-[var(--txt-2)]">
                    <thead className="bg-[var(--navy-3,#1e2a45)]/40 text-[var(--txt-3)] uppercase text-xs">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">Conversation</th>
                        <th className="px-3 py-2 text-left font-medium">Date</th>
                        <th className="px-3 py-2 text-left font-medium">Duration</th>
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
                            <td className="px-3 py-2 align-top">
                              <div className="font-medium">{displayTitle}</div>
                              {call.summaryBody ? (
                                <p className="text-xs text-[var(--txt-3)] mt-0.5">
                                  {call.summaryBody}
                                </p>
                              ) : null}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {call.dateTimeUtc
                                ? new Date(call.dateTimeUtc).toLocaleString()
                                : "—"}
                            </td>
                            <td className="px-3 py-2 align-top">
                              {formatSeconds(call.durationSeconds) ?? "—"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {activeCall ? (
                  <div className="space-y-3">
                    {activeCall.summaryBody ? (
                      <div className="rounded-md border border-[var(--hairline)] bg-[var(--navy-3,#1e2a45)]/40 p-3">
                        <h4 className="text-sm font-semibold text-[var(--txt-1)]">
                          Summary
                        </h4>
                        <p className="text-sm text-[var(--txt-2)] whitespace-pre-wrap mt-1">
                          {activeCall.summaryBody}
                        </p>
                      </div>
                    ) : null}

                    <div className="rounded-md border border-[var(--hairline)] bg-[var(--navy-3,#1e2a45)]/30 max-h-60 overflow-y-auto p-3 space-y-2">
                      {activeCall.transcript.length > 0 ? (
                        activeCall.transcript.map((turn, idx) => {
                          const roleLabel =
                            turn.role === "agent"
                              ? "Agent"
                              : turn.role === "user"
                              ? "Lead"
                              : turn.role || "Unknown";
                          const timeLabel = formatSeconds(turn.time_in_call_secs);
                          return (
                            <div key={`${turn.role}-${idx}`} className="space-y-1">
                              <div className="flex items-center justify-between text-xs text-[var(--txt-3)]">
                                <span className="font-semibold uppercase tracking-wide">
                                  {roleLabel}
                                </span>
                                {timeLabel ? <span>{timeLabel}</span> : null}
                              </div>
                              <p className="text-sm text-[var(--txt-1)] whitespace-pre-wrap">
                                {turn.message || "—"}
                              </p>
                            </div>
                          );
                        })
                      ) : (
                        <p className="text-sm text-[var(--txt-3)]">
                          Transcript not available for this conversation.
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-[var(--txt-3)]">
                    Select a conversation to view its transcript.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="animate-fadeIn text-[var(--txt-3)] italic text-center py-6">
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
