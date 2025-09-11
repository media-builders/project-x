// components/LeadsTable.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * A minimal sticky top bar for the /subscribe page.
 * - Sits above the Stripe Pricing Table (z-50) so it’s always clickable.
 * - Provides a clear "Log out" action that hits /auth/logout.
 */
export default function LeadsTable() {
  return (
    <div><h1>Leads</h1></div>
  );
}
