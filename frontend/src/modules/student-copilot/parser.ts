import type { LabKey, TabKey } from '../../shared/constants/plans'
import type { StudentVoiceIntent, StudentVoiceParseContext } from './types'

const STUDENT_TABS: TabKey[] = [
  'home',
  'learn',
  'practice',
  'profile',
  'coach',
  'notebook',
  'learntv',
  'labs',
  'squads',
  'mistakes',
  'battles',
]

const LAB_KEYS: LabKey[] = ['quiz', 'examiner', 'samjhao', 'podcast', 'essay', 'mental']

const BLOCKED_PATTERNS = [
  /\b(admin|super\s*admin|teacher\s*portal|school\s*admin|helper\s*portal)\b/i,
  /\b(delete\s+user|drop\s+database|reset\s+server)\b/i,
]

const COMMAND_WORDS = [
  'open', 'go', 'goto', 'go to', 'take me', 'show', 'start', 'chalo', 'kholo', 'khol do',
  'dikhao', 'jaa', 'jao', 'chal', 'khol', 'खोलो', 'चालू', 'जाओ', 'चलो',
]

const QUESTION_WORDS = [
  'what', 'why', 'how', 'when', 'where', 'who', 'which', 'explain', 'solve', 'derive', 'prove',
  'difference', 'meaning', 'define', 'concept', 'formula', 'example',
  'क्या', 'क्यों', 'कैसे', 'समझाओ', 'बताओ', 'क्योंकि',
]

const SUBJECT_HINTS = [
  'math', 'mathematics', 'algebra', 'geometry', 'trigonometry', 'calculus',
  'physics', 'chemistry', 'biology', 'science', 'history', 'geography',
  'civics', 'economics', 'english', 'hindi', 'marathi', 'computer', 'coding',
  'equation', 'chapter', 'numerical', 'theorem', 'photosynthesis',
]

const TAB_ALIASES: Record<TabKey, string[]> = {
  home: ['home', 'ghar', 'dashboard', 'home tab'],
  learn: ['learn', 'study', 'padhai', 'पढ़ाई', 'सीखो'],
  practice: ['practice', 'abhyas', 'revision practice', 'अभ्यास'],
  profile: ['profile', 'my profile', 'account', 'meri profile', 'प्रोफाइल'],
  coach: ['coach', 'ai coach', 'study coach', 'tutor', 'mentor'],
  notebook: ['notebook', 'notes', 'my notebook', 'notebok', 'नोटबुक'],
  learntv: ['learntv', 'learn tv', 'video class', 'videos tab', 'learn tv tab'],
  labs: ['labs', 'lab', 'prayogshala', 'प्रयोगशाला'],
  squads: ['squads', 'squad', 'sathi', 'community', 'study group'],
  mistakes: ['mistakes', 'bhool', 'bhool bazaar', 'mistake market'],
  battles: ['battles', 'battle', 'muqabla', 'arena', 'competition'],
}

const LAB_ALIASES: Record<LabKey, string[]> = {
  quiz: ['quiz', 'quiz lab', 'mcq', 'test lab'],
  examiner: ['examiner', 'examiner lab', 'exam lab', 'marks hunter'],
  samjhao: ['samjhao', 'samjhao lab', 'explain lab', 'samjha do'],
  podcast: ['podcast', 'podcast lab', 'audio lab'],
  essay: ['essay', 'essay lab', 'writing lab', 'nibandh'],
  mental: ['mental', 'mental lab', 'mind lab', 'wellness'],
}

function normalizeText(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function phraseScore(text: string, aliases: string[]): number {
  let score = 0
  for (const phrase of aliases) {
    const p = normalizeText(phrase)
    if (!p) continue
    if (text.includes(p)) {
      score = Math.max(score, Math.min(1, p.length / 10 + 0.35))
    }
  }
  return score
}

function hasCommandWord(text: string): boolean {
  return COMMAND_WORDS.some((w) => text.includes(normalizeText(w)))
}

function stripFillerWords(text: string): string {
  return text
    .replace(/\b(please|pls|kindly|haan|han|yes|no|nahi|nahin|nhi)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function looksLikeStudyQuery(text: string): boolean {
  const tokens = text.split(/\s+/).filter(Boolean)
  const hasQuestionWord = QUESTION_WORDS.some((w) => text.includes(normalizeText(w)))
  const hasSubjectHint = SUBJECT_HINTS.some((w) => text.includes(normalizeText(w)))
  const hasQuestionMarkStyle = /\?$/.test(text) || text.includes(' ?')
  const isLongEnough = tokens.length >= 4
  return hasQuestionWord || hasSubjectHint || (hasQuestionMarkStyle && isLongEnough)
}

function topTabMatches(text: string): Array<{ tab: TabKey; score: number }> {
  const matches: Array<{ tab: TabKey; score: number }> = []
  for (const tab of STUDENT_TABS) {
    const score = phraseScore(text, TAB_ALIASES[tab])
    if (score > 0) matches.push({ tab, score })
  }
  return matches.sort((a, b) => b.score - a.score)
}

function topLabMatches(text: string): Array<{ lab: LabKey; score: number }> {
  const matches: Array<{ lab: LabKey; score: number }> = []
  for (const lab of LAB_KEYS) {
    const score = phraseScore(text, LAB_ALIASES[lab])
    if (score > 0) matches.push({ lab, score })
  }
  return matches.sort((a, b) => b.score - a.score)
}

export function parseStudentVoiceIntent(raw: string, parseContext: StudentVoiceParseContext = {}): StudentVoiceIntent {
  const normalized = normalizeText(raw)

  if (!normalized) {
    return { intent: 'unknown', confidence: 0, raw }
  }

  for (const blocked of BLOCKED_PATTERNS) {
    if (blocked.test(normalized)) {
      return {
        intent: 'blocked',
        confidence: 1,
        raw,
        reason: 'student_only_scope',
      }
    }
  }

  // Contextual follow-up: resolve one-turn ambiguity like "learn" or "learntv"
  // after prior clarification prompt.
  const followUpText = stripFillerWords(normalized)
  if (followUpText && (parseContext.pendingAlternatives?.length || 0) > 0) {
    const candidates = parseContext.pendingAlternatives || []
    let bestCandidate: TabKey | undefined
    let bestScore = 0
    for (const tab of candidates) {
      const score = phraseScore(followUpText, TAB_ALIASES[tab])
      if (score > bestScore) {
        bestScore = score
        bestCandidate = tab
      }
    }

    if (bestCandidate && bestScore >= 0.5) {
      return {
        intent: 'navigate_tab',
        targetTab: bestCandidate,
        confidence: Math.min(1, bestScore + 0.1),
        raw,
      }
    }
  }

  // Common ASR ambiguity: "learn video" could mean Learn tab or LearnTV tab.
  if (normalized.includes('learn') && (normalized.includes('video') || normalized.includes('tv')) && !normalized.includes('learntv')) {
    return {
      intent: 'unknown',
      confidence: 0.62,
      raw,
      alternatives: ['learn', 'learntv'],
    }
  }

  const commandBoost = hasCommandWord(normalized) ? 0.08 : 0
  const tabMatches = topTabMatches(normalized)
  const labMatches = topLabMatches(normalized)

  const bestTab = tabMatches[0]
  const secondTab = tabMatches[1]
  const bestLab = labMatches[0]

  const tabScore = bestTab ? Math.min(1, bestTab.score + commandBoost) : 0
  const labScore = bestLab ? Math.min(1, bestLab.score + commandBoost) : 0

  if (bestLab && (labScore >= tabScore - 0.05)) {
    return {
      intent: 'open_lab',
      targetTab: 'labs',
      targetLab: bestLab.lab,
      confidence: labScore,
      raw,
    }
  }

  if (bestTab) {
    const isAmbiguous = secondTab && Math.abs(tabScore - secondTab.score) < 0.1
    if (isAmbiguous) {
      return {
        intent: 'unknown',
        confidence: tabScore,
        raw,
        alternatives: [bestTab.tab, secondTab.tab],
      }
    }

    if (tabScore >= 0.55) {
      return {
        intent: 'navigate_tab',
        targetTab: bestTab.tab,
        confidence: tabScore,
        raw,
      }
    }
  }

  const conversationalText = stripFillerWords(raw).trim()
  if (looksLikeStudyQuery(normalized) && conversationalText.length >= 8) {
    return {
      intent: 'ask_coach',
      targetTab: 'coach',
      query: conversationalText,
      confidence: Math.max(0.65, Math.max(tabScore, labScore)),
      raw,
    }
  }

  return {
    intent: 'unknown',
    confidence: Math.max(tabScore, labScore),
    raw,
  }
}
