// src/test/__mocks__/api.js
// Vitest auto-mock for all Sathi API helpers used by SathiTab

export const apiGetMySquad           = vi.fn()
export const apiMatchSquad           = vi.fn()
export const apiGetSquadMessages     = vi.fn()
export const apiSendSquadMessage     = vi.fn()
export const apiGetSquadMembers      = vi.fn()
export const apiGetSquadChallenge    = vi.fn()
export const apiCreateChallenge      = vi.fn()
export const apiSubmitChallenge      = vi.fn()
export const apiLeaveSquad           = vi.fn()
// Doubts Board
export const apiGetSquadDoubts       = vi.fn()
export const apiPostDoubt            = vi.fn()
export const apiGetDoubtAnswers      = vi.fn()
export const apiPostAnswer           = vi.fn()
export const apiUpvoteAnswer         = vi.fn()
export const apiGetDoubtQuota        = vi.fn()
// Squad streak + Daily Concept
export const apiGetSquadStreak       = vi.fn()
export const apiGetDailyConcept      = vi.fn()
export const apiSubmitDailyExplain   = vi.fn()
export const apiPatchVerdict         = vi.fn()
// Drishti helper notes
export const apiGetHelperNotes       = vi.fn()
export const apiMarkHelperNotesRead  = vi.fn()
