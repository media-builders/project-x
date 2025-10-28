"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export type LeadCallTranscriptTurn = {
  role?: string;
  message?: string | null;
  original_message?: string | null;
  time_in_call_secs?: number | null;
};

export type LeadCallEntry = {
  id: string;
  dateTimeUtc: string | null;
  durationSeconds: number | null;
  transcript: LeadCallTranscriptTurn[];
  analysis?: Record<string, unknown> | null;
};

type LeadApiResponse = {
  calls?: Array<{
    id?: string | null;
    date_time_utc?: string | null;
    duration_seconds?: number | null;
    transcript?: unknown;
    analysis?: Record<string, unknown> | null;
  }>;
};

const toTranscript = (raw: unknown): LeadCallTranscriptTurn[] => {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((turn) => {
      if (!turn || typeof turn !== "object") return null;
      const entry = turn as LeadCallTranscriptTurn;
      const message =
        typeof entry.message === "string" && entry.message.trim().length > 0
          ? entry.message
          : typeof entry.original_message === "string"
          ? entry.original_message
          : "";
      return {
        role: typeof entry.role === "string" ? entry.role : undefined,
        message,
        original_message:
          typeof entry.original_message === "string"
            ? entry.original_message
            : undefined,
        time_in_call_secs:
          typeof entry.time_in_call_secs === "number"
            ? entry.time_in_call_secs
            : undefined,
      };
    })
    .filter(Boolean) as LeadCallTranscriptTurn[];
};

const normaliseCalls = (
  rawCalls: NonNullable<LeadApiResponse["calls"]>
): LeadCallEntry[] =>
  rawCalls.map((call, idx) => {
    const id =
      typeof call?.id === "string" && call.id.trim().length > 0
        ? call.id.trim()
        : `call-${idx}`;
    return {
      id,
      dateTimeUtc: call?.date_time_utc ?? null,
      durationSeconds: call?.duration_seconds ?? null,
      transcript: toTranscript(call?.transcript),
      analysis: call?.analysis ?? null,
    };
  });

const callsEqual = (a: LeadCallEntry[], b: LeadCallEntry[]) => {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const left = a[i];
    const right = b[i];
    if (
      left.id !== right.id ||
      left.dateTimeUtc !== right.dateTimeUtc ||
      left.durationSeconds !== right.durationSeconds ||
      JSON.stringify(left.analysis ?? {}) !==
        JSON.stringify(right.analysis ?? {}) ||
      JSON.stringify(left.transcript ?? []) !==
        JSON.stringify(right.transcript ?? [])
    ) {
      return false;
    }
  }
  return true;
};

export function useLeadCallLogs(leadId: string | null | undefined) {
  const [entries, setEntries] = useState<LeadCallEntry[]>([]);
  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const cachedEntriesRef = useRef<LeadCallEntry[]>([]);

  const fetchLogs = useCallback(async () => {
    if (!leadId) {
      cachedEntriesRef.current = [];
      setEntries([]);
      setError(null);
      setInitialLoading(false);
      return;
    }

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    try {
      if (cachedEntriesRef.current.length === 0) {
        setInitialLoading(true);
      }
      const res = await fetch(`/api/leads/${leadId}?t=${Date.now()}`, {
        cache: "no-store",
        credentials: "include",
        signal: controller.signal,
        headers: {
          "Cache-Control": "no-store",
        },
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || `Failed to load call logs (${res.status})`);
      }

      const data: LeadApiResponse = await res.json();
      const rawCalls = Array.isArray(data?.calls) ? data.calls : [];
      const nextEntries = normaliseCalls(rawCalls);

      if (!callsEqual(cachedEntriesRef.current, nextEntries)) {
        cachedEntriesRef.current = nextEntries;
        setEntries(nextEntries);
      }
      setError(null);
    } catch (err: any) {
      if (controller.signal.aborted) return;
      console.error("[useLeadCallLogs] fetch error", err);
      setError(err?.message ?? "Unable to load call logs.");
    } finally {
      if (!controller.signal.aborted) {
        setInitialLoading(false);
      }
    }
  }, [leadId]);

  useEffect(() => {
    cachedEntriesRef.current = [];
    setEntries([]);
    setError(null);

    if (!leadId) {
      setInitialLoading(false);
      return;
    }

    fetchLogs();
    pollRef.current = setInterval(fetchLogs, 30_000);
    return () => {
      pollRef.current && clearInterval(pollRef.current);
      abortRef.current?.abort();
    };
  }, [leadId, fetchLogs]);

  return {
    entries,
    loading: initialLoading,
    error,
    refresh: fetchLogs,
  };
}

