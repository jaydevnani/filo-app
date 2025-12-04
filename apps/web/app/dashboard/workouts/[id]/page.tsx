/**
 * Workout Detail Page
 * 
 * Shows the details of a specific workout session.
 * Server component - fetches data directly from Supabase.
 */

import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { DeleteWorkoutButton } from './DeleteWorkoutButton'
import { EditableSets } from './EditableSets'
import { AddExercise } from './AddExercise'

type Props = {
  params: Promise<{ id: string }>
}

export default async function WorkoutDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  
  // Fetch the workout session with all sets and exercise details
  const { data: session, error } = await supabase
    .from('workout_sessions')
    .select(`
      *,
      workout_sets (
        id,
        set_number,
        reps,
        weight_kg,
        rpe,
        notes,
        exercise:exercises (
          id,
          name,
          muscle_group,
          equipment
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !session) {
    notFound()
  }

  // Group sets by exercise
  const exerciseGroups = session.workout_sets.reduce<Record<string, {
    exercise: { id: string; name: string; muscle_group: string; equipment: string | null }
    sets: typeof session.workout_sets
  }>>((acc, set) => {
    const exerciseId = set.exercise.id
    if (!acc[exerciseId]) {
      acc[exerciseId] = {
        exercise: set.exercise,
        sets: [],
      }
    }
    acc[exerciseId].sets.push(set)
    return acc
  }, {})

  // Calculate stats
  const totalSets = session.workout_sets.length
  const totalReps = session.workout_sets.reduce((sum, set) => sum + set.reps, 0)
  const totalVolume = session.workout_sets.reduce((sum, set) => sum + (set.reps * (set.weight_kg || 0)), 0)
  const exerciseCount = Object.keys(exerciseGroups).length

  // Format dates
  const startDate = new Date(session.started_at)
  const formattedDate = startDate.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
  const formattedTime = startDate.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
  })

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/workouts"
            className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-white">
              {session.name || 'Workout Session'}
            </h1>
            <p className="text-slate-400 text-sm">
              {formattedDate} at {formattedTime}
            </p>
          </div>
        </div>
        <DeleteWorkoutButton sessionId={session.id} />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <p className="text-2xl font-bold text-white">{exerciseCount}</p>
          <p className="text-sm text-slate-400">Exercises</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <p className="text-2xl font-bold text-white">{totalSets}</p>
          <p className="text-sm text-slate-400">Sets</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <p className="text-2xl font-bold text-white">{totalReps}</p>
          <p className="text-sm text-slate-400">Reps</p>
        </div>
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <p className="text-2xl font-bold text-white">{Math.round(totalVolume).toLocaleString()}</p>
          <p className="text-sm text-slate-400">kg Volume</p>
        </div>
      </div>

      {/* Notes */}
      {session.notes && (
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
          <h3 className="text-sm font-medium text-slate-400 mb-2">Notes</h3>
          <p className="text-white">{session.notes}</p>
        </div>
      )}

      {/* Exercise List */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-white">Exercises</h2>
        
        {Object.values(exerciseGroups).map(({ exercise, sets }) => (
          <EditableSets
            key={exercise.id}
            sessionId={session.id}
            exerciseId={exercise.id}
            exerciseName={exercise.name}
            muscleGroup={exercise.muscle_group}
            equipment={exercise.equipment}
            initialSets={sets.map(s => ({
              id: s.id,
              set_number: s.set_number,
              reps: s.reps,
              weight_kg: s.weight_kg,
            }))}
          />
        ))}

        {/* Add New Exercise */}
        <AddExercise sessionId={session.id} />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-4">
        <Link
          href="/dashboard/workouts"
          className="flex-1 py-3 px-4 text-center rounded-xl border border-slate-700 text-white font-medium hover:bg-slate-800 transition-colors"
        >
          Back to Workouts
        </Link>
        <Link
          href="/dashboard/workouts/new"
          className="flex-1 py-3 px-4 text-center bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition-all"
        >
          New Workout
        </Link>
      </div>
    </div>
  )
}


