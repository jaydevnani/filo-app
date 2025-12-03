'use client'

/**
 * Log Food Page
 * 
 * Allows users to log a new food/meal entry with macros.
 * Client component for form interactivity.
 * 
 * QUANTITY FEATURE:
 * When using quick-add presets, users can adjust quantity.
 * All macro values are multiplied by the quantity.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other'

type Preset = {
  name: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

// Quick-add presets for common foods (base values for quantity = 1)
const quickAddPresets: Preset[] = [
  { name: 'Protein Shake', calories: 150, protein_g: 25, carbs_g: 5, fat_g: 2 },
  { name: 'Chicken Breast (150g)', calories: 230, protein_g: 43, carbs_g: 0, fat_g: 5 },
  { name: 'Rice (1 cup)', calories: 200, protein_g: 4, carbs_g: 45, fat_g: 0 },
  { name: 'Egg', calories: 70, protein_g: 6, carbs_g: 0.5, fat_g: 5 },
  { name: 'Greek Yogurt', calories: 130, protein_g: 17, carbs_g: 6, fat_g: 4 },
  { name: 'Banana', calories: 105, protein_g: 1, carbs_g: 27, fat_g: 0 },
  { name: 'Oatmeal (1 cup)', calories: 150, protein_g: 5, carbs_g: 27, fat_g: 3 },
  { name: 'Almonds (28g)', calories: 160, protein_g: 6, carbs_g: 6, fat_g: 14 },
]

export default function NewFoodLogPage() {
  const [name, setName] = useState('')
  const [mealType, setMealType] = useState<MealType>('lunch')
  const [calories, setCalories] = useState<number | ''>('')
  const [protein, setProtein] = useState<number | ''>('')
  const [carbs, setCarbs] = useState<number | ''>('')
  const [fat, setFat] = useState<number | ''>('')
  const [quantity, setQuantity] = useState(1)
  const [activePreset, setActivePreset] = useState<Preset | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  // Apply a preset with quantity multiplier
  const applyPreset = (preset: Preset) => {
    setActivePreset(preset)
    setQuantity(1)
    setName(preset.name)
    setCalories(preset.calories)
    setProtein(preset.protein_g)
    setCarbs(preset.carbs_g)
    setFat(preset.fat_g)
  }

  // Update quantity and recalculate values
  const updateQuantity = (newQuantity: number) => {
    if (newQuantity < 1) newQuantity = 1
    if (newQuantity > 99) newQuantity = 99
    
    setQuantity(newQuantity)
    
    if (activePreset) {
      // Recalculate based on the preset's base values
      setCalories(Math.round(activePreset.calories * newQuantity))
      setProtein(Math.round(activePreset.protein_g * newQuantity * 10) / 10)
      setCarbs(Math.round(activePreset.carbs_g * newQuantity * 10) / 10)
      setFat(Math.round(activePreset.fat_g * newQuantity * 10) / 10)
      
      // Update name to reflect quantity
      if (newQuantity === 1) {
        setName(activePreset.name)
      } else {
        setName(`${activePreset.name} x${newQuantity}`)
      }
    }
  }

  // Clear preset when manually editing values
  const handleManualEdit = (field: 'calories' | 'protein' | 'carbs' | 'fat', value: string) => {
    setActivePreset(null) // Clear preset so quantity doesn't override
    
    const numValue = value ? Number(value) : ''
    switch (field) {
      case 'calories': setCalories(numValue); break
      case 'protein': setProtein(numValue); break
      case 'carbs': setCarbs(numValue); break
      case 'fat': setFat(numValue); break
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!name.trim()) {
      setError('Please enter a food name')
      return
    }

    setSaving(true)
    setError(null)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: insertError } = await supabase
        .from('food_logs')
        .insert({
          user_id: user.id,
          name: name.trim(),
          meal_type: mealType,
          calories: calories || 0,
          protein_g: protein || 0,
          carbs_g: carbs || 0,
          fat_g: fat || 0,
          logged_at: new Date().toISOString(),
        })

      if (insertError) throw insertError

      router.push('/dashboard/nutrition')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  // Auto-calculate calories from macros (optional helper)
  const calculatedCalories = (Number(protein) || 0) * 4 + (Number(carbs) || 0) * 4 + (Number(fat) || 0) * 9

  return (
    <div className="max-w-lg mx-auto space-y-6">
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
          <h1 className="text-2xl font-bold text-white">Log Food</h1>
          <p className="text-slate-400 text-sm">Add a meal or snack</p>
        </div>
      </div>

      {/* Quick Add */}
      <div>
        <h2 className="text-sm font-medium text-slate-400 mb-3">Quick Add</h2>
        <div className="flex flex-wrap gap-2">
          {quickAddPresets.map((preset) => (
            <button
              key={preset.name}
              type="button"
              onClick={() => applyPreset(preset)}
              className={`px-3 py-1.5 text-sm rounded-lg transition-colors ${
                activePreset?.name === preset.name
                  ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                  : 'bg-slate-800/50 text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {preset.name}
            </button>
          ))}
        </div>
      </div>

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Food Name + Quantity */}
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="block text-sm font-medium text-slate-300 mb-2">
              Food Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value)
                setActivePreset(null) // Clear preset when manually editing name
              }}
              placeholder="e.g., Grilled Chicken Salad"
              className="w-full px-4 py-3 bg-slate-900/50 border border-slate-800/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
          </div>
          
          {/* Quantity (only show when preset is active) */}
          {activePreset && (
            <div className="w-36 shrink-0">
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Qty
              </label>
              <div className="flex items-stretch rounded-xl overflow-hidden border border-slate-800/50">
                <button
                  type="button"
                  onClick={() => updateQuantity(quantity - 1)}
                  className="w-11 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-medium"
                >
                  −
                </button>
                <div className="w-14 py-3 bg-slate-900/50 flex items-center justify-center">
                  <span className="text-white font-medium">{quantity}</span>
                </div>
                <button
                  type="button"
                  onClick={() => updateQuantity(quantity + 1)}
                  className="w-11 py-3 bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white transition-colors font-medium"
                >
                  +
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Meal Type */}
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            Meal Type
          </label>
          <div className="grid grid-cols-5 gap-2">
            {(['breakfast', 'lunch', 'dinner', 'snack', 'other'] as MealType[]).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setMealType(type)}
                className={`py-2 px-2 rounded-lg text-xs font-medium transition-all ${
                  mealType === type
                    ? 'bg-emerald-500/20 text-emerald-400 ring-1 ring-emerald-500/50'
                    : 'bg-slate-800/50 text-slate-400 hover:bg-slate-800'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Macros */}
        <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800/50 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-300">Nutrition Info</h3>
            {activePreset && quantity > 1 && (
              <span className="text-xs text-emerald-400">
                Base × {quantity}
              </span>
            )}
          </div>
          
          {/* Calories */}
          <div>
            <label className="block text-xs text-slate-400 mb-1.5">Calories</label>
            <input
              type="number"
              value={calories}
              onChange={(e) => handleManualEdit('calories', e.target.value)}
              placeholder="0"
              min="0"
              className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
            />
            {!activePreset && (protein || carbs || fat) ? (
              <p className="text-xs text-slate-500 mt-1">
                Calculated from macros: ~{calculatedCalories} cal
              </p>
            ) : null}
          </div>

          {/* Macros Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => handleManualEdit('protein', e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => handleManualEdit('carbs', e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1.5">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => handleManualEdit('fat', e.target.value)}
                placeholder="0"
                min="0"
                step="0.1"
                className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/50 transition-all"
              />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => router.back()}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-white font-medium hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {saving ? 'Saving...' : 'Log Food'}
          </button>
        </div>
      </form>
    </div>
  )
}
