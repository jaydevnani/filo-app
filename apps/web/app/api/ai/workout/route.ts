/**
 * AI Workout Generator API
 * 
 * Generates today's workout based on:
 * - User's workout split template
 * - Recent workout history
 * - Skipped/missed workouts that need rescheduling
 * 
 * Returns:
 * - Which split to do today
 * - AI reasoning for the recommendation
 * - Suggested exercises with sets/reps
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

export async function POST() {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's workout splits
    const { data: splits, error: splitsError } = await supabase
      .from('workout_splits')
      .select('*')
      .eq('user_id', user.id)
      .order('order_in_rotation', { ascending: true })

    if (splitsError) {
      console.error('Error fetching splits:', splitsError)
      return NextResponse.json({ error: 'Failed to fetch workout splits' }, { status: 500 })
    }

    if (!splits || splits.length === 0) {
      return NextResponse.json({ 
        error: 'No workout split configured',
        needsSetup: true 
      }, { status: 400 })
    }

    // Get today's date (start of day)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Check if there's already a planned workout for today
    const { data: existingWorkout } = await supabase
      .from('planned_workouts')
      .select('*, split:workout_splits(*)')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .single()

    if (existingWorkout) {
      // Return existing workout
      return NextResponse.json({
        planned_workout: existingWorkout,
        split: existingWorkout.split,
        isExisting: true,
      })
    }

    // Get recent planned workouts (last 14 days)
    const twoWeeksAgo = new Date(today)
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
    
    const { data: recentWorkouts } = await supabase
      .from('planned_workouts')
      .select('*, split:workout_splits(*)')
      .eq('user_id', user.id)
      .gte('date', twoWeeksAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    // Analyze workout history to determine next split
    const completedSplitIds = new Set(
      recentWorkouts
        ?.filter(w => w.status === 'completed')
        .map(w => w.split_id) || []
    )

    const skippedWorkouts = recentWorkouts?.filter(w => w.status === 'skipped') || []
    const lastCompletedWorkout = recentWorkouts?.find(w => w.status === 'completed')

    // Determine which split is next
    let nextSplit = splits[0] // Default to first split
    let reasoning = ''

    // Check for skipped workouts that need rescheduling
    if (skippedWorkouts.length > 0) {
      const oldestSkipped = skippedWorkouts[skippedWorkouts.length - 1]
      if (oldestSkipped.split) {
        nextSplit = splits.find(s => s.id === oldestSkipped.split_id) || splits[0]
        reasoning = `Rescheduled ${nextSplit.name} - you skipped this earlier and we want to keep your rotation balanced.`
      }
    } else if (lastCompletedWorkout?.split) {
      // Find the next split in rotation after the last completed one
      const lastSplitOrder = lastCompletedWorkout.split.order_in_rotation
      const nextOrder = (lastSplitOrder % splits.length) + 1
      nextSplit = splits.find(s => s.order_in_rotation === nextOrder) || splits[0]
      reasoning = `Next in your rotation after ${lastCompletedWorkout.split.name}.`
    } else {
      reasoning = `Starting fresh with ${nextSplit.name} - let's go! 💪`
    }

    // Check if it's a rest day
    if (nextSplit.is_rest_day) {
      // Create a rest day planned workout
      const { data: plannedWorkout, error: insertError } = await supabase
        .from('planned_workouts')
        .insert({
          user_id: user.id,
          split_id: nextSplit.id,
          date: todayStr,
          status: 'rest',
          exercises: [],
          ai_reasoning: 'Scheduled rest day - recovery is part of progress! 😴',
        })
        .select('*, split:workout_splits(*)')
        .single()

      if (insertError) {
        console.error('Error creating rest day:', insertError)
      }

      return NextResponse.json({
        planned_workout: plannedWorkout,
        split: nextSplit,
        isRestDay: true,
        reasoning: 'Scheduled rest day - recovery is part of progress! 😴',
      })
    }

    // Generate exercises using AI
    let exercises: Array<{
      name: string
      sets: number
      reps: string
      rest_seconds: number
      notes?: string
    }> = []

    if (process.env.GOOGLE_GEMINI_API_KEY) {
      try {
        const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })
        
        const prompt = `You are a fitness coach. Generate a workout for a "${nextSplit.name}" day targeting these muscle groups: ${nextSplit.muscle_groups.join(', ')}.

Return ONLY a JSON array of 5-7 exercises. Each exercise should have:
- name: exercise name
- sets: number of sets (3-5)
- reps: rep range as string (e.g., "8-12", "10", "12-15")
- rest_seconds: rest time in seconds (60-120)
- notes: optional form tip or note

Example format:
[
  {"name": "Barbell Bench Press", "sets": 4, "reps": "6-8", "rest_seconds": 90, "notes": "Focus on controlled descent"},
  {"name": "Incline Dumbbell Press", "sets": 3, "reps": "10-12", "rest_seconds": 75}
]

Return ONLY the JSON array, no other text.`

        const result = await model.generateContent(prompt)
        const responseText = result.response.text()
        
        // Parse the JSON from the response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/)
        if (jsonMatch) {
          exercises = JSON.parse(jsonMatch[0])
        }
      } catch (aiError) {
        console.error('AI exercise generation failed:', aiError)
        // Fall back to basic exercises
        exercises = generateFallbackExercises(nextSplit.muscle_groups)
      }
    } else {
      // No AI key, use fallback
      exercises = generateFallbackExercises(nextSplit.muscle_groups)
    }

    // Create the planned workout
    const { data: plannedWorkout, error: insertError } = await supabase
      .from('planned_workouts')
      .insert({
        user_id: user.id,
        split_id: nextSplit.id,
        date: todayStr,
        status: 'planned',
        exercises: exercises,
        ai_reasoning: reasoning,
      })
      .select('*, split:workout_splits(*)')
      .single()

    if (insertError) {
      console.error('Error creating planned workout:', insertError)
      return NextResponse.json({ error: 'Failed to create workout' }, { status: 500 })
    }

    return NextResponse.json({
      planned_workout: plannedWorkout,
      split: nextSplit,
      exercises,
      reasoning,
      isNew: true,
    })

  } catch (error) {
    console.error('Workout generation error:', error)
    return NextResponse.json(
      { error: 'Failed to generate workout' },
      { status: 500 }
    )
  }
}

// Fallback exercises when AI is unavailable
function generateFallbackExercises(muscleGroups: string[]) {
  const exerciseMap: Record<string, Array<{ name: string; sets: number; reps: string; rest_seconds: number }>> = {
    chest: [
      { name: 'Barbell Bench Press', sets: 4, reps: '8-10', rest_seconds: 90 },
      { name: 'Incline Dumbbell Press', sets: 3, reps: '10-12', rest_seconds: 75 },
      { name: 'Cable Flyes', sets: 3, reps: '12-15', rest_seconds: 60 },
    ],
    back: [
      { name: 'Pull-ups', sets: 4, reps: '8-10', rest_seconds: 90 },
      { name: 'Barbell Rows', sets: 4, reps: '8-10', rest_seconds: 90 },
      { name: 'Lat Pulldown', sets: 3, reps: '10-12', rest_seconds: 75 },
    ],
    shoulders: [
      { name: 'Overhead Press', sets: 4, reps: '8-10', rest_seconds: 90 },
      { name: 'Lateral Raises', sets: 3, reps: '12-15', rest_seconds: 60 },
      { name: 'Face Pulls', sets: 3, reps: '15-20', rest_seconds: 60 },
    ],
    biceps: [
      { name: 'Barbell Curls', sets: 3, reps: '10-12', rest_seconds: 60 },
      { name: 'Hammer Curls', sets: 3, reps: '10-12', rest_seconds: 60 },
    ],
    triceps: [
      { name: 'Tricep Pushdowns', sets: 3, reps: '10-12', rest_seconds: 60 },
      { name: 'Overhead Tricep Extension', sets: 3, reps: '10-12', rest_seconds: 60 },
    ],
    quads: [
      { name: 'Barbell Squats', sets: 4, reps: '8-10', rest_seconds: 120 },
      { name: 'Leg Press', sets: 3, reps: '10-12', rest_seconds: 90 },
      { name: 'Leg Extensions', sets: 3, reps: '12-15', rest_seconds: 60 },
    ],
    hamstrings: [
      { name: 'Romanian Deadlifts', sets: 4, reps: '8-10', rest_seconds: 90 },
      { name: 'Leg Curls', sets: 3, reps: '10-12', rest_seconds: 60 },
    ],
    glutes: [
      { name: 'Hip Thrusts', sets: 4, reps: '10-12', rest_seconds: 90 },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10-12', rest_seconds: 75 },
    ],
    calves: [
      { name: 'Standing Calf Raises', sets: 4, reps: '12-15', rest_seconds: 60 },
      { name: 'Seated Calf Raises', sets: 3, reps: '15-20', rest_seconds: 45 },
    ],
    abs: [
      { name: 'Cable Crunches', sets: 3, reps: '15-20', rest_seconds: 45 },
      { name: 'Hanging Leg Raises', sets: 3, reps: '12-15', rest_seconds: 60 },
    ],
  }

  const exercises: Array<{ name: string; sets: number; reps: string; rest_seconds: number }> = []
  
  for (const muscle of muscleGroups) {
    const muscleExercises = exerciseMap[muscle.toLowerCase()]
    if (muscleExercises) {
      // Add 1-2 exercises per muscle group
      exercises.push(...muscleExercises.slice(0, 2))
    }
  }

  return exercises.slice(0, 7) // Limit to 7 exercises max
}

// GET endpoint to fetch today's workout without regenerating
export async function GET() {
  try {
    const supabase = await createClient()
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayStr = today.toISOString().split('T')[0]

    // Check for existing workout today
    const { data: todayWorkout } = await supabase
      .from('planned_workouts')
      .select('*, split:workout_splits(*)')
      .eq('user_id', user.id)
      .eq('date', todayStr)
      .single()

    // Get user's splits
    const { data: splits } = await supabase
      .from('workout_splits')
      .select('*')
      .eq('user_id', user.id)
      .order('order_in_rotation', { ascending: true })

    return NextResponse.json({
      todayWorkout,
      hasSplits: splits && splits.length > 0,
      splits,
    })

  } catch (error) {
    console.error('Error fetching today workout:', error)
    return NextResponse.json({ error: 'Failed to fetch workout' }, { status: 500 })
  }
}

