import LeadsTable from "@/components/Leads";
import DashboardMenu from "@/components/DashboardMenu";
import UserGreeting from "@/components/UserGreeting";

export default async function Dashboard() {
  return (
    <main className="flex-1">
      <div className="dashboard">
        <DashboardMenu />
        <div className="dashboard-window">
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
