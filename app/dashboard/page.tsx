import LeadsTable from "@/components/Leads";
import DashboardMenu from "@/components/DashboardMenu";
import UserGreeting from "@/components/UserGreeting";

export default async function Dashboard() {
  return (
    <main className="flex-1 py-4">
      <div className="dashboard">
        <DashboardMenu />
        <div>
          <div>
            <UserGreeting />
          </div>
          <div>
            <LeadsTable />
          </div>
        </div>
      </div>
    </main>
  );
}
