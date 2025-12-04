/**
 * AI Exercise API
 * 
 * Endpoints for exercise-related AI features:
 * - Suggest alternative exercises
 * - Validate user-suggested replacements
 */

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GEMINI_API_KEY || '')

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { action, exercise, muscleGroups, userSuggestion } = await request.json()

    if (!process.env.GOOGLE_GEMINI_API_KEY) {
      return NextResponse.json({ 
        error: 'AI not configured',
        alternatives: getFallbackAlternatives(exercise.name)
      }, { status: 200 })
    }

    const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' })

    if (action === 'suggest_alternative') {
      // Suggest alternative exercises
      const prompt = `You are a fitness coach. The user cannot do "${exercise.name}" (targeting: ${muscleGroups?.join(', ') || 'unknown'}).

Suggest 3 alternative exercises that:
1. Target the same muscle groups
2. Use different equipment (e.g., if original uses barbell, suggest dumbbell/cable/bodyweight options)
3. Are suitable for a gym or home workout

Return ONLY a JSON array with 3 alternatives. Each should have:
- name: exercise name
- sets: number (keep similar to original: ${exercise.sets})
- reps: string (keep similar to original: "${exercise.reps}")
- rest_seconds: number (keep similar to original: ${exercise.rest_seconds})
- reason: brief explanation of why this is a good alternative

Example:
[
  {"name": "Dumbbell Bench Press", "sets": 4, "reps": "8-10", "rest_seconds": 90, "reason": "Same movement pattern, easier to set up"}
]

Return ONLY the JSON array, no other text.`

      const result = await model.generateContent(prompt)
      const responseText = result.response.text()
      
      // Parse the JSON from the response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const alternatives = JSON.parse(jsonMatch[0])
        return NextResponse.json({ alternatives })
      }

      return NextResponse.json({ 
        alternatives: getFallbackAlternatives(exercise.name)
      })

    } else if (action === 'validate_replacement') {
      // Validate user's suggested replacement
      const prompt = `You are a fitness coach. The user wants to replace "${exercise.name}" with "${userSuggestion}".

Original exercise targets: ${muscleGroups?.join(', ') || 'unknown'}

Evaluate this replacement and respond with ONLY a JSON object:
{
  "isGood": boolean (true if it's a reasonable replacement),
  "feedback": "Brief feedback about the replacement (1-2 sentences)",
  "suggestion": "If not good, suggest a better alternative, otherwise null"
}

Be encouraging but honest. If the replacement hits similar muscles, approve it.`

      const result = await model.generateContent(prompt)
      const responseText = result.response.text()
      
      // Parse the JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const validation = JSON.parse(jsonMatch[0])
        return NextResponse.json(validation)
      }

      return NextResponse.json({ 
        isGood: true, 
        feedback: "Looks like a reasonable swap!",
        suggestion: null
      })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Exercise API error:', error)
    
    // Check for rate limit
    const errorMessage = error instanceof Error ? error.message : ''
    if (errorMessage.includes('429') || errorMessage.includes('Too Many Requests')) {
      return NextResponse.json(
        { error: 'Rate limit reached. Please try again in a minute.' },
        { status: 429 }
      )
    }

    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    )
  }
}

// Fallback alternatives when AI is unavailable
function getFallbackAlternatives(exerciseName: string) {
  const lowerName = exerciseName.toLowerCase()
  
  if (lowerName.includes('bench') || lowerName.includes('chest')) {
    return [
      { name: 'Push-ups', sets: 3, reps: '15-20', rest_seconds: 60, reason: 'Bodyweight alternative' },
      { name: 'Dumbbell Floor Press', sets: 4, reps: '10-12', rest_seconds: 75, reason: 'No bench needed' },
      { name: 'Cable Chest Press', sets: 3, reps: '12-15', rest_seconds: 60, reason: 'Constant tension' },
    ]
  }
  
  if (lowerName.includes('squat')) {
    return [
      { name: 'Goblet Squats', sets: 4, reps: '12-15', rest_seconds: 75, reason: 'Dumbbell alternative' },
      { name: 'Leg Press', sets: 4, reps: '10-12', rest_seconds: 90, reason: 'Machine alternative' },
      { name: 'Bulgarian Split Squats', sets: 3, reps: '10-12 each', rest_seconds: 60, reason: 'Unilateral option' },
    ]
  }
  
  if (lowerName.includes('pull') || lowerName.includes('row')) {
    return [
      { name: 'Dumbbell Rows', sets: 4, reps: '10-12', rest_seconds: 75, reason: 'Dumbbell alternative' },
      { name: 'Cable Rows', sets: 3, reps: '12-15', rest_seconds: 60, reason: 'Constant tension' },
      { name: 'Inverted Rows', sets: 3, reps: '12-15', rest_seconds: 60, reason: 'Bodyweight option' },
    ]
  }
  
  // Generic fallback
  return [
    { name: 'Alternative Exercise 1', sets: 3, reps: '10-12', rest_seconds: 60, reason: 'Similar movement pattern' },
    { name: 'Alternative Exercise 2', sets: 3, reps: '12-15', rest_seconds: 60, reason: 'Different equipment' },
    { name: 'Alternative Exercise 3', sets: 3, reps: '10-12', rest_seconds: 60, reason: 'Bodyweight option' },
  ]
}

