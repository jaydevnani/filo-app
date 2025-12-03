'use client'

/**
 * New Workout Page
 * 
 * Allows users to log a new workout session with exercises and sets.
 * Client component because it needs heavy interactivity:
 * - Adding/removing exercises
 * - Adding/removing sets
 * - Real-time form state
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Exercise = {
  id: string
  name: string
  muscle_group: string
  equipment: string | null
}

type WorkoutSet = {
  id: string  // Temporary client-side ID
  exercise_id: string
  exercise_name: string
  set_number: number
  reps: number | ''
  weight_kg: number | ''
}

type ExerciseGroup = {
  exercise_id: string
  exercise_name: string
  sets: WorkoutSet[]
}

export default function NewWorkoutPage() {
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [workoutName, setWorkoutName] = useState('')
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>([])
  const [selectedExercise, setSelectedExercise] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  // Fetch exercises on mount
  useEffect(() => {
    async function fetchExercises() {
      setLoading(true)
      const { data, error } = await supabase
        .from('exercises')
        .select('*')
        .order('muscle_group')
        .order('name')
      
      if (error) {
        setError('Failed to load exercises')
      } else {
        setExercises(data || [])
      }
      setLoading(false)
    }
    
    fetchExercises()
  }, [supabase])

  // Group sets by exercise for display
  const groupedSets = workoutSets.reduce<ExerciseGroup[]>((groups, set) => {
    const existing = groups.find(g => g.exercise_id === set.exercise_id)
    if (existing) {
      existing.sets.push(set)
    } else {
      groups.push({
        exercise_id: set.exercise_id,
        exercise_name: set.exercise_name,
        sets: [set],
      })
    }
    return groups
  }, [])

  // Add a new exercise to the workout
  const addExercise = () => {
    if (!selectedExercise) return
    
    const exercise = exercises.find(e => e.id === selectedExercise)
    if (!exercise) return

    // Add first set for this exercise
    const newSet: WorkoutSet = {
      id: crypto.randomUUID(),
      exercise_id: exercise.id,
      exercise_name: exercise.name,
      set_number: 1,
      reps: '',
      weight_kg: '',
    }
    
    setWorkoutSets([...workoutSets, newSet])
    setSelectedExercise('')
  }

  // Add another set to an exercise
  const addSet = (exerciseId: string, exerciseName: string) => {
    const existingSets = workoutSets.filter(s => s.exercise_id === exerciseId)
    const newSetNumber = existingSets.length + 1
    
    const newSet: WorkoutSet = {
      id: crypto.randomUUID(),
      exercise_id: exerciseId,
      exercise_name: exerciseName,
      set_number: newSetNumber,
      reps: '',
      weight_kg: '',
    }
    
    setWorkoutSets([...workoutSets, newSet])
  }

  // Update a set's values
  const updateSet = (setId: string, field: 'reps' | 'weight_kg', value: string) => {
    setWorkoutSets(sets => 
      sets.map(set => 
        set.id === setId 
          ? { ...set, [field]: value === '' ? '' : Number(value) }
          : set
      )
    )
  }

  // Remove a set
  const removeSet = (setId: string) => {
    setWorkoutSets(sets => {
      const filtered = sets.filter(s => s.id !== setId)
      // Renumber sets for each exercise
      const renumbered = filtered.map(set => {
        const setsForExercise = filtered.filter(s => s.exercise_id === set.exercise_id)
        const index = setsForExercise.findIndex(s => s.id === set.id)
        return { ...set, set_number: index + 1 }
      })
      return renumbered
    })
  }

  // Remove all sets for an exercise
  const removeExercise = (exerciseId: string) => {
    setWorkoutSets(sets => sets.filter(s => s.exercise_id !== exerciseId))
  }

  // Save the workout
  const saveWorkout = async () => {
    if (workoutSets.length === 0) {
      setError('Add at least one exercise to save')
      return
    }

    // Validate all sets have reps
    const incompleteSets = workoutSets.filter(s => s.reps === '' || s.reps === 0)
    if (incompleteSets.length > 0) {
      setError('Please enter reps for all sets')
      return
    }

    setSaving(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Create the workout session
      const { data: session, error: sessionError } = await supabase
        .from('workout_sessions')
        .insert({
          user_id: user.id,
          name: workoutName || null,
          started_at: new Date().toISOString(),
          completed_at: new Date().toISOString(),
        })
        .select()
        .single()

      if (sessionError) throw sessionError

      // Insert all sets
      const setsToInsert = workoutSets.map(set => ({
        session_id: session.id,
        exercise_id: set.exercise_id,
        set_number: set.set_number,
        reps: set.reps as number,
        weight_kg: set.weight_kg === '' ? null : set.weight_kg,
      }))

      const { error: setsError } = await supabase
        .from('workout_sets')
        .insert(setsToInsert)

      if (setsError) throw setsError

      // Success! Redirect to the workout detail page
      router.push(`/dashboard/workouts/${session.id}`)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save workout')
    } finally {
      setSaving(false)
    }
  }

  // Group exercises by muscle group for the dropdown
  const exercisesByGroup = exercises.reduce<Record<string, Exercise[]>>((acc, ex) => {
    if (!acc[ex.muscle_group]) acc[ex.muscle_group] = []
    acc[ex.muscle_group].push(ex)
    return acc
  }, {})

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button
          onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-slate-800 transition-colors"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold text-white">New Workout</h1>
          <p className="text-slate-400 text-sm">Log your exercises and sets</p>
        </div>
      </div>

      {/* Workout Name */}
      <div>
        <input
          type="text"
          value={workoutName}
          onChange={(e) => setWorkoutName(e.target.value)}
          placeholder="Workout name (optional, e.g. Push Day)"
          className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
        />
      </div>

      {/* Add Exercise */}
      <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50">
        <label className="block text-sm font-medium text-slate-300 mb-2">Add Exercise</label>
        <div className="flex gap-2">
          <select
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
            disabled={loading}
            className="flex-1 px-4 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all appearance-none cursor-pointer"
          >
            <option value="">Select an exercise...</option>
            {Object.entries(exercisesByGroup).map(([group, exs]) => (
              <optgroup key={group} label={group}>
                {exs.map(ex => (
                  <option key={ex.id} value={ex.id}>
                    {ex.name} {ex.equipment && `(${ex.equipment})`}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
          <button
            onClick={addExercise}
            disabled={!selectedExercise}
            className="px-4 py-2.5 bg-emerald-500/10 text-emerald-400 font-medium rounded-xl hover:bg-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Add
          </button>
        </div>
      </div>

      {/* Exercise List */}
      {groupedSets.length > 0 && (
        <div className="space-y-4">
          {groupedSets.map((group) => (
            <div key={group.exercise_id} className="rounded-xl bg-slate-900/50 border border-slate-800/50 overflow-hidden">
              {/* Exercise Header */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-800/30 border-b border-slate-800/50">
                <h3 className="font-medium text-white">{group.exercise_name}</h3>
                <button
                  onClick={() => removeExercise(group.exercise_id)}
                  className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              </div>

              {/* Sets */}
              <div className="p-4 space-y-2">
                {/* Header Row */}
                <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-400 px-1">
                  <div className="col-span-2">SET</div>
                  <div className="col-span-4">WEIGHT (kg)</div>
                  <div className="col-span-4">REPS</div>
                  <div className="col-span-2"></div>
                </div>

                {/* Set Rows */}
                {group.sets.map((set) => (
                  <div key={set.id} className="grid grid-cols-12 gap-2 items-center">
                    <div className="col-span-2">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 text-slate-300 text-sm font-medium">
                        {set.set_number}
                      </span>
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        value={set.weight_kg}
                        onChange={(e) => updateSet(set.id, 'weight_kg', e.target.value)}
                        placeholder="0"
                        step="0.5"
                        min="0"
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                    <div className="col-span-4">
                      <input
                        type="number"
                        value={set.reps}
                        onChange={(e) => updateSet(set.id, 'reps', e.target.value)}
                        placeholder="0"
                        min="0"
                        className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                      />
                    </div>
                    <div className="col-span-2 flex justify-end">
                      <button
                        onClick={() => removeSet(set.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add Set Button */}
                <button
                  onClick={() => addSet(group.exercise_id, group.exercise_name)}
                  className="w-full py-2 text-sm text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/5 rounded-lg transition-colors"
                >
                  + Add Set
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {groupedSets.length === 0 && (
        <div className="text-center py-12 text-slate-400">
          <p>No exercises added yet.</p>
          <p className="text-sm">Select an exercise above to get started.</p>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Save Button */}
      <div className="flex gap-3 pt-4">
        <button
          onClick={() => router.back()}
          className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-white font-medium hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={saveWorkout}
          disabled={saving || workoutSets.length === 0}
          className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
        >
          {saving ? 'Saving...' : 'Save Workout'}
        </button>
      </div>
    </div>
  )
}


