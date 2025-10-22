"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { X } from "lucide-react";

type ToastVariant = "default" | "success" | "error" | "warning";

export type Toast = {
  id: string;
  title?: string;
  message: string;
  variant?: ToastVariant;
  duration?: number; // ms
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
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((t: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    const toast: Toast = { id, duration: 3500, variant: "default", ...t };
    setToasts((prev) => [...prev, toast]);
    if (toast.duration && toast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((x) => x.id !== id));
      }, toast.duration);
    }
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((x) => x.id !== id));
  }, []);

  const value = useMemo(() => ({ show }), [show]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {/* toaster portal */}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2">
        {toasts.map((t) => {
          const color =
            t.variant === "success"
              ? "border-emerald-500/60 bg-emerald-900/40"
              : t.variant === "error"
              ? "border-red-500/60 bg-red-900/40"
              : t.variant === "warning"
              ? "border-yellow-500/60 bg-yellow-900/40"
              : "border-gray-700 bg-gray-900/80";
          return (
            <div
              key={t.id}
              className={`min-w-[260px] max-w-[360px] rounded-lg border ${color} px-4 py-3 shadow-lg backdrop-blur-sm`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  {t.title ? (
                    <>
                      <p className="text-sm font-semibold text-white">{t.title}</p>
                      <p className="text-sm text-gray-200">{t.message}</p>
                    </>
                  ) : (
                    <p className="text-sm text-gray-200">{t.message}</p>
                  )}
                </div>
                <button
                  onClick={() => remove(t.id)}
                  className="text-gray-400 hover:text-white rounded-md p-1"
                  aria-label="Close toast"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
