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
            <div className="container">
                Hello {data.user.email}
            </div>
            <div>
                <div class="dashboard-menu">
                    <ul>
                        <li>Leads</li>
                        <li>Settings</li>
                    </ul>
                </div>
                <div class="dashboard-window"></div>
            </div>
        </main>)

}