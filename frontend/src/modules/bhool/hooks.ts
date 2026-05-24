// ─── Bhool Hooks ──────────────────────────────────────────────
// Custom React hooks for Bhool Bazaar

import { useCallback } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState, AppDispatch } from '../../redux/store'
import {
  fetchMyCards,
  createCard,
  updateCard,
  deleteCard,
  fetchMarketplace,
  fetchTopCards,
  fetchCollections,
  collectCard,
  reactToCard,
  setFilters,
} from './slice'
import type { BhoolCardCreateRequest, BhoolCardUpdateRequest, MarketplaceFilters, ReactionEmoji } from './types'

/**
 * Hook for my mistake cards
 */
export const useMyCards = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { myCards, isLoading, error } = useSelector((state: RootState) => state.bhool)

  const fetch = useCallback(() => dispatch(fetchMyCards()), [dispatch])
  const create = useCallback((data: BhoolCardCreateRequest) => dispatch(createCard(data)), [dispatch])
  const update = useCallback(
    (cardId: string, data: BhoolCardUpdateRequest) => dispatch(updateCard({ cardId, data })),
    [dispatch]
  )
  const remove = useCallback((cardId: string) => dispatch(deleteCard(cardId)), [dispatch])

  return { myCards, isLoading, error, fetch, create, update, remove }
}

/**
 * Hook for marketplace
 */
export const useMarketplace = () => {
  const dispatch = useDispatch<AppDispatch>()
  const { marketplaceCards, topCards, filters, isLoading } = useSelector((state: RootState) => state.bhool)

  const fetch = useCallback(
    (newFilters?: MarketplaceFilters) => dispatch(fetchMarketplace(newFilters || filters)),
    [dispatch, filters]
  )

  const fetchTop = useCallback((subject?: string) => dispatch(fetchTopCards(subject)), [dispatch])

  const updateFilters = useCallback(
    (newFilters: MarketplaceFilters) => dispatch(setFilters(newFilters)),
    [dispatch]
  )

  const react = useCallback(
    (cardId: string, emoji: ReactionEmoji) => dispatch(reactToCard({ cardId, emoji })),
    [dispatch]
  )

  return { marketplaceCards, topCards, filters, isLoading, fetch, fetchTop, updateFilters, react }
}

/**
 * Hook for collections
 */
export const useCollections = () => {
  const dispatch = useDispatch<AppDispatch>()
  const collections = useSelector((state: RootState) => state.bhool.collections)

  const fetch = useCallback(() => dispatch(fetchCollections()), [dispatch])
  const collect = useCallback((cardId: string) => dispatch(collectCard(cardId)), [dispatch])

  return { collections, fetch, collect }
}
