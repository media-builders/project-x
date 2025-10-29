"use client";

import { createContext, useContext } from "react";

export type UserInfo = {
  name: string;
  email: string;
};

const UserInfoContext = createContext<UserInfo | null>(null);

export const UserInfoProvider = UserInfoContext.Provider;

export function useUserInfo() {
  const value = useContext(UserInfoContext);
  if (!value) {
    throw new Error("useUserInfo must be used within UserInfoProvider");
  }
  return value;
}

