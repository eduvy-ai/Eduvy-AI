// ─── Bhool Module Types ───────────────────────────────────────
// Types for Bhool Bazaar - Mistake Marketplace

// ── Bhool Card ──
export interface BhoolCard {
  id: string
  user_id: string
  user_name: string
  subject: string
  standard: string
  mistake: string
  correction: string
  tip: string
  emoji?: string
  collect_count: number
  reactions: Record<string, number>
  created_at: string
}

export interface BhoolCardCreateRequest {
  subject: string
  standard: string
  mistake: string
  correction: string
  tip: string
  emoji?: string
}

export interface BhoolCardUpdateRequest {
  mistake?: string
  correction?: string
  tip?: string
  emoji?: string
}

// ── Marketplace Filters ──
export interface MarketplaceFilters {
  subject?: string
  standard?: string
  sort?: 'recent' | 'popular' | 'trending'
  offset?: number
  limit?: number
}

export interface MarketplaceResponse {
  cards: BhoolCard[]
  total: number
  has_more: boolean
}

// ── Collection ──
export interface BhoolCollection {
  id: string
  card_id: string
  card: BhoolCard
  collected_at: string
}

// ── Reactions ──
export type ReactionEmoji = '💡' | '🔥' | '👏' | '🙏' | '😮'

export interface ReactionRequest {
  emoji: ReactionEmoji
}

// ── State ──
export interface BhoolState {
  myCards: BhoolCard[]
  marketplaceCards: BhoolCard[]
  topCards: BhoolCard[]
  collections: BhoolCollection[]
  filters: MarketplaceFilters
  isLoading: boolean
  error: string | null
}
