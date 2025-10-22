import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import LogoIntroOverlay from "@/components/LogoIntroOverlay";
import ToastLayoutClient from "./ToastLayoutClient"; // ✅ import wrapper

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BrokerNest.ai",
  description: "AI Dialer",
};

export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ✅ server-side auth & plan verification
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const checkUserInDB = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, user!.email!));

  if (checkUserInDB[0].plan === "none") {
    console.log("User has no plan selected");
    redirect("/subscribe");
  }

  // ✅ client-side wrapper handles toasts
  return (
    <html lang="en">
      <body className={inter.className}>
        <LogoIntroOverlay />
        <ToastLayoutClient>
          {children}
        </ToastLayoutClient>
      </body>
    </html>
  );
}
