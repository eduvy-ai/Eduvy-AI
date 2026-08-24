import { describe, it, expect } from 'vitest'
import { parseStudentVoiceIntent } from '../modules/student-copilot/parser'

describe('parseStudentVoiceIntent', () => {
  it('parses direct tab navigation command', () => {
    const intent = parseStudentVoiceIntent('open notebook')
    expect(intent.intent).toBe('navigate_tab')
    expect(intent.targetTab).toBe('notebook')
    expect(intent.confidence).toBeGreaterThanOrEqual(0.55)
  })

  it('parses brand aliases for student tabs', () => {
    const intent = parseStudentVoiceIntent('Sathi kholo')
    expect(intent.intent).toBe('navigate_tab')
    expect(intent.targetTab).toBe('squads')
  })

  it('parses lab deep-link command', () => {
    const intent = parseStudentVoiceIntent('start quiz lab')
    expect(intent.intent).toBe('open_lab')
    expect(intent.targetTab).toBe('labs')
    expect(intent.targetLab).toBe('quiz')
  })

  it('blocks admin commands in student mode', () => {
    const intent = parseStudentVoiceIntent('open admin panel')
    expect(intent.intent).toBe('blocked')
    expect(intent.reason).toBe('student_only_scope')
  })

  it('returns unknown for low-signal command', () => {
    const intent = parseStudentVoiceIntent('open')
    expect(intent.intent).toBe('unknown')
  })

  it('returns alternatives for ambiguous tab command', () => {
    const intent = parseStudentVoiceIntent('open learn video')
    expect(intent.intent).toBe('unknown')
    expect((intent.alternatives || []).length).toBeGreaterThan(0)
  })

  it('resolves follow-up choice from pending alternatives', () => {
    const intent = parseStudentVoiceIntent('learn tv', {
      pendingAlternatives: ['learn', 'learntv'],
    })
    expect(intent.intent).toBe('navigate_tab')
    expect(intent.targetTab).toBe('learntv')
  })
})
