"use client";

import React from "react";
import { ToastProvider } from "@/components/notifications/ToastProvider";

export default function ToastLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider renderContainer={false}>{children}</ToastProvider>;
}
