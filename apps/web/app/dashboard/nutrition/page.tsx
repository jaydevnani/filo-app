/**
 * Nutrition Page
 * 
 * Shows today's food logs with macro totals.
 * Server component - fetches data directly from Supabase.
 */

import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'

export default async function NutritionPage() {
  const supabase = await createClient()
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  
  // Get start and end of today
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)

  // Fetch today's food logs
  const { data: todayLogs, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user!.id)
    .gte('logged_at', today.toISOString())
    .lt('logged_at', tomorrow.toISOString())
    .order('logged_at', { ascending: true })

  // Fetch recent logs (last 7 days, excluding today)
  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)
  
  const { data: recentLogs } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', user!.id)
    .gte('logged_at', weekAgo.toISOString())
    .lt('logged_at', today.toISOString())
    .order('logged_at', { ascending: false })

  // Calculate today's totals
  const todayTotals = todayLogs?.reduce(
    (acc, log) => ({
      calories: acc.calories + (log.calories || 0),
      protein: acc.protein + (log.protein_g || 0),
      carbs: acc.carbs + (log.carbs_g || 0),
      fat: acc.fat + (log.fat_g || 0),
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 }
  ) || { calories: 0, protein: 0, carbs: 0, fat: 0 }

  // Group today's logs by meal type
  const mealOrder = ['breakfast', 'lunch', 'dinner', 'snack', 'other']
  const groupedLogs = todayLogs?.reduce<Record<string, typeof todayLogs>>((acc, log) => {
    const mealType = log.meal_type || 'other'
    if (!acc[mealType]) acc[mealType] = []
    acc[mealType].push(log)
    return acc
  }, {})

  const mealTypeLabels: Record<string, string> = {
    breakfast: '🌅 Breakfast',
    lunch: '☀️ Lunch',
    dinner: '🌙 Dinner',
    snack: '🍎 Snack',
    other: '📝 Other',
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Nutrition</h1>
          <p className="text-slate-400 mt-1">Track your daily food intake</p>
        </div>
        <Link
          href="/dashboard/nutrition/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-emerald-500 to-cyan-500 text-slate-950 font-semibold rounded-xl hover:from-emerald-400 hover:to-cyan-400 transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Log Food
        </Link>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
          Error loading nutrition data: {error.message}
        </div>
      )}

      {/* Today's Summary */}
      <div className="rounded-2xl bg-gradient-to-br from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 p-6">
        <h2 className="text-lg font-semibold text-white mb-4">Today&apos;s Summary</h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="text-center p-3 rounded-xl bg-slate-900/50">
            <p className="text-2xl font-bold text-white">{todayTotals.calories}</p>
            <p className="text-sm text-slate-400">Calories</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-900/50">
            <p className="text-2xl font-bold text-emerald-400">{Math.round(todayTotals.protein)}g</p>
            <p className="text-sm text-slate-400">Protein</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-900/50">
            <p className="text-2xl font-bold text-cyan-400">{Math.round(todayTotals.carbs)}g</p>
            <p className="text-sm text-slate-400">Carbs</p>
          </div>
          <div className="text-center p-3 rounded-xl bg-slate-900/50">
            <p className="text-2xl font-bold text-amber-400">{Math.round(todayTotals.fat)}g</p>
            <p className="text-sm text-slate-400">Fat</p>
          </div>
        </div>
      </div>

      {/* Today's Meals */}
      <div>
        <h2 className="text-lg font-semibold text-white mb-4">Today&apos;s Meals</h2>
        
        {!todayLogs || todayLogs.length === 0 ? (
          <div className="text-center py-12 rounded-xl bg-slate-900/50 border border-slate-800/50">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-slate-800 mb-4">
              <svg className="w-7 h-7 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h3 className="text-base font-medium text-white mb-1">No food logged today</h3>
            <p className="text-slate-400 text-sm mb-4">Start tracking your nutrition</p>
            <Link
              href="/dashboard/nutrition/new"
              className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 text-emerald-400 font-medium rounded-xl hover:bg-emerald-500/20 transition-colors text-sm"
            >
              Log your first meal
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {mealOrder.map((mealType) => {
              const meals = groupedLogs?.[mealType]
              if (!meals || meals.length === 0) return null
              
              const mealTotal = meals.reduce((sum, m) => sum + (m.calories || 0), 0)
              
              return (
                <div key={mealType} className="rounded-xl bg-slate-900/50 border border-slate-800/50 overflow-hidden">
                  <div className="px-4 py-3 bg-slate-800/30 border-b border-slate-800/50 flex items-center justify-between">
                    <h3 className="font-medium text-white">{mealTypeLabels[mealType]}</h3>
                    <span className="text-sm text-slate-400">{mealTotal} cal</span>
                  </div>
                  <div className="divide-y divide-slate-800/50">
                    {meals.map((log) => (
                      <div key={log.id} className="px-4 py-3 flex items-center justify-between hover:bg-slate-800/20">
                        <div>
                          <p className="font-medium text-white">{log.name}</p>
                          <p className="text-xs text-slate-400">
                            {log.protein_g}g P • {log.carbs_g}g C • {log.fat_g}g F
                          </p>
                        </div>
                        <span className="text-sm font-medium text-white">{log.calories} cal</span>
                      </div>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent History */}
      {recentLogs && recentLogs.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold text-white mb-4">Recent History</h2>
          <div className="space-y-2">
            {recentLogs.slice(0, 5).map((log) => {
              const date = new Date(log.logged_at)
              const formattedDate = date.toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
              })
              return (
                <div
                  key={log.id}
                  className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/50"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 text-cyan-400 text-sm">
                      {mealTypeLabels[log.meal_type || 'other']?.split(' ')[0]}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-white">{log.name}</p>
                      <p className="text-xs text-slate-400">{formattedDate}</p>
                    </div>
                  </div>
                  <span className="text-sm text-slate-400">{log.calories} cal</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

