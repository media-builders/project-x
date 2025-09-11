import LeadsTable from "@/components/Leads";
import DashboardMenu from "@/components/DashboardMenu";
import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'

export default async function Dashboard() {
    const supabase = createClient()

    const { data, error } = await supabase.auth.getUser()
    if (error || !data?.user) {
        redirect('/login')
    }

    return (
        <main className="flex-1">
            <div className="dashboard">
            <div className="container">
                Hello {data.user.email} welcome to BrokerNest
            </div>
                <DashboardMenu />
                <LeadsTable />
            </div>
        </main>)

}