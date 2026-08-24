import type { LabKey, TabKey } from '../../shared/constants/plans'

export type StudentVoiceIntentType = 'navigate_tab' | 'open_lab' | 'unknown' | 'blocked'

export interface StudentVoiceIntent {
  intent: StudentVoiceIntentType
  targetTab?: TabKey
  targetLab?: LabKey
  confidence: number
  raw: string
  alternatives?: TabKey[]
  reason?: string
}

export interface StudentVoiceParseContext {
  pendingAlternatives?: TabKey[]
}

export interface StudentVoiceResult {
  ok: boolean
  message: string
  intent: StudentVoiceIntent
}
