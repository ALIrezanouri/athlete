import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminHeader from '@/components/admin/admin-header'
import AdminSidebar from '@/components/admin/admin-sidebar'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    redirect('/login')
  }

  // Fetch user profile for role
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single()

  if (profileError || !profile) {
    redirect('/login?error=no_profile')
  }

  const allowedRoles = ['admin', 'gym_manager', 'coach', 'doctor']
  if (!allowedRoles.includes(profile.role)) {
    // Sign out the unauthorized user so they don't stay authenticated
    await supabase.auth.signOut()
    redirect('/login?error=access_denied')
  }

  return (
    <div dir="rtl" className="min-h-screen bg-background">
      <AdminHeader userName={profile.full_name || 'مدیر'} />
      <div className="flex">
        <AdminSidebar role={profile.role} />
        <main className="flex-1 p-6 mr-64">
          {children}
        </main>
      </div>
    </div>
  )
}