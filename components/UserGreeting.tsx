// components/UserGreeting.tsx
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";

function capitalize(name: string) {
  if (!name) return "";
  return name[0].toUpperCase() + name.slice(1).toLowerCase();
}

export default async function UserGreeting() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/login");
  }

  const user = data.user;
  const um = (user?.user_metadata || {}) as Record<string, unknown>;

  const fallbackMetaName =
    (typeof um.full_name === "string" && um.full_name) ||
    (typeof um.name === "string" && um.name) ||
    (typeof um.first_name === "string" &&
      typeof um.last_name === "string" &&
      `${um.first_name} ${um.last_name}`) ||
    null;

  const rawName = fallbackMetaName || user?.email;

  const firstName =
    typeof rawName === "string"
      ? capitalize(rawName.trim().split(/\s+/)[0])
      : rawName;

  return (
    <h1 className="text-2xl md:text-2xl lg:text-2xl font-semibold font-sans text-gray-900 pl-6 md:pl-10 lg:pl-12">
      Hello {firstName}! Welcome to BrokerNest
    </h1>
  );
}
