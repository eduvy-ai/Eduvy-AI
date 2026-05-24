// ─── Curriculum Constants ─────────────────────────────────────
// Boards, languages, classes, and subjects

export const BOARDS = [
  'CBSE',
  'ICSE',
  'GSEB',
  'MSBSHSE',
  'RBSE',
  'UP Board',
  'BSEB',
  'TN Board',
  'KAR Board',
  'PSEB',
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

export const CLASSES = Array.from({ length: 12 }, (_, i) => `Class ${i + 1}`) as readonly string[]

export type ClassType = (typeof CLASSES)[number]

export const SUBJECTS: Record<string, readonly string[]> = {
  'Class 1': ['English', 'Hindi', 'Mathematics', 'EVS', 'Drawing'],
  'Class 2': ['English', 'Hindi', 'Mathematics', 'EVS', 'Drawing'],
  'Class 3': ['English', 'Hindi', 'Mathematics', 'EVS', 'Drawing'],
  'Class 4': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies'],
  'Class 5': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Studies'],
  'Class 6': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit'],
  'Class 7': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit'],
  'Class 8': ['English', 'Hindi', 'Mathematics', 'Science', 'Social Science', 'Sanskrit'],
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
