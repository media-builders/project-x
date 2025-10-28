"use client";

export const CALL_QUEUE_STORAGE_KEY = "callQueue.activeJob";

export type StoredQueueJob = {
  jobId: string;
  total?: number;
  scheduledAt?: string | null;
};

const isBrowser = typeof window !== "undefined";

export const getStoredQueueJob = (): StoredQueueJob | null => {
  if (!isBrowser) return null;
  try {
    const raw = window.localStorage.getItem(CALL_QUEUE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) ?? {};
    if (parsed && typeof parsed.jobId === "string" && parsed.jobId.length > 0) {
      return {
        jobId: parsed.jobId,
        total: typeof parsed.total === "number" ? parsed.total : undefined,
        scheduledAt:
          typeof parsed.scheduledAt === "string" && parsed.scheduledAt.length > 0
            ? parsed.scheduledAt
            : null,
      };
    }
  } catch (err) {
    console.warn("[CallQueueStorage] parse error", err);
    window.localStorage.removeItem(CALL_QUEUE_STORAGE_KEY);
  }
  return null;
};

export const setStoredQueueJob = (payload: StoredQueueJob | null) => {
  if (!isBrowser) return;
  if (payload) {
    window.localStorage.setItem(CALL_QUEUE_STORAGE_KEY, JSON.stringify(payload));
  } else {
    window.localStorage.removeItem(CALL_QUEUE_STORAGE_KEY);
  }
};

