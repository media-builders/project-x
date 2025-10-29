"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { X } from "lucide-react";

export type ToastVariant = "default" | "success" | "error" | "warning";

export type Toast = {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
  persist?: boolean;
  metadata?: Record<string, unknown> | null;
};

type ShowInput = Omit<Toast, "id"> & { id?: string };

type ToastContextValue = {
  show: (toast: ShowInput) => string;
  remove: (id: string) => void;
  toasts: (Toast & { closing?: boolean })[];
  history: ToastHistoryEntry[];
  clearHistory: () => void;
  removeHistoryEntry: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

type InitialHistoryEntry = {
  id: string;
  title?: string | null;
  message: string;
  variant?: ToastVariant | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string | number | Date;
};

type ToastProviderProps = {
  children: React.ReactNode;
  renderContainer?: boolean;
  initialHistory?: InitialHistoryEntry[];
};

const HISTORY_LIMIT = 100;

const joinClasses = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

const normalizeTimestamp = (value: string | number | Date): number => {
  if (typeof value === "number") return value;
  return new Date(value).getTime();
};

export type ToastHistoryEntry = {
  id: string;
  toastId?: string;
  recordId?: string;
  title?: string;
  message: string;
  variant: ToastVariant;
  timestamp: number;
  metadata?: Record<string, unknown> | null;
};

const mapInitialHistory = (
  initialHistory?: InitialHistoryEntry[],
): ToastHistoryEntry[] =>
  initialHistory?.map((entry) => ({
    id: entry.id,
    toastId: entry.id,
    recordId: entry.id,
    title: entry.title ?? undefined,
    message: entry.message,
    variant: entry.variant ?? "default",
    metadata: entry.metadata ?? null,
    timestamp: normalizeTimestamp(entry.createdAt),
  })) ?? [];

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  renderContainer = true,
  initialHistory,
}) => {
  const [toasts, setToasts] = useState<(Toast & { closing?: boolean })[]>([]);
  const [history, setHistory] = useState<ToastHistoryEntry[]>(() =>
    mapInitialHistory(initialHistory),
  );

  useEffect(() => {
    if (!initialHistory) return;
    setHistory(mapInitialHistory(initialHistory));
  }, [initialHistory]);

  const persistToast = useCallback(async (toast: Toast) => {
    try {
      const response = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: toast.title ?? null,
          message: toast.message,
          variant: toast.variant ?? "default",
          metadata: toast.metadata ?? null,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to persist toast: ${response.status}`);
      }

      const data = await response.json().catch(() => null);
      const record = data?.data as
        | {
            id: string;
            createdAt?: string;
            metadata?: Record<string, unknown> | null;
          }
        | undefined;

      if (record?.id) {
        const createdAt = record.createdAt
          ? new Date(record.createdAt).getTime()
          : Date.now();
        setHistory((prev) =>
          prev.map((entry) =>
            entry.toastId === toast.id
              ? {
                  ...entry,
                  id: record.id,
                  recordId: record.id,
                  timestamp: createdAt,
                  metadata: record.metadata ?? entry.metadata ?? null,
                }
              : entry,
          ),
        );
      }
    } catch (error) {
      console.error("[Toast] Failed to persist notification", error);
    }
  }, []);

  const show = useCallback(
    (input: ShowInput): string => {
      const id = input.id ?? crypto.randomUUID();
      const toast: Toast = {
        id,
        duration: 3500,
        persist: true,
        metadata: null,
        variant: "default",
        ...input,
      };

      setToasts((prev) => [...prev, toast]);
      setHistory((prev) => {
        const entry: ToastHistoryEntry = {
          id,
          toastId: id,
          title: toast.title,
          message: toast.message,
          variant: toast.variant ?? "default",
          timestamp: Date.now(),
          metadata: toast.metadata ?? null,
        };
        const next = [entry, ...prev];
        return next.slice(0, HISTORY_LIMIT);
      });

      if (toast.persist) {
        void persistToast(toast);
      }

      if (toast.duration && toast.duration > 0) {
        setTimeout(() => {
          setToasts((prev) =>
            prev.map((x) => (x.id === id ? { ...x, closing: true } : x)),
          );
          setTimeout(() => {
            setToasts((prev) => prev.filter((x) => x.id !== id));
          }, 350);
        }, toast.duration);
      }

      return id;
    },
    [persistToast],
  );

  const remove = useCallback((id: string) => {
    setToasts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, closing: true } : x)),
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 350);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
    void fetch("/api/notifications", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    }).catch((error) => {
      console.error("[Toast] Failed to clear notifications", error);
    });
  }, []);

  const removeHistoryEntry = useCallback((id: string) => {
    setHistory((prev) =>
      prev.filter(
        (entry) => entry.id !== id && entry.recordId !== id && entry.toastId !== id,
      ),
    );
  }, []);

  const value = useMemo(
    () => ({
      show,
      remove,
      toasts,
      history,
      clearHistory,
      removeHistoryEntry,
    }),
    [show, remove, toasts, history, clearHistory, removeHistoryEntry],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {renderContainer ? <ToastViewport /> : null}
    </ToastContext.Provider>
  );
};

type ToastViewportProps = {
  className?: string;
  inline?: boolean;
};

export const ToastViewport: React.FC<ToastViewportProps> = ({
  className,
  inline,
}) => {
  const { toasts, remove } = useToast();

  if (!toasts.length) {
    return null;
  }

  const classes = joinClasses(
    "toast-container",
    inline && "toast-container--inline",
    className,
  );

  return (
    <div className={classes} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={joinClasses(
            "toast",
            `toast--${t.variant || "default"}`,
            t.closing && "toast--closing",
          )}
        >
          <div className="toast-content">
            <div className="toast-text">
              {t.title && <p className="toast-title">{t.title}</p>}
              <p className="toast-message">{t.message}</p>
            </div>
            <button
              onClick={() => remove(t.id)}
              className="toast-close"
              aria-label="Close toast"
            >
              <X className="toast-close-icon" />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
};
