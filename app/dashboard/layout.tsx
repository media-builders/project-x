import type { Metadata } from "next";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import LogoIntroOverlay from "@/components/LogoIntroOverlay";
import ToastLayoutClient from "./ToastLayoutClient";

// ✅ Dynamic metadata with first name + email
export async function generateMetadata(): Promise<Metadata> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // --- Not logged in: fallback ---
  if (!user) {
    return {
      title: "BrokerNest",
      description: "AI Dialer Dashboard",
    };
  }

  // --- Resolve user name ---
  const meta = user.user_metadata ?? {};
  const fullName =
    meta.full_name ??
    meta.name ??
    user.email?.split("@")[0] ??
    "User";

  // Extract first name (split by space, fallback to first segment)
  const firstName = fullName.split(" ")[0];
  const email = user.email ?? "";

  return {
    title: `BrokerNest - ${firstName} (${email})`,
    description: "AI Dialer Dashboard",
  };
}

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // --- Auth & plan check ---
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const [dbUser] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, user.email!));

  if (dbUser?.plan === "none") {
    console.log("User has no plan selected");
    redirect("/subscribe");
  }

  const meta = user.user_metadata ?? {};
  const rawFullName =
    (typeof meta.full_name === "string" && meta.full_name.trim().length > 0
      ? meta.full_name
      : undefined) ??
    (typeof meta.name === "string" && meta.name.trim().length > 0
      ? meta.name
      : undefined) ??
    user.email?.split("@")[0] ??
    "User";
  const fullName = rawFullName.trim();
  const email = user.email ?? "";

  // --- Layout structure ---
  return (
    <div className="dashboard-layout">
      <LogoIntroOverlay />
      <ToastLayoutClient user={{ name: fullName, email }}>{children}</ToastLayoutClient>
    </div>
  );
}
