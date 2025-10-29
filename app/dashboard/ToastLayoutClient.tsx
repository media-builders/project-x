"use client";

import React from "react";
import {
  ToastProvider,
  ToastVariant,
} from "@/components/notifications/ToastProvider";
import { UserInfoProvider, UserInfo } from "@/context/UserInfoContext";

type InitialNotification = {
  id: string;
  title?: string | null;
  message: string;
  variant?: ToastVariant | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};

export default function ToastLayoutClient({
  children,
  user,
  initialNotifications,
}: {
  children: React.ReactNode;
  user: UserInfo;
  initialNotifications?: InitialNotification[];
}) {
  return (
    <UserInfoProvider value={user}>
      <ToastProvider
        renderContainer={false}
        initialHistory={initialNotifications}
      >
        {children}
      </ToastProvider>
    </UserInfoProvider>
  );
}
