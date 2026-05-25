// ─── AI Service ───────────────────────────────────────────────
// TypeScript service for AI interactions
// Provides structured API calls to the backend AI endpoints

import axiosInstance from './axios'

// ─── Types ───────────────────────────────────────────────────
export interface AICallOptions {
  messages: AIMessage[]
  model?: string
  maxTokens?: number
  temperature?: number
}

export interface AIMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface AIResponse {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export interface UserProfile {
  id: string
  name: string
  standard: string
  board: string
  language: string
  subjects?: string[]
  plan?: string
  displayLanguage?: 'english' | 'medium'
}

// ─── Helper Functions ────────────────────────────────────────

/**
 * Get display language for UI (English or medium language)
 */
export function getDisplayLang(profile: UserProfile | null): string {
  if (!profile) return 'English'
  if (profile.displayLanguage === 'english') return 'English'
  return profile.language || 'English'
}

/**
 * Check if a student query is appropriate (content moderation)
 */
export function checkStudentQuery(query: string): { safe: boolean; reason?: string } {
  // Basic content checks - the backend does more thorough moderation
  const lowered = query.toLowerCase()
  
  // Check for obvious non-educational queries
  const blockedPatterns = [
    /\b(porn|xxx|nude|naked|sex)\b/i,
    /\b(hack|crack|pirate|torrent)\b/i,
    /\b(kill|murder|weapon|bomb)\b/i,
  ]

  for (const pattern of blockedPatterns) {
    if (pattern.test(lowered)) {
      return { safe: false, reason: 'This doesn\'t seem like a study question. Try asking about your subjects!' }
    }
  }

  return { safe: true }
}

// ─── AI API Functions ────────────────────────────────────────

/**
 * Make an AI call through the backend
 */
export async function callAI(options: AICallOptions): Promise<AIResponse> {
  const { messages, model, maxTokens = 1024, temperature = 0.7 } = options

  const response = await axiosInstance.post<AIResponse>('/ai/chat', {
    messages,
    model,
    max_tokens: maxTokens,
    temperature,
  })

  return response.data
}

/**
 * Simple AI call with just a prompt — mode routing handled server-side
 */
export async function askAI(
  prompt: string,
  profile: UserProfile | null,
  mode: string = 'tutor'
): Promise<string> {
  const response = await axiosInstance.post('/ai/chat', {
    prompt,
    system_prompt: '',
    mode,
    history: [],
    max_tokens: 1024,
  })
  return response.data.response || response.data.content || ''
}

/**
 * Parse AI response as JSON object (with fallback)
 */
export function parseAIObject<T>(response: string, fallback: T): T {
  try {
    // Try to extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T
    }
    return fallback
  } catch {
    return fallback
  }
}

/**
 * Parse AI response as JSON array (with fallback)
 */
export function parseAIArray<T>(response: string, fallback: T[]): T[] {
  try {
    // Try to extract JSON array from response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as T[]
    }
    return fallback
  } catch {
    return fallback
  }
}

// ─── Specialized AI Functions ────────────────────────────────

/**
 * Generate quiz questions for a topic
 */
export async function generateQuizQuestions(
  topic: string,
  count: number,
  difficulty: 'easy' | 'medium' | 'hard',
  profile: UserProfile | null
): Promise<Array<{
  question: string
  options: string[]
  correct: number
  explanation: string
}>> {
  const prompt = `Generate ${count} ${difficulty} multiple choice questions about "${topic}" for ${profile?.standard || 'Class 10'} ${profile?.board || 'CBSE'} students.

Return ONLY a JSON array with this structure:
[
  {
    "question": "Question text",
    "options": ["A", "B", "C", "D"],
    "correct": 0,
    "explanation": "Why this answer is correct"
  }
]`

  const response = await askAI(prompt, profile, 'quiz')
  return parseAIArray(response, [])
}

/**
 * Grade a student's answer
 */
export async function gradeAnswer(
  question: string,
  studentAnswer: string,
  profile: UserProfile | null
): Promise<{
  verdict: 'correct' | 'partial' | 'incorrect'
  score: number
  feedback: string
}> {
  const prompt = `Grade this student answer:

Question: ${question}
Student's Answer: ${studentAnswer}

Return ONLY a JSON object:
{
  "verdict": "correct" | "partial" | "incorrect",
  "score": 0-100,
  "feedback": "Brief feedback explaining the grade"
}`

  const response = await askAI(prompt, profile, 'grader')
  return parseAIObject(response, {
    verdict: 'incorrect',
    score: 0,
    feedback: 'Could not grade answer',
  })
}

export default {
  callAI,
  askAI,
  checkStudentQuery,
  parseAIObject,
  parseAIArray,
  getDisplayLang,
  generateQuizQuestions,
  gradeAnswer,
}
