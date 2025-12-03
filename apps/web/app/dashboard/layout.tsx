/**
 * Dashboard Layout
 * 
 * WHAT IS A LAYOUT?
 * In Next.js App Router, layouts wrap pages. This layout wraps all pages
 * under /dashboard/*. It provides:
 * 1. Shared UI (sidebar, header)
 * 2. Shared logic (auth check, profile creation, onboarding redirect)
 * 
 * WHY AUTO-CREATE PROFILE HERE?
 * This layout runs for EVERY dashboard page. By checking/creating the
 * profile here, we guarantee the profile exists before any dashboard
 * page tries to use it. It's a single point of truth.
 * 
 * ONBOARDING REDIRECT
 * If the user hasn't completed onboarding (onboarding_completed !== true),
 * we redirect them to /onboarding to collect essential data for the AI coach.
 * 
 * SERVER COMPONENT
 * This is a server component (no 'use client'), so it can:
 * - Directly query the database
 * - Access cookies securely
 * - Run before the page is sent to the browser
 */

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { DashboardNav } from './components/DashboardNav'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  
  // Get the current user
  // getUser() is more secure than getSession() as it validates the JWT
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  
  // If not logged in, redirect to auth page
  // (Middleware should catch this, but this is a safety net)
  if (authError || !user) {
    redirect('/auth')
  }

  // Check if profile exists for this user
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()  // Returns null instead of error if no row found

  // If no profile exists, create one with defaults and redirect to onboarding
  if (!profile && !profileError) {
    const { error: insertError } = await supabase.from('profiles').insert({
      id: user.id,
      display_name: user.email?.split('@')[0] ?? 'New User',
      onboarding_completed: false,
    })
    
    if (insertError) {
      console.error('Failed to create profile:', insertError)
    }
    
    // Redirect new users to onboarding
    redirect('/onboarding')
  }

  // If profile exists but onboarding not completed, redirect to onboarding
  // This catches users who skipped or partially completed onboarding
  if (profile && !profile.onboarding_completed) {
    redirect('/onboarding')
  }

  return (
    <div className="min-h-screen bg-slate-950">
      {/* Dashboard Navigation */}
      <DashboardNav user={user} />
      
      {/* Main Content Area */}
      <main className="lg:pl-72">
        <div className="px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  )
}

