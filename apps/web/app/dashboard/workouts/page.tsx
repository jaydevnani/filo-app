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
  
  // Fetch user's workout splits
  const { data: splits } = await supabase
    .from('workout_splits')
    .select('*')
    .eq('user_id', user!.id)
    .order('order_in_rotation', { ascending: true })
  
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
    // Count unique exercises by exercise_id
    const uniqueExerciseIds = new Set(
      session.workout_sets?.map((set: { exercise_id: string }) => set.exercise_id) || []
    )
    const totalExercises = uniqueExerciseIds.size
    
    const totalVolume = session.workout_sets?.reduce((sum: number, set: { reps: number; weight_kg: number | null }) => {
      return sum + (set.reps * (set.weight_kg || 0))
    }, 0) || 0
    
    return {
      ...session,
      totalExercises,
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
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/workouts/setup"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-800/50 text-slate-300 font-medium rounded-xl hover:bg-slate-800 hover:text-white transition-all border border-slate-700/50"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            {splits && splits.length > 0 ? 'Edit Split' : 'Setup Split'}
          </Link>
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
      </div>

      {/* Current Split */}
      {splits && splits.length > 0 && (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-white">Your Workout Split</h2>
            <span className="text-xs text-slate-500">{splits.length} day rotation</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {splits.map((split, index) => {
              const colorMap: Record<string, string> = {
                emerald: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
                cyan: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
                violet: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
                amber: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
                rose: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
                blue: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
              }
              const colorClass = colorMap[split.color] || colorMap.emerald
              return (
                <div
                  key={split.id}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${colorClass}`}
                >
                  {split.is_rest_day ? '😴 ' : ''}{split.name}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Setup Prompt (if no splits) */}
      {(!splits || splits.length === 0) && (
        <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20">
              <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-white">Set up your workout split</h3>
              <p className="text-sm text-slate-400 mt-1">
                Define your training rotation (Push/Pull/Legs, Upper/Lower, etc.) and Filo will generate personalized daily workouts for you.
              </p>
              <Link
                href="/dashboard/workouts/setup"
                className="inline-flex items-center gap-2 mt-3 text-sm font-medium text-emerald-400 hover:text-emerald-300 transition-colors"
              >
                Setup your split
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      )}

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
                      <p className="text-sm font-medium text-white">{session.totalExercises} exercises</p>
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


