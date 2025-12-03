'use client'

/**
 * AI Coach Component
 * 
 * Interactive AI coach that provides personalized insights
 * and daily plans based on the user's workout and nutrition data.
 */

import { useState } from 'react'

type AICoachProps = {
  userName: string
}

export function AICoach({ userName }: AICoachProps) {
  const [insight, setInsight] = useState<string | null>(null)
  const [dailyPlan, setDailyPlan] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'insight' | 'plan'>('insight')

  const generateInsight = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'insight' }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate insight')
      }

      const data = await response.json()
      setInsight(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const generateDailyPlan = async () => {
    setLoading(true)
    setError(null)
    
    try {
      const response = await fetch('/api/ai/coach', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: 'daily_plan' }),
      })

      if (!response.ok) {
        throw new Error('Failed to generate plan')
      }

      const data = await response.json()
      setDailyPlan(data.message)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  const handleGenerate = () => {
    if (activeTab === 'insight') {
      generateInsight()
    } else {
      generateDailyPlan()
    }
  }

  const currentContent = activeTab === 'insight' ? insight : dailyPlan

  return (
    <div className="rounded-2xl bg-slate-900/50 border border-slate-800/50 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-cyan-400">
            <svg className="w-5 h-5 text-slate-950" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <div>
            <h3 className="font-semibold text-white">Filo Coach</h3>
            <p className="text-xs text-slate-400">AI-powered fitness assistant</p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-800/50">
        <button
          onClick={() => setActiveTab('insight')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'insight'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Quick Insight
        </button>
        <button
          onClick={() => setActiveTab('plan')}
          className={`flex-1 py-3 text-sm font-medium transition-colors ${
            activeTab === 'plan'
              ? 'text-emerald-400 border-b-2 border-emerald-400'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Daily Plan
        </button>
      </div>

      {/* Content */}
      <div className="p-6">
        {/* Error */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
            {error}
          </div>
        )}

        {/* Generated Content */}
        {currentContent ? (
          <div className="mb-4">
            <div className="prose prose-invert prose-sm max-w-none">
              <div 
                className="text-slate-300 leading-relaxed whitespace-pre-wrap"
                dangerouslySetInnerHTML={{ 
                  __html: currentContent
                    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-white">$1</strong>')
                    .replace(/\n/g, '<br/>')
                }}
              />
            </div>
          </div>
        ) : (
          <div className="mb-4 text-slate-400 text-sm">
            {activeTab === 'insight' 
              ? `Hey ${userName}! 👋 Click below to get a personalized insight based on your recent activity.`
              : `Generate your personalized daily plan with workout and nutrition recommendations.`
            }
          </div>
        )}

        {/* Generate Button */}
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="w-full py-3 px-4 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Thinking...
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
              {currentContent ? 'Regenerate' : 'Generate'} {activeTab === 'insight' ? 'Insight' : 'Plan'}
            </>
          )}
        </button>
      </div>
    </div>
  )
}

