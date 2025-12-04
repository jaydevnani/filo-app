'use client'

/**
 * Today's Workout Component
 * 
 * Shows the AI-generated workout for today based on the user's split.
 * Features:
 * - Generate workout button if none exists
 * - Display exercises with sets/reps
 * - Edit, delete, or get alternatives for each exercise
 * - Mark workout as completed or skipped
 * - Shows AI reasoning for the selection
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { findBestMatch, type Exercise as DBExercise } from '@/lib/fuzzyMatch'

interface Exercise {
  name: string
  sets: number
  reps: string
  rest_seconds: number
  notes?: string
}

interface PlannedWorkout {
  id: string
  date: string
  status: 'planned' | 'completed' | 'skipped' | 'rest'
  exercises: Exercise[]
  ai_reasoning: string
  split: {
    id: string
    name: string
    color: string
    muscle_groups: string[]
    is_rest_day: boolean
  }
}

const COLORS: Record<string, { bg: string; text: string; border: string }> = {
  emerald: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  cyan: { bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  violet: { bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
  amber: { bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  rose: { bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  blue: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
}

// Exercise Card Component with edit/delete/alternative features
function ExerciseCard({
  exercise,
  index,
  muscleGroups,
  onUpdate,
  onDelete,
}: {
  exercise: Exercise
  index: number
  muscleGroups: string[]
  onUpdate: (updated: Exercise) => void
  onDelete: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [loadingAlternatives, setLoadingAlternatives] = useState(false)
  const [alternatives, setAlternatives] = useState<Exercise[]>([])
  const [error, setError] = useState<string | null>(null)
  
  // Edit form state
  const [editName, setEditName] = useState(exercise.name)
  const [editSets, setEditSets] = useState(exercise.sets)
  const [editReps, setEditReps] = useState(exercise.reps)
  const [editRest, setEditRest] = useState(exercise.rest_seconds)

  const fetchAlternatives = async () => {
    setLoadingAlternatives(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/exercise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_alternative',
          exercise,
          muscleGroups,
        }),
      })
      
      const data = await response.json()
      
      if (data.error && response.status === 429) {
        setError('Rate limit reached. Try again in a minute.')
      } else if (data.alternatives) {
        setAlternatives(data.alternatives)
        setShowAlternatives(true)
      }
    } catch (err) {
      setError('Failed to get alternatives')
    } finally {
      setLoadingAlternatives(false)
    }
  }

  const handleSaveEdit = () => {
    onUpdate({
      ...exercise,
      name: editName,
      sets: editSets,
      reps: editReps,
      rest_seconds: editRest,
    })
    setIsEditing(false)
  }

  const handleSelectAlternative = (alt: Exercise) => {
    onUpdate({
      name: alt.name,
      sets: alt.sets,
      reps: alt.reps,
      rest_seconds: alt.rest_seconds,
      notes: alt.reason || exercise.notes,
    })
    setShowAlternatives(false)
    setAlternatives([])
  }

  // Editing mode
  if (isEditing) {
    return (
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
          placeholder="Exercise name"
        />
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs text-slate-400">Sets</label>
            <input
              type="number"
              value={editSets}
              onChange={(e) => setEditSets(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Reps</label>
            <input
              type="text"
              value={editReps}
              onChange={(e) => setEditReps(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Rest (s)</label>
            <input
              type="number"
              value={editRest}
              onChange={(e) => setEditRest(Number(e.target.value))}
              className="w-full px-3 py-2 bg-slate-900/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2">
          <button
            onClick={() => setIsEditing(false)}
            className="px-3 py-1.5 text-sm text-slate-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSaveEdit}
            className="px-3 py-1.5 text-sm bg-emerald-500 text-slate-950 font-medium rounded-lg hover:bg-emerald-400 transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    )
  }

  // Alternatives view
  if (showAlternatives && alternatives.length > 0) {
    return (
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700/50 space-y-3">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-white">Alternatives for {exercise.name}</p>
          <button
            onClick={() => {
              setShowAlternatives(false)
              setAlternatives([])
            }}
            className="text-slate-400 hover:text-white"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="space-y-2">
          {alternatives.map((alt, i) => (
            <button
              key={i}
              onClick={() => handleSelectAlternative(alt)}
              className="w-full p-3 text-left rounded-lg bg-slate-900/50 hover:bg-slate-900 border border-slate-700/30 hover:border-emerald-500/30 transition-all"
            >
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-medium text-white">{alt.name}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{alt.reason}</p>
                </div>
                <span className="text-sm text-slate-400">{alt.sets}×{alt.reps}</span>
              </div>
            </button>
          ))}
        </div>
        <button
          onClick={() => {
            setShowAlternatives(false)
            setIsEditing(true)
          }}
          className="w-full py-2 text-sm text-slate-400 hover:text-white transition-colors"
        >
          Or edit manually...
        </button>
      </div>
    )
  }

  // Normal display
  return (
    <div className="group flex items-center justify-between p-3 rounded-xl bg-slate-950/30 hover:bg-slate-950/50 transition-colors">
      <div className="flex items-center gap-3 flex-1 min-w-0">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-800/50 text-xs font-medium text-slate-400 shrink-0">
          {index + 1}
        </span>
        <div className="min-w-0">
          <p className="font-medium text-white truncate">{exercise.name}</p>
          {exercise.notes && (
            <p className="text-xs text-slate-500 truncate">{exercise.notes}</p>
          )}
        </div>
      </div>
      
      <div className="flex items-center gap-3">
        <div className="text-right">
          <p className="text-sm font-medium text-white">
            {exercise.sets} × {exercise.reps}
          </p>
          <p className="text-xs text-slate-500">
            {exercise.rest_seconds}s rest
          </p>
        </div>
        
        {/* Action buttons - show on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={fetchAlternatives}
            disabled={loadingAlternatives}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors"
            title="Suggest alternatives"
          >
            {loadingAlternatives ? (
              <div className="w-4 h-4 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin" />
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            )}
          </button>
          <button
            onClick={() => setIsEditing(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors"
            title="Edit exercise"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            title="Remove exercise"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      
      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}
    </div>
  )
}

export function TodaysWorkout() {
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)
  const [workout, setWorkout] = useState<PlannedWorkout | null>(null)
  const [hasSplits, setHasSplits] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    fetchTodaysWorkout()
  }, [])

  const fetchTodaysWorkout = async () => {
    try {
      const response = await fetch('/api/ai/workout')
      const data = await response.json()

      if (data.todayWorkout) {
        setWorkout(data.todayWorkout)
      }
      setHasSplits(data.hasSplits)
    } catch (err) {
      console.error('Error fetching workout:', err)
    } finally {
      setLoading(false)
    }
  }

  const generateWorkout = async () => {
    setGenerating(true)
    setError(null)

    try {
      const response = await fetch('/api/ai/workout', {
        method: 'POST',
      })
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate workout')
      }

      setWorkout(data.planned_workout)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate workout')
    } finally {
      setGenerating(false)
    }
  }

  const updateWorkoutStatus = async (status: 'completed' | 'skipped' | 'planned') => {
    if (!workout) return

    setUpdating(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // If undoing from completed, delete the associated workout session and its sets
      if (status === 'planned' && workout.status === 'completed') {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date()
        todayEnd.setHours(23, 59, 59, 999)

        // Find the session first
        const { data: sessionToDelete } = await supabase
          .from('workout_sessions')
          .select('id')
          .eq('user_id', user.id)
          .eq('name', workout.split?.name || 'Workout')
          .gte('started_at', todayStart.toISOString())
          .lte('started_at', todayEnd.toISOString())
          .single()

        if (sessionToDelete) {
          // Delete sets first (due to foreign key)
          await supabase
            .from('workout_sets')
            .delete()
            .eq('session_id', sessionToDelete.id)

          // Then delete the session
          await supabase
            .from('workout_sessions')
            .delete()
            .eq('id', sessionToDelete.id)
        }
      }

      // Update planned workout status
      const { error } = await supabase
        .from('planned_workouts')
        .update({ 
          status,
          completed_at: status === 'completed' ? new Date().toISOString() : null,
        })
        .eq('id', workout.id)

      if (error) throw error

      // If completing, create workout_session with real workout_sets
      if (status === 'completed' && workout.exercises && workout.exercises.length > 0) {
        // Fetch all exercises from database for fuzzy matching
        const { data: dbExercises } = await supabase
          .from('exercises')
          .select('id, name, muscle_group, equipment')

        const exerciseList: DBExercise[] = dbExercises || []

        // Create workout session
        const { data: session, error: sessionError } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: user.id,
            name: workout.split?.name || 'Workout',
            started_at: new Date().toISOString(),
          })
          .select()
          .single()

        if (sessionError || !session) {
          console.error('Error creating session:', sessionError)
        } else {
          // Process each exercise with fuzzy matching
          const setsToInsert: Array<{
            session_id: string
            exercise_id: string
            set_number: number
            reps: number
            weight_kg: number | null
          }> = []

          for (const exercise of workout.exercises) {
            // Find best match in database
            const match = findBestMatch(exercise.name, exerciseList, 70)
            
            let exerciseId: string

            if (match.isNewExercise || !match.exercise) {
              // Create new exercise in database
              const muscleGroup = workout.split?.muscle_groups?.[0] || 'other'
              const { data: newExercise, error: newExerciseError } = await supabase
                .from('exercises')
                .insert({
                  name: exercise.name,
                  muscle_group: muscleGroup,
                  equipment: 'other',
                })
                .select()
                .single()

              if (newExerciseError || !newExercise) {
                console.error('Error creating exercise:', newExerciseError)
                continue
              }
              exerciseId = newExercise.id
              
              // Add to local list for future matches in this batch
              exerciseList.push({
                id: newExercise.id,
                name: newExercise.name,
                muscle_group: newExercise.muscle_group,
              })
            } else {
              exerciseId = match.exercise.id
            }

            // Parse reps from string (e.g., "8-10" -> 8, "12" -> 12)
            const repsMatch = exercise.reps.match(/\d+/)
            const reps = repsMatch ? parseInt(repsMatch[0]) : 10

            // Create sets for this exercise
            for (let setNum = 1; setNum <= exercise.sets; setNum++) {
              setsToInsert.push({
                session_id: session.id,
                exercise_id: exerciseId,
                set_number: setNum,
                reps: reps,
                weight_kg: null, // User didn't log actual weight
              })
            }
          }

          // Insert all sets
          if (setsToInsert.length > 0) {
            const { error: setsError } = await supabase
              .from('workout_sets')
              .insert(setsToInsert)

            if (setsError) {
              console.error('Error inserting sets:', setsError)
            }
          }
        }
      }

      setWorkout({ ...workout, status })
      
      // Refresh the page to update server components (like Recent Workouts)
      if (status === 'completed' || (status === 'planned' && workout.status === 'completed')) {
        router.refresh()
      }
    } catch (err) {
      console.error('Error updating workout:', err)
    } finally {
      setUpdating(false)
    }
  }

  const updateExercise = async (index: number, updated: Exercise) => {
    if (!workout) return

    const newExercises = [...workout.exercises]
    newExercises[index] = updated

    try {
      const { error } = await supabase
        .from('planned_workouts')
        .update({ exercises: newExercises })
        .eq('id', workout.id)

      if (error) throw error

      setWorkout({ ...workout, exercises: newExercises })
    } catch (err) {
      console.error('Error updating exercise:', err)
    }
  }

  const deleteExercise = async (index: number) => {
    if (!workout) return

    const newExercises = workout.exercises.filter((_, i) => i !== index)

    try {
      const { error } = await supabase
        .from('planned_workouts')
        .update({ exercises: newExercises })
        .eq('id', workout.id)

      if (error) throw error

      setWorkout({ ...workout, exercises: newExercises })
    } catch (err) {
      console.error('Error deleting exercise:', err)
    }
  }

  const color = workout?.split?.color ? COLORS[workout.split.color] : COLORS.emerald

  if (loading) {
    return (
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-slate-800 rounded w-1/3"></div>
          <div className="h-4 bg-slate-800 rounded w-2/3"></div>
          <div className="h-20 bg-slate-800 rounded"></div>
        </div>
      </div>
    )
  }

  // No splits configured
  if (!hasSplits) {
    return (
      <div className="rounded-2xl bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
            <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Set Up Your Workout Split</h3>
            <p className="text-slate-400 mt-1">
              Define your training rotation and Filo will generate personalized daily workouts for you.
            </p>
            <Link
              href="/dashboard/workouts/setup"
              className="inline-flex items-center gap-2 mt-4 px-4 py-2 bg-emerald-500 text-slate-950 font-medium rounded-xl hover:bg-emerald-400 transition-colors"
            >
              Setup Your Split
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // No workout generated yet
  if (!workout) {
    return (
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-cyan-400">
            <svg className="w-6 h-6 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-white">Ready for Today's Workout?</h3>
            <p className="text-slate-400 mt-1">
              Let Filo generate your personalized workout based on your split and training history.
            </p>
            {error && (
              <p className="text-red-400 text-sm mt-2">{error}</p>
            )}
            <button
              onClick={generateWorkout}
              disabled={generating}
              className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 transition-all"
            >
              {generating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-950 border-t-transparent" />
                  Generating...
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                  Generate Today's Workout
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Rest day
  if (workout.status === 'rest' || workout.split?.is_rest_day) {
    return (
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-slate-800/50 text-4xl">
            😴
          </div>
          <div>
            <h3 className="text-lg font-semibold text-white">Rest Day</h3>
            <p className="text-slate-400">Recovery is part of progress. Take it easy today!</p>
          </div>
        </div>
      </div>
    )
  }

  // Completed workout
  if (workout.status === 'completed') {
    return (
      <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-emerald-500/20">
              <svg className="w-7 h-7 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {workout.split?.name} — Completed! 🎉
              </h3>
              <p className="text-slate-400">Great work today! Rest up for tomorrow.</p>
            </div>
          </div>
          <button
            onClick={() => updateWorkoutStatus('planned')}
            disabled={updating}
            className="px-3 py-1.5 text-sm text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors"
          >
            Undo
          </button>
        </div>
      </div>
    )
  }

  // Skipped workout
  if (workout.status === 'skipped') {
    return (
      <div className="rounded-2xl bg-amber-500/10 border border-amber-500/20 p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
              <svg className="w-7 h-7 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">
                {workout.split?.name} — Skipped
              </h3>
              <p className="text-slate-400">No worries! We'll reschedule this in your rotation.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => updateWorkoutStatus('planned')}
              disabled={updating}
              className="px-3 py-1.5 text-sm text-amber-400 hover:text-white hover:bg-amber-500/20 rounded-lg transition-colors"
            >
              Undo
            </button>
            <button
              onClick={() => updateWorkoutStatus('completed')}
              disabled={updating}
              className="px-3 py-1.5 text-sm text-emerald-400 hover:text-white hover:bg-emerald-500/20 rounded-lg transition-colors"
            >
              Mark Done
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Active planned workout
  return (
    <div className={`rounded-2xl ${color.bg} border ${color.border} overflow-hidden`}>
      {/* Header */}
      <div className="p-6 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`text-xs font-medium ${color.text} bg-slate-950/30 px-2 py-0.5 rounded`}>
                Today
              </span>
            </div>
            <h3 className="text-xl font-bold text-white">{workout.split?.name}</h3>
            {workout.split?.muscle_groups && (
              <p className="text-sm text-slate-400 mt-1">
                {workout.split.muscle_groups.join(' • ')}
              </p>
            )}
          </div>
        </div>
        {workout.ai_reasoning && (
          <p className="text-sm text-slate-300 mt-3 italic">
            💡 {workout.ai_reasoning}
          </p>
        )}
      </div>

      {/* Exercises */}
      {workout.exercises && workout.exercises.length > 0 && (
        <div className="px-6 pb-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-slate-400">Exercises</h4>
            <span className="text-xs text-slate-500">Hover for options</span>
          </div>
          <div className="space-y-2">
            {workout.exercises.map((exercise, i) => (
              <ExerciseCard
                key={i}
                exercise={exercise}
                index={i}
                muscleGroups={workout.split?.muscle_groups || []}
                onUpdate={(updated) => updateExercise(i, updated)}
                onDelete={() => deleteExercise(i)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="p-4 bg-slate-950/20 flex gap-3">
        <button
          onClick={() => updateWorkoutStatus('skipped')}
          disabled={updating}
          className="flex-1 px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/50 font-medium transition-colors disabled:opacity-50"
        >
          Skip Today
        </button>
        <button
          onClick={() => updateWorkoutStatus('completed')}
          disabled={updating}
          className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition-colors disabled:opacity-50"
        >
          {updating ? 'Saving...' : 'Mark Complete'}
        </button>
      </div>
    </div>
  )
}
