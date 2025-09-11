import LeadsTable from "@/components/Leads";
import DashboardMenu from "@/components/DashboardMenu";
import { redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";

export default async function Dashboard() {
  const supabase = createClient();

  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) {
    redirect("/login");
  }

  const user = data.user;

  // 1) Try DB-backed profile name
  const { data: profile, error: profileError } = await supabase
    .from("users_table") // <-- your table
    .select("name")
    .eq("id", user.id)   // assumes `users_table.id` = auth.users.id
    .maybeSingle();

  // 2) Fall back to auth metadata or email
  const um = (user?.user_metadata || {}) as Record<string, unknown>;
  const fallbackMetaName =
    (typeof um.full_name === "string" && um.full_name) ||
    (typeof um.name === "string" && um.name) ||
    (typeof um.first_name === "string" &&
      typeof um.last_name === "string" &&
      `${um.first_name} ${um.last_name}`) ||
    null;

  const rawName = profile?.name || fallbackMetaName || user.email;

  // 3) Extract first name only
  const firstName =
    typeof rawName === "string" ? rawName.trim().split(/\s+/)[0] : rawName;

  return (
    <main className="flex-1">
      <div className="container">
        Hello {firstName} welcome to BrokerNest
      </div>
      <div className="dashboard">
        <DashboardMenu />
        <LeadsTable />
      </div>
    </main>
  );
}
