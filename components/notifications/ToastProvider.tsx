"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
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
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within <ToastProvider>");
  return ctx;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<(Toast & { closing?: boolean })[]>([]);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, duration: 3500, variant: "default", ...t };
    setToasts((prev) => [...prev, toast]);

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

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-container">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast toast--${t.variant || "default"} ${
              t.closing ? "toast--closing" : ""
            }`}
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
    </ToastContext.Provider>
  );
};
