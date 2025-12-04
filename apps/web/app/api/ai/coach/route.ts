/**
 * AI Coach API Route
 * 
 * Generates personalized fitness insights and daily plans using Google Gemini.
 * 
 * HOW IT WORKS:
 * 1. Fetches user's profile, recent workouts, and nutrition data
 * 2. Sends this context to Gemini with a fitness coach persona
 * 3. Returns personalized insights and recommendations
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

// Initialize Gemini client
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    // Check for API key
    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json(
        { error: 'Gemini API key not configured' },
        { status: 500 }
      )
    }

    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get request body
    const { type = 'insight' } = await request.json()

    // Fetch user's profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single()

    // Get date ranges
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)

    // Fetch recent workouts (last 7 days)
    const { data: recentWorkouts } = await supabase
      .from('workout_sessions')
      .select(`
        id,
        name,
        started_at,
        workout_sets (
          reps,
          weight_kg,
          exercise:exercises (
            name,
            muscle_group
          )
        )
      `)
      .eq('user_id', user.id)
      .gte('started_at', weekAgo.toISOString())
      .order('started_at', { ascending: false })

    // Fetch today's nutrition
    const { data: todayNutrition } = await supabase
      .from('food_logs')
      .select('*')
      .eq('user_id', user.id)
      .gte('logged_at', today.toISOString())
      .lt('logged_at', tomorrow.toISOString())

    // Fetch recent nutrition (last 7 days)
    const { data: recentNutrition } = await supabase
      .from('food_logs')
      .select('calories, protein_g, carbs_g, fat_g, logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', weekAgo.toISOString())

    // Calculate stats
    const workoutsThisWeek = recentWorkouts?.length || 0
    const totalVolumeThisWeek = recentWorkouts?.reduce((total, session) => {
      const sessionVolume = session.workout_sets?.reduce((sum: number, set: { reps: number; weight_kg: number | null }) => {
        return sum + (set.reps * (set.weight_kg || 0))
      }, 0) || 0
      return total + sessionVolume
    }, 0) || 0

    const todayCalories = todayNutrition?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0
    const todayProtein = todayNutrition?.reduce((sum, log) => sum + (log.protein_g || 0), 0) || 0

    // Calculate weekly averages
    const weeklyCalories = recentNutrition?.reduce((sum, log) => sum + (log.calories || 0), 0) || 0
    const weeklyProtein = recentNutrition?.reduce((sum, log) => sum + (log.protein_g || 0), 0) || 0
    const daysWithLogs = new Set(recentNutrition?.map(log => log.logged_at.split('T')[0])).size || 1
    const avgDailyCalories = Math.round(weeklyCalories / daysWithLogs)
    const avgDailyProtein = Math.round(weeklyProtein / daysWithLogs)

    // Get muscle groups trained this week
    const muscleGroupsTrained = new Set<string>()
    recentWorkouts?.forEach(workout => {
      workout.workout_sets?.forEach((set: { exercise: { muscle_group: string } | null }) => {
        if (set.exercise?.muscle_group) {
          muscleGroupsTrained.add(set.exercise.muscle_group)
        }
      })
    })

    // Build context for AI
    const userContext = `
USER PROFILE:
- Name: ${profile?.display_name || 'User'}
- Goal: ${profile?.fitness_goal?.replace('_', ' ') || 'Not set'}
- Activity Level: ${profile?.activity_level?.replace('_', ' ') || 'Not set'}
- Height: ${profile?.height_cm ? `${profile.height_cm} cm` : 'Not set'}
- Weight: ${profile?.weight_kg ? `${profile.weight_kg} kg` : 'Not set'}

THIS WEEK'S ACTIVITY:
- Workouts completed: ${workoutsThisWeek}
- Total volume lifted: ${Math.round(totalVolumeThisWeek)} kg
- Muscle groups trained: ${muscleGroupsTrained.size > 0 ? Array.from(muscleGroupsTrained).join(', ') : 'None yet'}

TODAY'S NUTRITION:
- Calories: ${todayCalories}
- Protein: ${Math.round(todayProtein)}g

WEEKLY NUTRITION AVERAGES:
- Avg daily calories: ${avgDailyCalories}
- Avg daily protein: ${avgDailyProtein}g
`

    // Different prompts based on request type
    let prompt = ''

    if (type === 'insight') {
      prompt = `You are Filo, an encouraging and knowledgeable AI fitness coach. Based on the following user data, give a brief, personalized insight or tip. Keep it to 2-3 sentences max. Be friendly and motivating. Use 1-2 relevant emojis.

${userContext}

Give a quick personalized insight or tip:`
    } else if (type === 'daily_plan') {
      prompt = `You are Filo, an expert AI fitness coach. Based on the following user data, create a brief, actionable daily plan. Format your response as:

**Today's Focus:** [one line summary]

**Workout:** [brief workout suggestion or rest day recommendation]

**Nutrition Target:** [specific calorie/protein goal]

**Tip:** [one actionable tip]

Keep it concise and practical. Consider the user's goal and recent activity.

${userContext}

Create today's personalized plan:`
    }

    // Call Gemini 2.5 Flash (latest stable, high quotas)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
    
    const result = await model.generateContent(prompt)
    const response = result.response.text()

    return NextResponse.json({ 
      message: response,
      stats: {
        workoutsThisWeek,
        totalVolumeThisWeek: Math.round(totalVolumeThisWeek),
        todayCalories,
        todayProtein: Math.round(todayProtein),
        avgDailyCalories,
        avgDailyProtein,
      }
    })

  } catch (error) {
    console.error('AI Coach error:', error)
    
    // Check for rate limit error
    const errorMessage = error instanceof Error ? error.message : ''
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please wait a minute and try again.' },
        { status: 429 }
      )
    }
    
    return NextResponse.json(
      { error: 'Failed to generate insight' },
      { status: 500 }
    )
  }
}
