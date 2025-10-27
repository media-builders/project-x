import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import LogoIntroOverlay from "@/components/LogoIntroOverlay";
import ToastLayoutClient from "./ToastLayoutClient";

const inter = Inter({ subsets: ["latin"] });

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

  // --- Layout structure ---
  return (
    <html lang="en">
      <body className={inter.className}>
        <LogoIntroOverlay />
        <ToastLayoutClient>{children}</ToastLayoutClient>
      </body>
    </html>
  );
}
