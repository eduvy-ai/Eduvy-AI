// ─── Subscription Plans ───────────────────────────────────────
// Defines what each plan tier can access

export type PlanType = 'free' | 'basic' | 'pro' | 'premium'
export type TabKey = 'home' | 'tutor' | 'videos' | 'notebook' | 'learntv' | 'labs' | 'discover' | 'sathi' | 'bhool' | 'muqabla' | 'videocreator'
export type LabKey = 'quiz' | 'examiner' | 'samjhao' | 'podcast' | 'essay' | 'mental'

export interface Plan {
  label: string
  icon: string
  color: string
  tabs: TabKey[]
  labs: LabKey[]
  aiCallsPerDay: number
}

export const PLANS: Record<PlanType, Plan> = {
  free: {
    label: 'Free',
    icon: '🆓',
    color: '#6868a0',
    tabs: ['home', 'tutor', 'bhool', 'muqabla'],
    labs: [],
    aiCallsPerDay: 10,
  },
  basic: {
    label: 'Basic',
    icon: '⭐',
    color: '#FFD166',
    tabs: ['home', 'tutor', 'videos', 'notebook', 'videocreator', 'bhool', 'muqabla'],
    labs: [],
    aiCallsPerDay: 50,
  },
  pro: {
    label: 'Pro',
    icon: '🚀',
    color: '#7B9CFF',
    tabs: ['home', 'tutor', 'videos', 'notebook', 'learntv', 'labs', 'videocreator', 'sathi', 'bhool', 'muqabla'],
    labs: ['quiz', 'examiner', 'samjhao'],
    aiCallsPerDay: 200,
  },
  premium: {
    label: 'Premium',
    icon: '👑',
    color: '#00E5A0',
    tabs: ['home', 'tutor', 'videos', 'notebook', 'learntv', 'labs', 'discover', 'videocreator', 'sathi', 'bhool', 'muqabla'],
    labs: ['quiz', 'examiner', 'samjhao', 'podcast', 'essay', 'mental'],
    aiCallsPerDay: Infinity,
  },
}

/** Returns true if the given plan has access to the tab key */
export function planHasTab(plan: PlanType, tabKey: TabKey): boolean {
  return (PLANS[plan] || PLANS.free).tabs.includes(tabKey)
}

/** Returns true if the given plan has access to the lab key */
export function planHasLab(plan: PlanType, labKey: LabKey): boolean {
  return (PLANS[plan] || PLANS.free).labs.includes(labKey)
}
