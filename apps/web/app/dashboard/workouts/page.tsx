/**
 * Workouts List Page
 * 
 * Shows all workout sessions for the current user.
 * Server component - fetches data directly from Supabase.
 */

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function WorkoutsPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Fetch all workout sessions for this user, ordered by most recent
  const { data: sessions, error } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      workout_sets (
        id,
        exercise_id,
        reps,
        weight_kg
      )
    `)
    .eq('user_id', user!.id)
    .order('started_at', { ascending: false })

  // Calculate stats for each session
  const sessionsWithStats = sessions?.map(session => {
    const totalSets = session.workout_sets?.length || 0
    const totalVolume = session.workout_sets?.reduce((sum: number, set: { reps: number; weight_kg: number | null }) => {
      return sum + (set.reps * (set.weight_kg || 0))
    }, 0) || 0
    
    return {
      ...session,
      totalSets,
      totalVolume,
    }
  })

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Workouts</h1>
          <p className="text-slate-400 mt-1">Track your training sessions</p>
        </div>
        <Link
          href="/dashboard/workouts/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          New Workout
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          Error loading workouts: {error.message}
        </div>
      )}

      {/* Empty State */}
      {!error && (!sessionsWithStats || sessionsWithStats.length === 0) && (
        <div className="text-center py-16">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-800 mb-4">
            <svg className="w-8 h-8 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No workouts yet</h3>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">
            Start tracking your progress by logging your first workout session.
          </p>
          <Link
            href="/dashboard/workouts/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500/10 text-emerald-400 font-medium rounded-xl hover:bg-emerald-500/20 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
            Log your first workout
          </Link>
        </div>
      )}

      {/* Workouts List */}
      {sessionsWithStats && sessionsWithStats.length > 0 && (
        <div className="space-y-3">
          {sessionsWithStats.map((session) => {
            const date = new Date(session.started_at)
            const formattedDate = date.toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short',
              day: 'numeric',
            })
            const formattedTime = date.toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })

            return (
              <Link
                key={session.id}
                href={`/dashboard/workouts/${session.id}`}
                className="block p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 hover:bg-slate-800/50 hover:border-slate-700/50 transition-all group"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                        </svg>
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-medium text-white truncate">
                          {session.name || 'Workout Session'}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {formattedDate} at {formattedTime}
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-6 ml-4">
                    <div className="text-right hidden sm:block">
                      <p className="text-sm font-medium text-white">{session.totalSets} sets</p>
                      <p className="text-xs text-slate-400">{Math.round(session.totalVolume).toLocaleString()} kg vol</p>
                    </div>
                    <svg 
                      className="w-5 h-5 text-slate-500 group-hover:text-slate-300 transition-colors" 
                      fill="none" 
                      viewBox="0 0 24 24" 
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}


