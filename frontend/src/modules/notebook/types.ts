// ─── Notebook Module Types ────────────────────────────────────
// Types for NotebookLM clone: sources, chat, studio

// ── Source ──
export type SourceType = 'pdf' | 'youtube' | 'link' | 'text' | 'image'

export interface Source {
  id: string
  name: string
  type: SourceType
  content: string
  icon: string
  added_at: number
}

export interface SourceCreateRequest {
  id: string
  name: string
  type: SourceType
  content: string
  icon: string
  added_at?: number
}

// ── Chat ──
export type ChatRole = 'user' | 'assistant' | 'system'

export interface ChatMessage {
  role: ChatRole
  content: string
}

export interface ChatMessageRequest {
  role: ChatRole
  content: string
}

// ── Studio Output ──
export type StudioOutputType = 'summary' | 'flashcards' | 'quiz' | 'faq' | 'timeline' | 'mindmap'

export interface StudioOutput {
  id: string
  type: StudioOutputType
  output_json: string
  created_at: string
}

export interface StudioOutputRequest {
  type: StudioOutputType
  output_json: string
}

// ── Notebook State ──
export interface NotebookState {
  sources: Source[]
  chatHistory: ChatMessage[]
  studioOutputs: StudioOutput[]
  isLoading: boolean
  error: string | null
}
