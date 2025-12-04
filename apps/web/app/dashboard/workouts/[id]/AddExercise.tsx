'use client'

/**
 * Add Exercise Component
 * 
 * Compact button that expands to add a new exercise to the workout.
 */

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Exercise {
  id: string
  name: string
  muscle_group: string
}

interface AddExerciseProps {
  sessionId: string
}

export function AddExercise({ sessionId }: AddExerciseProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [search, setSearch] = useState('')
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null)
  const [sets, setSets] = useState(3)
  const [reps, setReps] = useState(10)
  const [weight, setWeight] = useState<string>('')
  const [adding, setAdding] = useState(false)

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    if (isOpen && exercises.length === 0) {
      loadExercises()
    }
  }, [isOpen])

  const loadExercises = async () => {
    const { data } = await supabase
      .from('exercises')
      .select('id, name, muscle_group')
      .order('name')
    setExercises(data || [])
  }

  const filteredExercises = exercises.filter(e =>
    e.name.toLowerCase().includes(search.toLowerCase()) ||
    e.muscle_group.toLowerCase().includes(search.toLowerCase())
  )

  const handleAdd = async () => {
    if (!selectedExercise && !search.trim()) return

    setAdding(true)
    try {
      let exerciseId = selectedExercise?.id

      // Create new exercise if not selected from list
      if (!exerciseId && search.trim()) {
        const { data: newExercise, error } = await supabase
          .from('exercises')
          .insert({ name: search.trim(), muscle_group: 'other', equipment: 'other' })
          .select()
          .single()
        if (error) throw error
        exerciseId = newExercise.id
      }

      if (!exerciseId) return

      // Insert sets
      const setsToInsert = Array.from({ length: sets }, (_, i) => ({
        session_id: sessionId,
        exercise_id: exerciseId,
        set_number: i + 1,
        reps,
        weight_kg: weight ? parseFloat(weight) : null,
      }))

      await supabase.from('workout_sets').insert(setsToInsert)

      // Reset and close
      setIsOpen(false)
      setSelectedExercise(null)
      setSearch('')
      setSets(3)
      setReps(10)
      setWeight('')
      router.refresh()
    } catch (err) {
      console.error('Error adding exercise:', err)
    } finally {
      setAdding(false)
    }
  }

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="w-full py-3 rounded-xl border border-dashed border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors flex items-center justify-center gap-2 text-sm"
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
        </svg>
        Add Exercise
      </button>
    )
  }

  return (
    <div className="rounded-xl bg-slate-900/50 border border-emerald-500/30 overflow-hidden">
      <div className="px-4 py-3 bg-emerald-500/10 border-b border-emerald-500/20 flex items-center justify-between">
        <h3 className="font-medium text-white text-sm">Add Exercise</h3>
        <button
          onClick={() => setIsOpen(false)}
          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="p-4 space-y-3">
        {/* Search */}
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value)
            setSelectedExercise(null)
          }}
          placeholder="Search or type exercise name..."
          className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
        />

        {/* Results */}
        {search && !selectedExercise && filteredExercises.length > 0 && (
          <div className="max-h-32 overflow-y-auto space-y-1 -mx-1 px-1">
            {filteredExercises.slice(0, 5).map(ex => (
              <button
                key={ex.id}
                onClick={() => {
                  setSelectedExercise(ex)
                  setSearch(ex.name)
                }}
                className="w-full text-left px-2 py-1.5 rounded text-sm text-white hover:bg-slate-800 transition-colors"
              >
                {ex.name} <span className="text-slate-500">({ex.muscle_group})</span>
              </button>
            ))}
          </div>
        )}

        {/* Sets/Reps/Weight */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Sets</label>
            <input
              type="number"
              value={sets}
              onChange={(e) => setSets(parseInt(e.target.value) || 1)}
              className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Reps</label>
            <input
              type="number"
              value={reps}
              onChange={(e) => setReps(parseInt(e.target.value) || 1)}
              className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Weight</label>
            <input
              type="number"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              placeholder="kg"
              className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => setIsOpen(false)}
            className="flex-1 py-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleAdd}
            disabled={adding || (!selectedExercise && !search.trim())}
            className="flex-1 py-2 rounded-lg bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50 transition-colors text-sm"
          >
            {adding ? 'Adding...' : 'Add'}
          </button>
        </div>
      </div>
    </div>
  )
}
