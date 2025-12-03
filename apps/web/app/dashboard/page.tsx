/**
 * Dashboard Home Page
 * 
 * This is a SERVER COMPONENT (no 'use client'), so it can:
 * - Directly fetch data from Supabase
 * - Access the user's session
 * - Pre-render with real data (better performance & SEO)
 * 
 * The layout already ensures:
 * - User is authenticated
 * - Profile exists
 * 
 * So we can safely fetch and display user data here.
 */

import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  
  // Get user info
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get profile data
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user!.id)
    .single()

  return (
    <div className="space-y-8">
      {/* Welcome Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">
          Welcome back, <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">{profile?.display_name || 'there'}</span>
        </h1>
        <p className="mt-2 text-slate-400">
          Here&apos;s what&apos;s happening with your fitness journey
        </p>
      </div>

      {/* Stats Overview - Placeholder cards for now */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Workouts This Week */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-500/10">
              <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-sm text-slate-400">Workouts this week</p>
            </div>
          </div>
        </div>

        {/* Calories Today */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-cyan-500/10">
              <svg className="w-6 h-6 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">--</p>
              <p className="text-sm text-slate-400">Calories today</p>
            </div>
          </div>
        </div>

        {/* Protein Goal */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-violet-500/10">
              <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">--g</p>
              <p className="text-sm text-slate-400">Protein today</p>
            </div>
          </div>
        </div>

        {/* Current Streak */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500/10">
              <svg className="w-6 h-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">0</p>
              <p className="text-sm text-slate-400">Day streak</p>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Today's Plan Card */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Today&apos;s Plan</h3>
          <p className="text-slate-400 text-sm mb-4">
            No plan generated yet. Once you start logging workouts and meals, your AI coach will create personalized daily plans.
          </p>
          <button className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            Generate Plan
          </button>
        </div>

        {/* Quick Log Card */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Quick Actions</h3>
          <p className="text-slate-400 text-sm mb-4">
            Start tracking your fitness journey by logging your first workout or meal.
          </p>
          <div className="flex gap-3">
            <a 
              href="/dashboard/workouts" 
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Log Workout
            </a>
            <a 
              href="/dashboard/nutrition" 
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800 px-4 py-2 text-sm font-medium text-white hover:bg-slate-700 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Log Meal
            </a>
          </div>
        </div>
      </div>

      {/* Coach Insights - Placeholder */}
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400">
            <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Filo Coach</h3>
            <p className="mt-1 text-slate-400">
              Hey {profile?.display_name || 'there'}! 👋 I&apos;m your AI fitness coach. Once you start logging workouts and meals, I&apos;ll provide personalized insights and recommendations to help you reach your goals.
            </p>
          </div>
        </div>
      </div>

      {/* Debug: Profile Data */}
      <details className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-4">
        <summary className="text-sm text-slate-500 cursor-pointer">Debug: Profile Data</summary>
        <pre className="mt-4 text-xs text-slate-400 overflow-auto">
          {JSON.stringify(profile, null, 2)}
        </pre>
      </details>
    </div>
  )
}

