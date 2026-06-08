'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export async function signInWithEmail(email: string, password: string) {
  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return { error: error.message }
  }

  // Check if user has admin/manager/coach/doctor role
  if (data.user) {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', data.user.id)
      .single()

    if (profileError || !profile) {
      // Sign out if no profile found
      await supabase.auth.signOut()
      return { error: 'حساب کاربری یافت نشد' }
    }

    const allowedRoles = ['admin', 'gym_manager', 'coach', 'doctor']
    if (!allowedRoles.includes(profile.role)) {
      await supabase.auth.signOut()
      return { error: 'شما دسترسی به پنل مدیریت ندارید' }
    }

    return { success: true, role: profile.role, fullName: profile.full_name }
  }

  return { error: 'خطای ناشناخته' }
}

export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  redirect('/login')
}

export async function getCurrentUserProfile() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (profileError) {
    return null
  }

  return profile
}

export async function getSession() {
  const supabase = await createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}