// ─── Shared Components Index ──────────────────────────────────
// Re-export all shared components

export { default as Button } from './Button'
export type { ButtonVariant, ButtonSize } from './Button'

export { default as Input } from './Input'

export { default as Select } from './Select'

export { default as Loader } from './Loader'
export type { LoaderSize } from './Loader'

export { default as Modal } from './Modal'

export { default as Table } from './Table'
export type { TableColumn } from './Table'

export { default as Pagination } from './Pagination'

// ── Design System UI Components ──
export {
  Avatar,
  Badge,
  BottomSheet,
  Card,
  Chip,
  Divider,
  EmptyState,
  FloatingActionButton,
  IconButton,
  ProgressBar,
  SearchInput,
  Skeleton,
  Toast,
  useToast,
} from './ui'

export type {
  AvatarProps,
  BadgeProps,
  BottomSheetProps,
  CardProps,
  ChipProps,
  EmptyStateProps,
  IconButtonProps,
  ProgressBarProps,
  SearchInputProps,
  SkeletonProps,
  ToastProps,
} from './ui'
