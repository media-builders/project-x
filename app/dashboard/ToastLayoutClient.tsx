"use client";

import React from "react";
import { ToastProvider } from "@/components/calendar/ToastProvider";

export default function ToastLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}
