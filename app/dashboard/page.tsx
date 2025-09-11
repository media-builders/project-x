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

  // Derive a friendly display name from user metadata / identity data; fallback to email
  const user = data.user
  const um = (user?.user_metadata || {}) as Record<string, unknown>
  const id0 = user?.identities && user.identities.length > 0 ? user.identities[0] : undefined
  const idData = (id0?.identity_data || {}) as Record<string, unknown>

  const firstLast =
    typeof um.first_name === 'string' && typeof um.last_name === 'string'
      ? `${um.first_name} ${um.last_name}`
      : undefined

  const displayName =
    (typeof um.full_name === 'string' && um.full_name) ||
    (typeof um.name === 'string' && um.name) ||
    firstLast ||
    (typeof idData.name === 'string' && idData.name) ||
    user.email // final fallback

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
  )
}