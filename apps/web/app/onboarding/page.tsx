'use client'

/**
 * Onboarding Page - Progressive Data Collection
 * 
 * WHY ONBOARDING?
 * The AI coach needs baseline data to generate personalized plans.
 * Instead of asking everything during signup (high friction), we:
 * 1. Let users sign up with just email/password
 * 2. Show this quick onboarding after first login
 * 3. Collect essentials in ~30 seconds
 * 
 * MULTI-STEP FORM
 * Breaking the form into steps feels less overwhelming than one long form.
 * Each step has a clear purpose and shows progress.
 */

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

// Define the steps and their data
type OnboardingData = {
  display_name: string
  fitness_goal: 'lose_weight' | 'build_muscle' | 'maintain' | 'get_stronger' | ''
  activity_level: 'sedentary' | 'lightly_active' | 'active' | 'very_active' | ''
  height_cm: number | null
  weight_kg: number | null
  date_of_birth: string
}

const initialData: OnboardingData = {
  display_name: '',
  fitness_goal: '',
  activity_level: '',
  height_cm: null,
  weight_kg: null,
  date_of_birth: '',
}

// Step configuration
const steps = [
  { id: 'name', title: "What should we call you?", subtitle: "This is how your AI coach will address you" },
  { id: 'goal', title: "What's your primary goal?", subtitle: "This helps us tailor your workouts and nutrition" },
  { id: 'activity', title: "How active are you?", subtitle: "Your typical week, not including workouts" },
  { id: 'stats', title: "Your basic stats", subtitle: "Used to calculate your calorie and macro targets" },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [data, setData] = useState<OnboardingData>(initialData)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const router = useRouter()
  const supabase = createClient()

  const updateData = (updates: Partial<OnboardingData>) => {
    setData(prev => ({ ...prev, ...updates }))
  }

  const canProceed = () => {
    switch (currentStep) {
      case 0: return data.display_name.trim().length >= 2
      case 1: return data.fitness_goal !== ''
      case 2: return data.activity_level !== ''
      case 3: return data.height_cm && data.weight_kg && data.date_of_birth
      default: return false
    }
  }

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(prev => prev + 1)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1)
    }
  }

  const handleComplete = async () => {
    setLoading(true)
    setError(null)

    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) throw new Error('Not authenticated')

      // Update profile with onboarding data
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          display_name: data.display_name,
          fitness_goal: data.fitness_goal,
          activity_level: data.activity_level,
          height_cm: data.height_cm,
          weight_kg: data.weight_kg,
          date_of_birth: data.date_of_birth,
          onboarding_completed: true,
        })
        .eq('id', user.id)

      if (updateError) throw updateError

      // Redirect to dashboard
      router.push('/dashboard')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl" />
      </div>

      <div className="relative w-96 max-w-full">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            {steps.map((step, index) => (
              <div
                key={step.id}
                className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium transition-colors ${
                  index < currentStep
                    ? 'bg-emerald-500 text-slate-950'
                    : index === currentStep
                    ? 'bg-gradient-to-r from-emerald-400 to-cyan-400 text-slate-950'
                    : 'bg-slate-800 text-slate-500'
                }`}
              >
                {index < currentStep ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
            ))}
          </div>
          <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-400 to-cyan-400 transition-all duration-300"
              style={{ width: `${(currentStep / steps.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Card */}
        <div className="bg-slate-900/50 backdrop-blur-xl rounded-2xl border border-slate-800/50 p-6">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-xl font-bold text-white mb-1">{steps[currentStep].title}</h1>
            <p className="text-slate-400 text-sm">{steps[currentStep].subtitle}</p>
          </div>

          {/* Step Content */}
          <div className="mb-6">
            {/* Step 1: Name */}
            {currentStep === 0 && (
              <input
                type="text"
                value={data.display_name}
                onChange={(e) => updateData({ display_name: e.target.value })}
                placeholder="Enter your name"
                autoFocus
                className="w-full px-4 py-3 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white text-center placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all"
              />
            )}

            {/* Step 2: Goal */}
            {currentStep === 1 && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: 'lose_weight', label: 'Lose Weight', icon: '🔥' },
                  { value: 'build_muscle', label: 'Build Muscle', icon: '💪' },
                  { value: 'maintain', label: 'Maintain', icon: '⚖️' },
                  { value: 'get_stronger', label: 'Get Stronger', icon: '🏋️' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateData({ fitness_goal: option.value as OnboardingData['fitness_goal'] })}
                    className={`p-4 rounded-xl border text-center transition-all ${
                      data.fitness_goal === option.value
                        ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50'
                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                    }`}
                  >
                    <span className="text-2xl">{option.icon}</span>
                    <p className="font-medium text-white text-sm mt-2">{option.label}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 3: Activity Level */}
            {currentStep === 2 && (
              <div className="space-y-2">
                {[
                  { value: 'sedentary', label: 'Sedentary', desc: 'Desk job, little exercise' },
                  { value: 'lightly_active', label: 'Lightly Active', desc: 'Light exercise 1-3 days/week' },
                  { value: 'active', label: 'Active', desc: 'Moderate exercise 3-5 days/week' },
                  { value: 'very_active', label: 'Very Active', desc: 'Hard exercise 6-7 days/week' },
                ].map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => updateData({ activity_level: option.value as OnboardingData['activity_level'] })}
                    className={`w-full p-3 rounded-xl border text-left transition-all ${
                      data.activity_level === option.value
                        ? 'bg-emerald-500/10 border-emerald-500/50 ring-1 ring-emerald-500/50'
                        : 'bg-slate-800/30 border-slate-700/50 hover:bg-slate-800/50'
                    }`}
                  >
                    <p className="font-medium text-white text-sm">{option.label}</p>
                    <p className="text-xs text-slate-400">{option.desc}</p>
                  </button>
                ))}
              </div>
            )}

            {/* Step 4: Stats */}
            {currentStep === 3 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Height (cm)</label>
                    <input
                      type="number"
                      value={data.height_cm || ''}
                      onChange={(e) => updateData({ height_cm: e.target.value ? Number(e.target.value) : null })}
                      placeholder="175"
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1.5">Weight (kg)</label>
                    <input
                      type="number"
                      value={data.weight_kg || ''}
                      onChange={(e) => updateData({ weight_kg: e.target.value ? Number(e.target.value) : null })}
                      placeholder="70"
                      className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">Date of Birth</label>
                  <input
                    type="date"
                    value={data.date_of_birth}
                    onChange={(e) => updateData({ date_of_birth: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-800/50 border border-slate-700/50 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-all [color-scheme:dark]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Navigation */}
          <div className="flex gap-3">
            {currentStep > 0 && (
              <button
                type="button"
                onClick={handleBack}
                className="flex-1 py-3 px-4 rounded-xl border border-slate-700 text-white font-medium hover:bg-slate-800 transition-colors"
              >
                Back
              </button>
            )}
            
            {currentStep < steps.length - 1 ? (
              <button
                type="button"
                onClick={handleNext}
                disabled={!canProceed()}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Continue
              </button>
            ) : (
              <button
                type="button"
                onClick={handleComplete}
                disabled={!canProceed() || loading}
                className="flex-1 py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                {loading ? 'Saving...' : 'Complete Setup'}
              </button>
            )}
          </div>
        </div>

        {/* Skip option */}
        <p className="text-center text-slate-500 text-sm mt-5">
          <button
            type="button"
            onClick={() => router.push('/dashboard')}
            className="hover:text-slate-300 transition-colors"
          >
            Skip for now
          </button>
          {' '}— you can update this later
        </p>
      </div>
    </div>
  )
}

