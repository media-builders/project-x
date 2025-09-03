// components/SubscribeTopBar.tsx
import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * A minimal sticky top bar for the /subscribe page.
 * - Sits above the Stripe Pricing Table (z-50) so it’s always clickable.
 * - Provides a clear "Log out" action that hits /auth/logout.
 */
export default function SubscribeTopBar() {
  return (
    <div className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur border-b">
      <div className="mx-auto max-w-5xl px-4 py-3 flex items-center justify-start">
        <Link href="/auth/auth/logout" prefetch={false}>
          <Button variant="outline">Log out</Button>
        </Link>
      </div>
    </div>
  );
}
