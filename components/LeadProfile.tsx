"use client";

import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

type Lead = {
  id: string;
  first: string;
  last: string;
  email: string;
  phone: string;
  featured?: boolean;
};

interface LeadProfileProps {
  leads: Lead[];
}

type CallLog = {
  id: string;
  date_time_utc: string | null;
  duration_seconds: number | null;
  transcript: unknown | null;
  started_at?: string | null;
  ended_at?: string | null;
};

const fmtDateTime = (utcISO?: string | null) => {
  if (!utcISO) return "—";
  const d = new Date(utcISO);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleString(); // local timezone
};

const fmtDurationMMSS = (sec?: number | null) => {
  if (sec == null || isNaN(sec)) return "00:00";
  const s = Math.max(0, Math.floor(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${String(m).padStart(2, "0")}:${String(r).padStart(2, "0")}`;
};

export default function LeadProfile({ leads }: LeadProfileProps) {
  const [index, setIndex] = useState(0);
  const [callLogs, setCallLogs] = useState<CallLog[] | null>(null);
  const [loadingCalls, setLoadingCalls] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasLeads = leads && leads.length > 0;
  const lead = hasLeads ? leads[index] : null;

  useEffect(() => {
    if (index >= leads.length) setIndex(0);
  }, [leads, index]);

  const next = () => setIndex((i) => (i + 1) % leads.length);
  const prev = () => setIndex((i) => (i - 1 + leads.length) % leads.length);

  useEffect(() => {
    if (!lead) return;
    (async () => {
      setLoadingCalls(true);
      setError(null);
      try {
        const res = await fetch(`/api/leads/${lead.id}/calls`);
        const payload = await res.json();
        if (!res.ok) throw new Error(payload?.error || `Failed (${res.status})`);
        setCallLogs(payload?.calls ?? []);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoadingCalls(false);
      }
    })();
  }, [lead]);

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
        <div className="animate-fadeIn">
          <p className="text-xl font-medium text-[var(--txt-1)] mb-1">
            {lead?.first} {lead?.last}
          </p>
          <p className="text-[var(--txt-2)] mb-1">
            📧 <span className="select-all">{lead?.email}</span>
          </p>
          <p className="text-[var(--txt-2)]">
            📞 <span className="select-all">{lead?.phone}</span>
          </p>

          <h3 className="text-base font-semibold text-[var(--txt-1)] mb-2">
            Call History
          </h3>

          {loadingCalls ? (
            <p className="text-[var(--txt-3)] text-sm">Loading call history…</p>
          ) : error ? (
            <p className="text-red-400 text-sm">{error}</p>
          ) : callLogs && callLogs.length > 0 ? (
            <div className="overflow-x-auto border border-[var(--hairline)] rounded-lg">
              <table className="min-w-full text-sm">
                <thead className="bg-[var(--navy-3)] text-[var(--txt-1)]">
                  <tr>
                    <th className="text-left px-3 py-2">Date</th>
                    <th className="text-left px-3 py-2">Transcript</th>
                    <th className="text-left px-3 py-2">Duration</th>
                  </tr>
                </thead>
                <tbody>
                  {callLogs.map((log) => {
                    // ✅ Compute duration properly
                    let durationSec: number | null = null;
                    if (
                      typeof log.duration_seconds === "number" &&
                      log.duration_seconds > 0
                    ) {
                      durationSec = log.duration_seconds;
                    } else if (log.started_at && log.ended_at) {
                      const start = new Date(log.started_at).getTime();
                      const end = new Date(log.ended_at).getTime();
                      if (!isNaN(start) && !isNaN(end) && end > start) {
                        durationSec = Math.floor((end - start) / 1000);
                      }
                    }

                    return (
                      <tr
                        key={log.id}
                        className="border-t border-[var(--hairline)] text-[var(--txt-2)] align-top"
                      >
                        <td className="px-3 py-2 whitespace-nowrap">
                          {fmtDateTime(log.date_time_utc)}
                        </td>

                        {/* Transcript */}
                        <td className="px-3 py-2 whitespace-pre-wrap break-words leading-relaxed">
                          {Array.isArray(log.transcript) ? (
                            log.transcript.map((m: any, i: number) => {
                              const role = m.role?.toUpperCase() ?? "UNKNOWN";
                              const color =
                                role === "AGENT"
                                  ? "text-blue-400"
                                  : role === "USER"
                                  ? "text-green-400"
                                  : "text-gray-400";
                              return (
                                <div key={i}>
                                  <strong className={color}>{role}:</strong>{" "}
                                  {m.message}
                                </div>
                              );
                            })
                          ) : typeof log.transcript === "string" ? (
                            <div>{log.transcript}</div>
                          ) : (
                            "—"
                          )}
                        </td>

                        {/* Duration */}
                        <td className="px-3 py-2 whitespace-nowrap">
                          {fmtDurationMMSS(durationSec)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-[var(--txt-3)] text-sm">No call history yet.</p>
          )}
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