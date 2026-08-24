import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useStudentVoiceCopilot } from '../modules/student-copilot/useStudentVoiceCopilot'

const mockNavigate = vi.fn()
type StartVoiceInputFn = (langCode: string) => Promise<string>
const mockStartVoiceInput = vi.fn<StartVoiceInputFn>()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../shared.js', () => ({
  LANG_TO_SPEECH_CODE: { English: 'en-IN' },
  startVoiceInput: (langCode: string) => mockStartVoiceInput(langCode),
}))

function VoiceHarness() {
  const { pendingAlternatives, lastMessage, chooseAlternative, runVoiceCommand } = useStudentVoiceCopilot('English')

  return (
    <div>
      <button type="button" onClick={() => { void runVoiceCommand() }}>
        Run Voice
      </button>
      <p data-testid="voice-message">{lastMessage}</p>
      <div>
        {pendingAlternatives.map((tab) => (
          <button key={tab} type="button" onClick={() => { chooseAlternative(tab) }}>
            {tab}
          </button>
        ))}
      </div>
    </div>
  )
}

describe('useStudentVoiceCopilot integration', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockStartVoiceInput.mockReset()
  })

  it('shows ambiguity options and resolves selection to navigation', async () => {
    const user = userEvent.setup()
    mockStartVoiceInput.mockResolvedValueOnce('open learn video')

    render(<VoiceHarness />)
    await user.click(screen.getByRole('button', { name: /run voice/i }))

    await waitFor(() => {
      expect(screen.getByText('learn')).toBeInTheDocument()
      expect(screen.getByText('learntv')).toBeInTheDocument()
      expect(screen.getByTestId('voice-message')).toHaveTextContent('Did you mean learn or learntv?')
    })

    await user.click(screen.getByRole('button', { name: 'learntv' }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/app/learntv')
      expect(screen.getByTestId('voice-message')).toHaveTextContent('Opening learntv.')
      expect(screen.queryByRole('button', { name: 'learn' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: 'learntv' })).not.toBeInTheDocument()
    })
  })
})
