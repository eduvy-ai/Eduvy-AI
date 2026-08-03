// ─── Curriculum Constants ─────────────────────────────────────
// Boards, languages, classes, and subjects

export const BOARDS = [
  'CBSE',
  'ICSE',
  'GSEB',
  'MSBSHSE',
] as const

export type BoardType = (typeof BOARDS)[number]

export const LANGUAGES = [
  'English',
  'Hindi',
  'Gujarati',
  'Marathi',
  'Tamil',
  'Telugu',
  'Kannada',
  'Bengali',
  'Punjabi',
  'Odia',
  'Urdu',
] as const

export type LanguageType = (typeof LANGUAGES)[number]

export const CLASSES = Array.from({ length: 4 }, (_, i) => `Class ${i + 9}`) as readonly string[]

export type ClassType = (typeof CLASSES)[number]

export const SUBJECTS: Record<string, readonly string[]> = {
  'Class 9': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'IT'],
  'Class 10': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit', 'IT'],
  'Class 11': [
    'Physics',
    'Chemistry',
    'Mathematics',
    'Biology',
    'English',
    'Computer Science',
    'Economics',
    'History',
    'Geography',
    'Accountancy',
    'Business Studies',
  ],
  'Class 12': [
    'Physics',
    'Chemistry',
    'Mathematics',
    'Biology',
    'English',
    'Computer Science',
    'Economics',
    'History',
    'Geography',
    'Accountancy',
    'Business Studies',
  ],
}

/** Get subjects for a given class */
export function getSubjectsForClass(standard: string): readonly string[] {
  return SUBJECTS[standard] || []
}
