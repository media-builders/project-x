"use client";

import React from "react";
import { ToastProvider } from "@/components/notifications/ToastProvider";
import { UserInfoProvider, UserInfo } from "@/context/UserInfoContext";

export default function ToastLayoutClient({
  children,
  user,
}: {
  children: React.ReactNode;
  user: UserInfo;
}) {
  return (
    <UserInfoProvider value={user}>
      <ToastProvider renderContainer={false}>{children}</ToastProvider>
    </UserInfoProvider>
  );
}
