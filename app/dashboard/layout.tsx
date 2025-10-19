import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/utils/db/db";
import { usersTable } from "@/utils/db/schema";
import { eq } from "drizzle-orm";
import LogoIntroOverlay from "@/components/LogoIntroOverlay"; // ✅ Import the overlay

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BrokerNest.ai",
  description: "AI Dialer",
};

// 👇 You cannot use "use client" here — layout remains a server component
export default async function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // ✅ Authentication + plan check stays server-side
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

  // ✅ Add overlay inside <body>, client-side only
  return (
    <html lang="en">
      <body>
        <LogoIntroOverlay />
        {children}
      </body>
    </html>
  );
}
