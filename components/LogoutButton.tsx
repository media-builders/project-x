// components/LogoutButton.tsx
import { logout } from "@/app/auth/actions";
import { Button } from "@/components/ui/button";

/**
 * LogoutButton
 * - Server component that renders a form posting to the `logout` server action.
 * - Keeps credentials out of the client and relies on Supabase SSR cookie handling.
 * - Drop-in safe for any server-rendered page (e.g., /subscribe).
 */
export default function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline">
        Log out
      </Button>
    </form>
  );
}
