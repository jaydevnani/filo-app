'use client'

/**
 * Workout Split Setup Page
 * 
 * This is where users define their workout rotation:
 * - Add splits (Push, Pull, Legs, etc.)
 * - Assign muscle groups to each split
 * - Set the rotation order (drag to reorder!)
 * - Add rest days
 * 
 * The AI will use this template to generate daily workouts.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core'
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'

// Available muscle groups to choose from
const MUSCLE_GROUPS = [
  'chest',
  'back', 
  'shoulders',
  'biceps',
  'triceps',
  'forearms',
  'quads',
  'hamstrings',
  'glutes',
  'calves',
  'abs',
  'obliques',
  'lower back',
  'traps',
]

// Color options for splits
const COLORS = [
  { name: 'emerald', bg: 'bg-emerald-500/20', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  { name: 'cyan', bg: 'bg-cyan-500/20', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  { name: 'violet', bg: 'bg-violet-500/20', text: 'text-violet-400', border: 'border-violet-500/30' },
  { name: 'amber', bg: 'bg-amber-500/20', text: 'text-amber-400', border: 'border-amber-500/30' },
  { name: 'rose', bg: 'bg-rose-500/20', text: 'text-rose-400', border: 'border-rose-500/30' },
  { name: 'blue', bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
]

// Preset split templates
const PRESETS = [
  {
    name: 'Push / Pull / Legs',
    splits: [
      { name: 'Push', muscle_groups: ['chest', 'shoulders', 'triceps'], color: 'emerald' },
      { name: 'Pull', muscle_groups: ['back', 'biceps', 'forearms'], color: 'cyan' },
      { name: 'Legs', muscle_groups: ['quads', 'hamstrings', 'glutes', 'calves'], color: 'violet' },
    ]
  },
  {
    name: 'Upper / Lower',
    splits: [
      { name: 'Upper Body', muscle_groups: ['chest', 'back', 'shoulders', 'biceps', 'triceps'], color: 'emerald' },
      { name: 'Lower Body', muscle_groups: ['quads', 'hamstrings', 'glutes', 'calves'], color: 'cyan' },
    ]
  },
  {
    name: 'Bro Split (5 Day)',
    splits: [
      { name: 'Chest', muscle_groups: ['chest'], color: 'emerald' },
      { name: 'Back', muscle_groups: ['back', 'traps'], color: 'cyan' },
      { name: 'Shoulders', muscle_groups: ['shoulders'], color: 'violet' },
      { name: 'Arms', muscle_groups: ['biceps', 'triceps', 'forearms'], color: 'amber' },
      { name: 'Legs', muscle_groups: ['quads', 'hamstrings', 'glutes', 'calves'], color: 'rose' },
    ]
  },
  {
    name: 'Full Body (3 Day)',
    splits: [
      { name: 'Full Body A', muscle_groups: ['chest', 'back', 'shoulders', 'quads', 'abs'], color: 'emerald' },
      { name: 'Full Body B', muscle_groups: ['chest', 'back', 'biceps', 'hamstrings', 'abs'], color: 'cyan' },
      { name: 'Full Body C', muscle_groups: ['shoulders', 'triceps', 'glutes', 'calves', 'abs'], color: 'violet' },
    ]
  },
]

interface Split {
  id: string // Required for drag-and-drop
  name: string
  muscle_groups: string[]
  order_in_rotation: number
  is_rest_day: boolean
  color: string
}

// Sortable Split Card Component with inline editing
function SortableSplitCard({
  split,
  index,
  totalCount,
  onUpdate,
  onDelete,
  onMoveUp,
  onMoveDown,
}: {
  split: Split
  index: number
  totalCount: number
  onUpdate: (updated: Split) => void
  onDelete: () => void
  onMoveUp: () => void
  onMoveDown: () => void
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(split.name)
  const [editMuscles, setEditMuscles] = useState<string[]>(split.muscle_groups)
  const [editColor, setEditColor] = useState(split.color)
  const [editIsRest, setEditIsRest] = useState(split.is_rest_day)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: split.id, disabled: isEditing })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 'auto',
  }

  const color = COLORS.find(c => c.name === split.color) || COLORS[0]

  const handleSave = () => {
    onUpdate({
      ...split,
      name: editName,
      muscle_groups: editIsRest ? [] : editMuscles,
      color: editColor,
      is_rest_day: editIsRest,
    })
    setIsEditing(false)
  }

  const handleCancel = () => {
    setEditName(split.name)
    setEditMuscles(split.muscle_groups)
    setEditColor(split.color)
    setEditIsRest(split.is_rest_day)
    setIsEditing(false)
  }

  const toggleMuscle = (muscle: string) => {
    if (editMuscles.includes(muscle)) {
      setEditMuscles(editMuscles.filter(m => m !== muscle))
    } else {
      setEditMuscles([...editMuscles, muscle])
    }
  }

  const editColor_ = COLORS.find(c => c.name === editColor) || COLORS[0]

  if (isEditing) {
    return (
      <div 
        ref={setNodeRef} 
        style={style}
        className={`p-5 rounded-xl ${editColor_.bg} border-2 ${editColor_.border} transition-all space-y-4`}
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className={`text-xs font-medium ${editColor_.text} bg-slate-950/30 px-2 py-0.5 rounded`}>
            Day {index + 1}
          </span>
        </div>

        {/* Name Input */}
        <input
          type="text"
          value={editName}
          onChange={(e) => setEditName(e.target.value)}
          placeholder="Split name..."
          className="w-full px-4 py-2.5 bg-slate-950/30 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-lg font-medium"
          autoFocus
        />

        {/* Rest Day Toggle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditIsRest(!editIsRest)}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              editIsRest ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                editIsRest ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-slate-300">Rest day</span>
        </div>

        {/* Muscle Groups */}
        {!editIsRest && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-2">
              Muscle Groups
            </label>
            <div className="flex flex-wrap gap-2">
              {MUSCLE_GROUPS.map(muscle => (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => toggleMuscle(muscle)}
                  className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all ${
                    editMuscles.includes(muscle)
                      ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-950/30 text-slate-400 border border-slate-700/30 hover:text-white'
                  }`}
                >
                  {muscle}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Color Picker */}
        <div>
          <label className="block text-xs font-medium text-slate-400 mb-2">
            Color
          </label>
          <div className="flex gap-2">
            {COLORS.map(c => (
              <button
                key={c.name}
                type="button"
                onClick={() => setEditColor(c.name)}
                className={`w-7 h-7 rounded-lg ${c.bg} ${c.border} border-2 transition-all ${
                  editColor === c.name ? 'ring-2 ring-white ring-offset-1 ring-offset-slate-900' : ''
                }`}
              />
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between pt-2">
          <button
            onClick={onDelete}
            className="px-3 py-1.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors"
          >
            Delete
          </button>
          <div className="flex gap-2">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 rounded-lg text-sm text-slate-400 hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!editName.trim()}
              className="px-4 py-1.5 rounded-lg text-sm bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50 transition-colors"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    )
  }

  // Display mode - entire card is draggable
  return (
    <div 
      ref={setNodeRef} 
      style={style}
      {...attributes}
      {...listeners}
      className={`p-4 rounded-xl ${color.bg} border ${color.border} transition-all hover:border-opacity-60 cursor-grab active:cursor-grabbing touch-none ${isDragging ? 'shadow-xl ring-2 ring-emerald-500/30' : ''}`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className={`text-xs font-medium ${color.text} bg-slate-950/30 px-2 py-0.5 rounded`}>
              Day {index + 1}
            </span>
            {split.is_rest_day && (
              <span className="text-xs text-slate-400 bg-slate-800/50 px-2 py-0.5 rounded">
                Rest Day
              </span>
            )}
          </div>
          <h3 className="font-semibold text-white mt-1">{split.name}</h3>
          {split.muscle_groups.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {split.muscle_groups.map(muscle => (
                <span
                  key={muscle}
                  className="text-xs px-2 py-0.5 rounded bg-slate-950/30 text-slate-300 capitalize"
                >
                  {muscle}
                </span>
              ))}
            </div>
          )}
        </div>
        
        {/* Action Buttons */}
        <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveUp()
            }}
            disabled={index === 0}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMoveDown()
            }}
            disabled={index === totalCount - 1}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation()
              setIsEditing(true)
            }}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/50 transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function WorkoutSetupPage() {
  const [splits, setSplits] = useState<Split[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showAddForm, setShowAddForm] = useState(false)
  
  // Form state for adding new split
  const [formName, setFormName] = useState('')
  const [formMuscles, setFormMuscles] = useState<string[]>([])
  const [formColor, setFormColor] = useState('emerald')
  const [formIsRest, setFormIsRest] = useState(false)
  
  const router = useRouter()
  const supabase = createClient()

  // Drag sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Load existing splits
  useEffect(() => {
    loadSplits()
  }, [])

  const loadSplits = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('workout_splits')
        .select('*')
        .eq('user_id', user.id)
        .order('order_in_rotation', { ascending: true })

      if (error) throw error
      
      // Ensure each split has an id for drag-and-drop
      const splitsWithIds = (data || []).map((s, i) => ({
        ...s,
        id: s.id || `split-${i}`,
      }))
      setSplits(splitsWithIds)
    } catch (err) {
      console.error('Error loading splits:', err)
      setError('Failed to load your workout splits')
    } finally {
      setLoading(false)
    }
  }

  const applyPreset = (preset: typeof PRESETS[0]) => {
    const newSplits = preset.splits.map((s, i) => ({
      id: `new-${Date.now()}-${i}`,
      name: s.name,
      muscle_groups: s.muscle_groups,
      order_in_rotation: i + 1,
      is_rest_day: false,
      color: s.color,
    }))
    setSplits(newSplits)
  }

  const resetForm = () => {
    setFormName('')
    setFormMuscles([])
    setFormColor('emerald')
    setFormIsRest(false)
    setShowAddForm(false)
  }

  const handleAddSplit = () => {
    if (!formName.trim()) return
    
    const newSplit: Split = {
      id: `new-${Date.now()}`,
      name: formName,
      muscle_groups: formIsRest ? [] : formMuscles,
      order_in_rotation: splits.length + 1,
      is_rest_day: formIsRest,
      color: formColor,
    }
    
    setSplits([...splits, newSplit])
    resetForm()
  }

  const handleUpdateSplit = (index: number, updated: Split) => {
    const newSplits = [...splits]
    newSplits[index] = updated
    setSplits(newSplits)
  }

  const handleDeleteSplit = (index: number) => {
    const updated = splits.filter((_, i) => i !== index)
    updated.forEach((s, i) => s.order_in_rotation = i + 1)
    setSplits(updated)
  }

  const handleMoveUp = (index: number) => {
    if (index === 0) return
    const updated = [...splits]
    ;[updated[index - 1], updated[index]] = [updated[index], updated[index - 1]]
    updated.forEach((s, i) => s.order_in_rotation = i + 1)
    setSplits(updated)
  }

  const handleMoveDown = (index: number) => {
    if (index === splits.length - 1) return
    const updated = [...splits]
    ;[updated[index], updated[index + 1]] = [updated[index + 1], updated[index]]
    updated.forEach((s, i) => s.order_in_rotation = i + 1)
    setSplits(updated)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      setSplits((items) => {
        const oldIndex = items.findIndex((i) => i.id === active.id)
        const newIndex = items.findIndex((i) => i.id === over.id)
        
        const newItems = arrayMove(items, oldIndex, newIndex)
        // Update order_in_rotation
        newItems.forEach((s, i) => s.order_in_rotation = i + 1)
        return newItems
      })
    }
  }

  const toggleMuscle = (muscle: string) => {
    if (formMuscles.includes(muscle)) {
      setFormMuscles(formMuscles.filter(m => m !== muscle))
    } else {
      setFormMuscles([...formMuscles, muscle])
    }
  }

  const handleSave = async () => {
    if (splits.length === 0) {
      setError('Please add at least one workout split')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Delete existing splits
      await supabase
        .from('workout_splits')
        .delete()
        .eq('user_id', user.id)

      // Insert new splits
      const { error } = await supabase
        .from('workout_splits')
        .insert(
          splits.map(s => ({
            user_id: user.id,
            name: s.name,
            muscle_groups: s.muscle_groups,
            order_in_rotation: s.order_in_rotation,
            is_rest_day: s.is_rest_day,
            color: s.color,
          }))
        )

      if (error) throw error

      router.push('/dashboard/workouts')
    } catch (err) {
      console.error('Error saving splits:', err)
      setError('Failed to save your workout splits')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-400" />
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <Link 
          href="/dashboard/workouts"
          className="inline-flex items-center gap-2 text-slate-400 hover:text-white transition-colors mb-4"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Workouts
        </Link>
        <h1 className="text-2xl font-bold text-white">Setup Your Workout Split</h1>
        <p className="text-slate-400 mt-1">
          Define your training rotation. Drag to reorder. Filo will use this to generate your daily workouts.
        </p>
      </div>

      {/* Presets */}
      {splits.length === 0 && (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6">
          <h2 className="text-lg font-semibold text-white mb-3">Quick Start with a Preset</h2>
          <p className="text-sm text-slate-400 mb-4">Choose a popular split to get started, or create your own below.</p>
          <div className="grid grid-cols-2 gap-3">
            {PRESETS.map((preset) => (
              <button
                key={preset.name}
                onClick={() => applyPreset(preset)}
                className="p-4 text-left rounded-xl bg-slate-800/50 border border-slate-700/50 hover:bg-slate-800 hover:border-slate-600/50 transition-all group"
              >
                <h3 className="font-medium text-white group-hover:text-emerald-400 transition-colors">
                  {preset.name}
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  {preset.splits.length} workout days
                </p>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Current Splits - Drag and Drop */}
      {splits.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-white">Your Rotation</h2>
            <span className="text-xs text-slate-500">Drag or use arrows to reorder</span>
          </div>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={splits.map(s => s.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-3">
                {splits.map((split, index) => (
                  <SortableSplitCard
                    key={split.id}
                    split={split}
                    index={index}
                    totalCount={splits.length}
                    onUpdate={(updated) => handleUpdateSplit(index, updated)}
                    onDelete={() => handleDeleteSplit(index)}
                    onMoveUp={() => handleMoveUp(index)}
                    onMoveDown={() => handleMoveDown(index)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        </div>
      )}

      {/* Add New Split Form */}
      {showAddForm ? (
        <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 p-6 space-y-5">
          <h2 className="text-lg font-semibold text-white">Add New Split</h2>
          
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Split Name
            </label>
            <input
              type="text"
              value={formName}
              onChange={(e) => setFormName(e.target.value)}
              placeholder="e.g., Push, Pull, Legs, Upper Body"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              autoFocus
            />
          </div>

          {/* Rest Day Toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setFormIsRest(!formIsRest)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                formIsRest ? 'bg-emerald-500' : 'bg-slate-700'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  formIsRest ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
            <span className="text-sm text-slate-300">This is a rest day</span>
          </div>

          {/* Muscle Groups (only if not rest day) */}
          {!formIsRest && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Target Muscle Groups
              </label>
              <div className="flex flex-wrap gap-2">
                {MUSCLE_GROUPS.map(muscle => (
                  <button
                    key={muscle}
                    type="button"
                    onClick={() => toggleMuscle(muscle)}
                    className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-all ${
                      formMuscles.includes(muscle)
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                        : 'bg-slate-800/50 text-slate-400 border border-slate-700/50 hover:bg-slate-800 hover:text-white'
                    }`}
                  >
                    {muscle}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Color */}
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Color
            </label>
            <div className="flex gap-2">
              {COLORS.map(color => (
                <button
                  key={color.name}
                  type="button"
                  onClick={() => setFormColor(color.name)}
                  className={`w-8 h-8 rounded-lg ${color.bg} ${color.border} border-2 transition-all ${
                    formColor === color.name ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-900' : ''
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={resetForm}
              className="px-4 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAddSplit}
              disabled={!formName.trim()}
              className="px-4 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-medium hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Add Split
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setShowAddForm(true)}
          className="w-full p-4 rounded-xl border-2 border-dashed border-slate-700/50 text-slate-400 hover:border-emerald-500/50 hover:text-emerald-400 transition-all flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add {splits.length > 0 ? 'Another' : 'a'} Split
        </button>
      )}

      {/* Error */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          {error}
        </div>
      )}

      {/* Save Button */}
      {splits.length > 0 && (
        <div className="flex gap-3 pt-4">
          <button
            onClick={() => setSplits([])}
            className="px-6 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            Start Over
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Saving...' : 'Save Workout Split'}
          </button>
        </div>
      )}

      {/* Explanation */}
      <div className="rounded-2xl bg-slate-900/30 border border-slate-800/30 p-6">
        <h3 className="font-medium text-white mb-2">How it works</h3>
        <ul className="space-y-2 text-sm text-slate-400">
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">1.</span>
            Define your workout rotation (the splits above)
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">2.</span>
            Each day, Filo will tell you which split is next
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">3.</span>
            Skip a day? Filo will reschedule it automatically
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-400">4.</span>
            The AI will suggest exercises based on your split's muscle groups
          </li>
        </ul>
      </div>
    </div>
  )
}
