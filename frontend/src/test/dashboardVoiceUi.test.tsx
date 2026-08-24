import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import DashboardLayout from '../layouts/DashboardLayout'

const mockNavigate = vi.fn()
const mockLogout = vi.fn()
const mockChooseAlternative = vi.fn()
const mockRunVoiceCommand = vi.fn().mockResolvedValue({ ok: true })
const mockUseStudentVoiceCopilot = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ pathname: '/app/home' }),
  Outlet: () => <div data-testid="dashboard-outlet" />,
}))

vi.mock('../modules/auth/hooks', () => ({
  useAuth: () => ({ logout: mockLogout }),
  useUser: () => ({
    name: 'Student',
    language: 'English',
    standard: '10',
    board: 'CBSE',
  }),
}))

vi.mock('../shared.js', () => ({
  li: () => ({
    homeTab: 'Home',
    learnTab: 'Learn',
    aiTutorTab: 'AI Tutor',
    practiceTab: 'Practice',
    profileTab: 'Profile',
    logout: 'Logout',
  }),
  getDisplayLang: () => 'English',
}))

vi.mock('../i18n/index.js', () => ({
  isRTL: () => false,
}))

vi.mock('../modules/student-copilot/useStudentVoiceCopilot', () => ({
  useStudentVoiceCopilot: (...args: [string]) => mockUseStudentVoiceCopilot(...args),
}))

describe('DashboardLayout voice UI', () => {
  beforeEach(() => {
    mockNavigate.mockReset()
    mockLogout.mockReset()
    mockChooseAlternative.mockReset()
    mockRunVoiceCommand.mockClear()

    mockUseStudentVoiceCopilot.mockReturnValue({
      isListening: false,
      lastTranscript: 'open learn video',
      lastMessage: 'Did you mean learn or learntv?',
      pendingAlternatives: ['learn', 'learntv'],
      chooseAlternative: mockChooseAlternative,
      runVoiceCommand: mockRunVoiceCommand,
    })
  })

  it('renders ambiguity choices and forwards selected alternative', async () => {
    const user = userEvent.setup()
    render(<DashboardLayout />)

    expect(screen.getByText('Did you mean learn or learntv?')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'learn' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'learntv' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'learntv' }))
    expect(mockChooseAlternative).toHaveBeenCalledWith('learntv')
  })

  it('does not render ambiguity buttons when no pending alternatives exist', () => {
    mockUseStudentVoiceCopilot.mockReturnValue({
      isListening: false,
      lastTranscript: 'open notebook',
      lastMessage: 'Opening notebook.',
      pendingAlternatives: [],
      chooseAlternative: mockChooseAlternative,
      runVoiceCommand: mockRunVoiceCommand,
    })

    render(<DashboardLayout />)

    expect(screen.getByText('Opening notebook.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'learn' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'learntv' })).not.toBeInTheDocument()
  })
})
