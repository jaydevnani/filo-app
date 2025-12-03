'use client'

/**
 * Profile Page
 * 
 * Allows users to view and edit their profile data.
 * Shows calculated BMR and TDEE based on their stats.
 */

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

type Profile = {
  id: string
  display_name: string | null
  fitness_goal: string | null
  activity_level: string | null
  height_cm: number | null
  weight_kg: number | null
  date_of_birth: string | null
  gender: string | null
}

const fitnessGoals = [
  { value: 'lose_weight', label: 'Lose Weight', icon: '🔥' },
  { value: 'build_muscle', label: 'Build Muscle', icon: '💪' },
  { value: 'maintain', label: 'Maintain', icon: '⚖️' },
  { value: 'get_stronger', label: 'Get Stronger', icon: '🏋️' },
]

const activityLevels = [
  { value: 'sedentary', label: 'Sedentary', multiplier: 1.2 },
  { value: 'lightly_active', label: 'Lightly Active', multiplier: 1.375 },
  { value: 'active', label: 'Active', multiplier: 1.55 },
  { value: 'very_active', label: 'Very Active', multiplier: 1.725 },
]

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [editing, setEditing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  
  // Form state
  const [displayName, setDisplayName] = useState('')
  const [fitnessGoal, setFitnessGoal] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [heightCm, setHeightCm] = useState<number | ''>('')
  const [weightKg, setWeightKg] = useState<number | ''>('')
  const [dateOfBirth, setDateOfBirth] = useState('')
  
  const router = useRouter()
  const supabase = createClient()

  // Fetch profile on mount
  useEffect(() => {
    async function fetchProfile() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single()

      if (error) {
        setError('Failed to load profile')
      } else if (data) {
        setProfile(data)
        // Initialize form state
        setDisplayName(data.display_name || '')
        setFitnessGoal(data.fitness_goal || '')
        setActivityLevel(data.activity_level || '')
        setHeightCm(data.height_cm || '')
        setWeightKg(data.weight_kg || '')
        setDateOfBirth(data.date_of_birth || '')
      }
      setLoading(false)
    }

    fetchProfile()
  }, [supabase])

  // Calculate age from DOB (handles timezone correctly)
  const calculateAge = (dob: string | null): number | null => {
    if (!dob) return null
    // Parse YYYY-MM-DD without timezone issues
    const [year, month, day] = dob.split('-').map(Number)
    const birthDate = new Date(year, month - 1, day) // month is 0-indexed
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }
    return age
  }

  // Calculate BMR using Mifflin-St Jeor equation
  const calculateBMR = (): number | null => {
    if (!profile?.weight_kg || !profile?.height_cm || !profile?.date_of_birth) return null
    const age = calculateAge(profile.date_of_birth)
    if (!age) return null
    
    // Using male formula as default (can add gender later)
    // BMR = (10 × weight in kg) + (6.25 × height in cm) - (5 × age) + 5
    const bmr = (10 * profile.weight_kg) + (6.25 * profile.height_cm) - (5 * age) + 5
    return Math.round(bmr)
  }

  // Calculate TDEE
  const calculateTDEE = (): number | null => {
    const bmr = calculateBMR()
    if (!bmr || !profile?.activity_level) return null
    
    const activity = activityLevels.find(a => a.value === profile.activity_level)
    if (!activity) return null
    
    return Math.round(bmr * activity.multiplier)
  }

  const handleSave = async () => {
    setSaving(true)
    setError(null)
    setSuccess(false)

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: displayName || null,
          fitness_goal: fitnessGoal || null,
          activity_level: activityLevel || null,
          height_cm: heightCm || null,
          weight_kg: weightKg || null,
          date_of_birth: dateOfBirth || null,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Update local state
      setProfile(prev => prev ? {
        ...prev,
        display_name: displayName || null,
        fitness_goal: fitnessGoal || null,
        activity_level: activityLevel || null,
        height_cm: heightCm ? Number(heightCm) : null,
        weight_kg: weightKg ? Number(weightKg) : null,
        date_of_birth: dateOfBirth || null,
      } : null)

      setSuccess(true)
      setEditing(false)
      router.refresh()
      
      // Clear success after 3s
      setTimeout(() => setSuccess(false), 3000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Reset form to current profile values
    if (profile) {
      setDisplayName(profile.display_name || '')
      setFitnessGoal(profile.fitness_goal || '')
      setActivityLevel(profile.activity_level || '')
      setHeightCm(profile.height_cm || '')
      setWeightKg(profile.weight_kg || '')
      setDateOfBirth(profile.date_of_birth || '')
    }
    setEditing(false)
    setError(null)
  }

  const bmr = calculateBMR()
  const tdee = calculateTDEE()
  const age = calculateAge(profile?.date_of_birth || null)

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-slate-400">Loading profile...</div>
      </div>
    )
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Profile</h1>
          <p className="text-slate-400 mt-1">Manage your personal information</p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            className="px-4 py-2 bg-slate-800 text-white rounded-xl hover:bg-slate-700 transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {/* Success Message */}
      {success && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm">
          Profile updated successfully!
        </div>
      )}

      {/* Error Message */}
      {error && (
        <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Stats Cards */}
      {(bmr || tdee) && (
        <div className="grid grid-cols-2 gap-4">
          {bmr && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20">
              <p className="text-sm text-slate-400">BMR</p>
              <p className="text-2xl font-bold text-white">{bmr}</p>
              <p className="text-xs text-slate-500">calories/day at rest</p>
            </div>
          )}
          {tdee && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-500/10 border border-violet-500/20">
              <p className="text-sm text-slate-400">TDEE</p>
              <p className="text-2xl font-bold text-white">{tdee}</p>
              <p className="text-xs text-slate-500">calories/day with activity</p>
            </div>
          )}
        </div>
      )}

      {/* Profile Info */}
      <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 divide-y divide-slate-800/50">
        {/* Display Name */}
        <div className="p-4">
          <label className="block text-sm text-slate-400 mb-1">Display Name</label>
          {editing ? (
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          ) : (
            <p className="text-white font-medium">{profile?.display_name || '—'}</p>
          )}
        </div>

        {/* Fitness Goal */}
        <div className="p-4">
          <label className="block text-sm text-slate-400 mb-1">Fitness Goal</label>
          {editing ? (
            <div className="grid grid-cols-2 gap-2">
              {fitnessGoals.map((goal) => (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => setFitnessGoal(goal.value)}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    fitnessGoal === goal.value
                      ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50'
                      : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                  }`}
                >
                  <span className="text-lg">{goal.icon}</span>
                  <span className="ml-2 text-sm text-white">{goal.label}</span>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-white font-medium">
              {fitnessGoals.find(g => g.value === profile?.fitness_goal)?.icon}{' '}
              {fitnessGoals.find(g => g.value === profile?.fitness_goal)?.label || '—'}
            </p>
          )}
        </div>

        {/* Activity Level */}
        <div className="p-4">
          <label className="block text-sm text-slate-400 mb-1">Activity Level</label>
          {editing ? (
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            >
              <option value="">Select...</option>
              {activityLevels.map((level) => (
                <option key={level.value} value={level.value}>
                  {level.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-white font-medium">
              {activityLevels.find(l => l.value === profile?.activity_level)?.label || '—'}
            </p>
          )}
        </div>

        {/* Height & Weight */}
        <div className="p-4 grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Height</label>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value ? Number(e.target.value) : '')}
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <span className="text-slate-400 text-sm">cm</span>
              </div>
            ) : (
              <p className="text-white font-medium">{profile?.height_cm ? `${profile.height_cm} cm` : '—'}</p>
            )}
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">Weight</label>
            {editing ? (
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value ? Number(e.target.value) : '')}
                  step="0.1"
                  className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
                <span className="text-slate-400 text-sm">kg</span>
              </div>
            ) : (
              <p className="text-white font-medium">{profile?.weight_kg ? `${profile.weight_kg} kg` : '—'}</p>
            )}
          </div>
        </div>

        {/* Date of Birth / Age */}
        <div className="p-4">
          <label className="block text-sm text-slate-400 mb-1">Date of Birth</label>
          {editing ? (
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800/50 border border-slate-700/50 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [color-scheme:dark]"
            />
          ) : (
            <p className="text-white font-medium">
              {profile?.date_of_birth 
                ? (() => {
                    // Parse date without timezone issues (YYYY-MM-DD format)
                    const [year, month, day] = profile.date_of_birth.split('-').map(Number)
                    const date = new Date(year, month - 1, day) // month is 0-indexed
                    const formatted = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
                    return `${formatted}${age ? ` (${age} years old)` : ''}`
                  })()
                : '—'
              }
            </p>
          )}
        </div>
      </div>

      {/* Edit Actions */}
      {editing && (
        <div className="flex gap-3">
          <button
            onClick={handleCancel}
            className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-white font-medium hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 transition-all"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      )}
    </div>
  )
}

