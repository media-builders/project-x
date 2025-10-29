"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { X } from "lucide-react";

type ToastVariant = "default" | "success" | "error" | "warning";

export type Toast = {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
};

type ToastContextValue = {
  show: (t: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
  toasts: (Toast & { closing?: boolean })[];
  history: ToastHistoryEntry[];
  clearHistory: () => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

type ToastProviderProps = {
  children: React.ReactNode;
  renderContainer?: boolean;
};

const joinClasses = (...parts: (string | false | null | undefined)[]) =>
  parts.filter(Boolean).join(" ");

export type ToastHistoryEntry = Toast & {
  timestamp: number;
};

export const ToastProvider: React.FC<ToastProviderProps> = ({
  children,
  renderContainer = true,
}) => {
  const [toasts, setToasts] = useState<(Toast & { closing?: boolean })[]>([]);
  const [history, setHistory] = useState<ToastHistoryEntry[]>([]);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, duration: 3500, variant: "default", ...t };
    setToasts((prev) => [...prev, toast]);
    setHistory((prev) => {
      const next = [{ ...toast, timestamp: Date.now() }, ...prev];
      return next.slice(0, 50);
    });

    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        // trigger exit animation
        setToasts((prev) =>
          prev.map((x) => (x.id === id ? { ...x, closing: true } : x))
        );
        // remove after animation
        setTimeout(() => {
          setToasts((prev) => prev.filter((x) => x.id !== id));
        }, 350); // matches CSS animation duration
      }, toast.duration);
    }
  }, []);

  const remove = useCallback((id: string) => {
    // trigger exit animation
    setToasts((prev) =>
      prev.map((x) => (x.id === id ? { ...x, closing: true } : x))
    );
    // remove after fade out
    setTimeout(() => {
      setToasts((prev) => prev.filter((x) => x.id !== id));
    }, 350);
  }, []);

  const clearHistory = useCallback(() => {
    setHistory([]);
  }, []);

  const value = useMemo(
    () => ({
      show,
      remove,
      toasts,
      history,
      clearHistory,
    }),
    [show, remove, toasts, history, clearHistory]
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
    className
  );

  return (
    <div className={classes} role="status" aria-live="polite">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={joinClasses(
            "toast",
            `toast--${t.variant || "default"}`,
            t.closing && "toast--closing"
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
