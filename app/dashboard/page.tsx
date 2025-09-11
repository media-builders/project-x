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

  // Fetch only from your custom users_table
  const { data: profile, error: profileError } = await supabase
    .from("users_table")
    .select("name")
    .eq("id", user.id)   // assumes users_table.id = auth.users.id
    .maybeSingle();

  const displayName = profile?.name; // <- no fallbacks

  return (
    <main className="flex-1">
      <div className="container">
        Hello {displayName} welcome to BrokerNest
      </div>
      <div className="dashboard">
        <DashboardMenu />
        <LeadsTable />
      </div>
    </main>
  );
}
