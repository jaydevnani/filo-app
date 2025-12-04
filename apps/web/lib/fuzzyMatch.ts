/**
 * Fuzzy String Matching Utility
 * 
 * Used to match AI-generated exercise names to exercises in the database.
 * Uses Levenshtein distance and word overlap for similarity scoring.
 */

/**
 * Calculate Levenshtein distance between two strings
 * Lower distance = more similar
 */
function levenshteinDistance(a: string, b: string): number {
  const matrix: number[][] = []

  // Initialize matrix
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i]
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j
  }

  // Fill matrix
  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1]
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        )
      }
    }
  }

  return matrix[b.length][a.length]
}

/**
 * Calculate similarity percentage based on Levenshtein distance
 */
function levenshteinSimilarity(a: string, b: string): number {
  const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase())
  const maxLength = Math.max(a.length, b.length)
  if (maxLength === 0) return 100
  return ((maxLength - distance) / maxLength) * 100
}

/**
 * Calculate word overlap similarity
 * Checks how many words from string A appear in string B
 */
function wordOverlapSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  const wordsB = b.toLowerCase().split(/\s+/).filter(w => w.length > 2)
  
  if (wordsA.length === 0 || wordsB.length === 0) return 0
  
  let matches = 0
  for (const wordA of wordsA) {
    for (const wordB of wordsB) {
      // Check if words are similar (allow for slight variations)
      if (wordA === wordB || levenshteinSimilarity(wordA, wordB) > 80) {
        matches++
        break
      }
    }
  }
  
  return (matches / Math.max(wordsA.length, wordsB.length)) * 100
}

/**
 * Normalize exercise name for better matching
 * Removes common variations and standardizes format
 */
function normalizeExerciseName(name: string): string {
  return name
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/dumbbell|dumbell|db/gi, 'dumbbell')
    .replace(/barbell|bb/gi, 'barbell')
    .replace(/cable/gi, 'cable')
    .replace(/machine/gi, 'machine')
    .replace(/\(.*?\)/g, '') // Remove parentheses content
    .replace(/[^a-z0-9\s]/g, '') // Remove special characters
    .trim()
}

/**
 * Calculate combined similarity score
 * Weights Levenshtein and word overlap
 */
export function calculateSimilarity(searchName: string, exerciseName: string): number {
  const normalizedSearch = normalizeExerciseName(searchName)
  const normalizedExercise = normalizeExerciseName(exerciseName)
  
  // Exact match after normalization
  if (normalizedSearch === normalizedExercise) {
    return 100
  }
  
  // Calculate both similarity scores
  const levenshtein = levenshteinSimilarity(normalizedSearch, normalizedExercise)
  const wordOverlap = wordOverlapSimilarity(normalizedSearch, normalizedExercise)
  
  // Weighted combination (word overlap is more important for exercise names)
  return (levenshtein * 0.4) + (wordOverlap * 0.6)
}

/**
 * Find the best matching exercise from a list
 */
export interface Exercise {
  id: string
  name: string
  muscle_group: string
  equipment?: string
}

export interface MatchResult {
  exercise: Exercise | null
  similarity: number
  isNewExercise: boolean
}

export function findBestMatch(
  searchName: string,
  exercises: Exercise[],
  threshold: number = 70
): MatchResult {
  let bestMatch: Exercise | null = null
  let bestSimilarity = 0
  
  for (const exercise of exercises) {
    const similarity = calculateSimilarity(searchName, exercise.name)
    
    if (similarity > bestSimilarity) {
      bestSimilarity = similarity
      bestMatch = exercise
    }
    
    // Perfect match, no need to continue
    if (similarity === 100) break
  }
  
  // If similarity is below threshold, we'll create a new exercise
  if (bestSimilarity < threshold) {
    return {
      exercise: null,
      similarity: bestSimilarity,
      isNewExercise: true,
    }
  }
  
  return {
    exercise: bestMatch,
    similarity: bestSimilarity,
    isNewExercise: false,
  }
}

/**
 * Batch match multiple exercise names
 */
export function matchExercises(
  searchNames: string[],
  exercises: Exercise[],
  threshold: number = 70
): Map<string, MatchResult> {
  const results = new Map<string, MatchResult>()
  
  for (const name of searchNames) {
    results.set(name, findBestMatch(name, exercises, threshold))
  }
  
  return results
}

