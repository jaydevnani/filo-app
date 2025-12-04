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
import Link from 'next/link'
import { AICoach } from './components/AICoach'
import { TodaysWorkout } from './components/TodaysWorkout'

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

  // Calculate start of current week (Monday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - (dayOfWeek === 0 ? 6 : dayOfWeek - 1))
  startOfWeek.setHours(0, 0, 0, 0)

  // Get start and end of today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Fetch workouts this week
  const { data: weekWorkouts } = await supabase
    .from('workout_sessions')
    .select(`
      id,
      started_at,
      workout_sets (
        reps,
        weight_kg
      )
    `)
    .eq('user_id', user!.id)
    .gte('started_at', startOfWeek.toISOString())
    .order('started_at', { ascending: false })

  // Calculate workout stats
  const workoutsThisWeek = weekWorkouts?.length || 0
  const totalVolumeThisWeek = weekWorkouts?.reduce((total, session) => {
    const sessionVolume = session.workout_sets?.reduce((sum: number, set: { reps: number; weight_kg: number | null }) => {
      return sum + (set.reps * (set.weight_kg || 0))
    }, 0) || 0
    return total + sessionVolume
  }, 0) || 0

  // Fetch today's food logs
  const { data: todayFood } = await supabase
    .from('food_logs')
    .select('calories, protein_g')
    .eq('user_id', user!.id)
    .gte('logged_at', today.toISOString())
    .lt('logged_at', tomorrow.toISOString())

  // Calculate nutrition stats
  const todayCalories = todayFood?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0
  const todayProtein = todayFood?.reduce((sum, log) => sum + (log.protein_g || 0), 0) || 0

  // Get recent workouts for display
  const { data: recentWorkouts } = await supabase
    .from('workout_sessions')
    .select(`
      id,
      name,
      started_at,
      workout_sets (
        id
      )
    `)
    .eq('user_id', user!.id)
    .order('started_at', { ascending: false })
    .limit(3)

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

      {/* Stats Overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Workouts This Week */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{workoutsThisWeek}</p>
              <p className="text-sm text-slate-400">Workouts this week</p>
            </div>
          </div>
        </div>

        {/* Volume This Week */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-5">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10">
              <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{Math.round(totalVolumeThisWeek).toLocaleString()}</p>
              <p className="text-sm text-slate-400">kg volume this week</p>
            </div>
          </div>
        </div>

        {/* Calories Today */}
        <Link href="/dashboard/nutrition" className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-5 hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-violet-500/10">
              <svg className="w-5 h-5 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 18.657A8 8 0 016.343 7.343S7 9 9 10c0-2 .5-5 2.986-7C14 5 16.09 5.777 17.656 7.343A7.975 7.975 0 0120 13a7.975 7.975 0 01-2.343 5.657z" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{todayCalories || '--'}</p>
              <p className="text-sm text-slate-400">Calories today</p>
            </div>
          </div>
        </Link>

        {/* Protein Today */}
        <Link href="/dashboard/nutrition" className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-5 hover:bg-slate-800/50 transition-colors">
          <div className="flex items-center gap-4">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-500/10">
              <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{todayProtein ? `${Math.round(todayProtein)}g` : '--'}</p>
              <p className="text-sm text-slate-400">Protein today</p>
            </div>
          </div>
        </Link>
      </div>

      {/* Today's Workout */}
      <TodaysWorkout />

      {/* Quick Actions + Recent Workouts */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Quick Actions */}
        <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6">
          <h3 className="text-lg font-semibold text-white mb-2">Quick Actions</h3>
          <p className="text-slate-400 text-sm mb-4">
            Log your training and nutrition to track your progress.
          </p>
          <div className="flex gap-3">
            <Link 
              href="/dashboard/workouts/new" 
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/20 px-4 py-2.5 text-sm font-medium text-emerald-400 hover:bg-emerald-500/30 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Log Workout
            </Link>
            <Link 
              href="/dashboard/nutrition/new" 
              className="inline-flex items-center gap-2 rounded-xl bg-slate-800/50 px-4 py-2.5 text-sm font-medium text-white hover:bg-slate-800 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Log Food
            </Link>
          </div>
        </div>

        {/* Recent Workouts */}
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Recent Workouts</h3>
            <Link href="/dashboard/workouts" className="text-sm text-emerald-400 hover:text-emerald-300">
              View all →
            </Link>
          </div>
          
          {recentWorkouts && recentWorkouts.length > 0 ? (
            <div className="space-y-3">
              {recentWorkouts.map((workout) => {
                const date = new Date(workout.started_at)
                const formattedDate = date.toLocaleDateString('en-US', {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                })
                return (
                  <Link
                    key={workout.id}
                    href={`/dashboard/workouts/${workout.id}`}
                    className="flex items-center justify-between p-3 rounded-xl bg-slate-800/30 hover:bg-slate-800/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-white">{workout.name || 'Workout'}</p>
                        <p className="text-xs text-slate-400">{formattedDate}</p>
                      </div>
                    </div>
                    <span className="text-xs text-slate-400">{workout.workout_sets?.length || 0} sets</span>
                  </Link>
                )
              })}
            </div>
          ) : (
            <p className="text-sm text-slate-400">No workouts logged yet. Start tracking your progress!</p>
          )}
        </div>
      </div>

      {/* AI Coach */}
      <AICoach userName={profile?.display_name || 'there'} />
    </div>
  )
}
