'use client'

/**
 * Editable Sets Component
 * 
 * Card-level editing - click edit on the card header to modify all sets at once.
 */

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

interface Set {
  id: string
  set_number: number
  reps: number
  weight_kg: number | null
}

interface EditableSetsProps {
  sessionId: string
  exerciseId: string
  exerciseName: string
  muscleGroup: string
  equipment: string | null
  initialSets: Set[]
}

export function EditableSets({
  sessionId,
  exerciseId,
  exerciseName,
  muscleGroup,
  equipment,
  initialSets,
}: EditableSetsProps) {
  const [sets, setSets] = useState<Set[]>(initialSets)
  const [isEditing, setIsEditing] = useState(false)
  const [editedSets, setEditedSets] = useState<Set[]>([])
  const [saving, setSaving] = useState(false)
  const [deletedSetIds, setDeletedSetIds] = useState<string[]>([])

  const supabase = createClient()
  const router = useRouter()

  const exerciseVolume = sets.reduce((sum, set) => sum + (set.reps * (set.weight_kg || 0)), 0)

  const startEditing = () => {
    setEditedSets([...sets])
    setDeletedSetIds([])
    setIsEditing(true)
  }

  const cancelEditing = () => {
    setIsEditing(false)
    setEditedSets([])
    setDeletedSetIds([])
  }

  const updateSet = (index: number, field: 'weight_kg' | 'reps', value: string) => {
    setEditedSets(prev => prev.map((set, i) => {
      if (i !== index) return set
      if (field === 'weight_kg') {
        return { ...set, weight_kg: value ? parseFloat(value) : null }
      }
      return { ...set, reps: parseInt(value) || 0 }
    }))
  }

  const addSet = () => {
    const lastSet = editedSets[editedSets.length - 1]
    const newSet: Set = {
      id: `new-${Date.now()}`, // Temporary ID for new sets
      set_number: editedSets.length + 1,
      reps: lastSet?.reps || 10,
      weight_kg: lastSet?.weight_kg || null,
    }
    setEditedSets([...editedSets, newSet])
  }

  const removeSet = (index: number) => {
    const setToRemove = editedSets[index]
    // Track existing sets that need to be deleted
    if (!setToRemove.id.startsWith('new-')) {
      setDeletedSetIds(prev => [...prev, setToRemove.id])
    }
    setEditedSets(prev => prev.filter((_, i) => i !== index).map((s, i) => ({ ...s, set_number: i + 1 })))
  }

  const saveChanges = async () => {
    setSaving(true)
    try {
      // Delete removed sets
      if (deletedSetIds.length > 0) {
        await supabase
          .from('workout_sets')
          .delete()
          .in('id', deletedSetIds)
      }

      // Update existing sets and insert new ones
      for (const set of editedSets) {
        if (set.id.startsWith('new-')) {
          // Insert new set
          await supabase
            .from('workout_sets')
            .insert({
              session_id: sessionId,
              exercise_id: exerciseId,
              set_number: set.set_number,
              reps: set.reps,
              weight_kg: set.weight_kg,
            })
        } else {
          // Update existing set
          await supabase
            .from('workout_sets')
            .update({
              set_number: set.set_number,
              reps: set.reps,
              weight_kg: set.weight_kg,
            })
            .eq('id', set.id)
        }
      }

      setSets(editedSets.map((s, i) => ({ ...s, id: s.id.startsWith('new-') ? `saved-${i}` : s.id })))
      setIsEditing(false)
      router.refresh()
    } catch (err) {
      console.error('Error saving sets:', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className={`rounded-xl bg-slate-900/50 border ${isEditing ? 'border-emerald-500/30' : 'border-slate-800/50'} overflow-hidden transition-colors`}>
      {/* Exercise Header */}
      <div className={`px-4 py-3 ${isEditing ? 'bg-emerald-500/10' : 'bg-slate-800/30'} border-b ${isEditing ? 'border-emerald-500/20' : 'border-slate-800/50'}`}>
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-medium text-white">{exerciseName}</h3>
            <p className="text-xs text-slate-400">
              {muscleGroup} {equipment && `• ${equipment}`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium text-white">{isEditing ? editedSets.length : sets.length} sets</p>
              <p className="text-xs text-slate-400">{Math.round(exerciseVolume)} kg</p>
            </div>
            {!isEditing && (
              <button
                onClick={startEditing}
                className="p-2 rounded-lg text-slate-400 hover:text-emerald-400 hover:bg-emerald-500/10 transition-colors"
                title="Edit exercise"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Sets Table */}
      <div className="p-4">
        {isEditing ? (
          // Edit Mode
          <>
            <div className="grid grid-cols-12 gap-2 text-xs font-medium text-slate-400 mb-2 px-1">
              <div className="col-span-2">SET</div>
              <div className="col-span-4 text-center">WEIGHT (kg)</div>
              <div className="col-span-4 text-center">REPS</div>
              <div className="col-span-2"></div>
            </div>
            
            {editedSets.map((set, index) => (
              <div key={set.id} className="grid grid-cols-12 gap-2 py-1.5 items-center">
                <div className="col-span-2">
                  <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-emerald-500/20 text-emerald-400 text-sm font-medium">
                    {set.set_number}
                  </span>
                </div>
                <div className="col-span-4">
                  <input
                    type="number"
                    value={set.weight_kg ?? ''}
                    onChange={(e) => updateSet(index, 'weight_kg', e.target.value)}
                    placeholder="—"
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-sm placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="col-span-4">
                  <input
                    type="number"
                    value={set.reps}
                    onChange={(e) => updateSet(index, 'reps', e.target.value)}
                    className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-center text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
                <div className="col-span-2 flex justify-end">
                  <button
                    onClick={() => removeSet(index)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>
            ))}

            {/* Add Set */}
            <button
              onClick={addSet}
              className="w-full mt-2 py-2 rounded-lg border border-dashed border-slate-700 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-colors text-sm flex items-center justify-center gap-1"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Set
            </button>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-slate-800/50">
              <button
                onClick={cancelEditing}
                disabled={saving}
                className="flex-1 py-2 px-3 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={saveChanges}
                disabled={saving}
                className="flex-1 py-2 px-3 rounded-lg bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50 transition-colors text-sm"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </>
        ) : (
          // View Mode
          <>
            <div className="grid grid-cols-3 gap-2 text-xs font-medium text-slate-400 mb-2 px-2">
              <div>SET</div>
              <div className="text-center">WEIGHT</div>
              <div className="text-center">REPS</div>
            </div>
            
            {sets
              .sort((a, b) => a.set_number - b.set_number)
              .map((set) => (
                <div key={set.id} className="grid grid-cols-3 gap-2 py-2 px-2 rounded-lg hover:bg-slate-800/30">
                  <div className="flex items-center">
                    <span className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-slate-800 text-slate-300 text-sm">
                      {set.set_number}
                    </span>
                  </div>
                  <div className="text-center text-white">
                    {set.weight_kg ? `${set.weight_kg} kg` : '—'}
                  </div>
                  <div className="text-center text-white">
                    {set.reps}
                  </div>
                </div>
              ))}
          </>
        )}
      </div>
    </div>
  )
}
