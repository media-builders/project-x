// components/SubscribeLogoutFab.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Fixed-position Logout button for /subscribe:
 * - Renders above all overlays (Stripe pricing table, etc.).
 * - Sits just below your fixed header (h-16 ≈ 64px).
 */
export default function SubscribeLogoutFab() {
  return (
    <div
      className="fixed right-4"
      style={{
        top: 80, // just below your fixed header (h-16 ≈ 64px) with a little spacing
        zIndex: 2147483647, // sky-high to beat any overlay/stacking context
        pointerEvents: "auto",
      }}
      aria-live="polite"
    >
      <Link href="/auth/logout" prefetch={false}>
        <Button variant="outline">Log out</Button>
      </Link>
    </div>
  );
}
