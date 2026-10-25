// Earnable badges. One award per (badge, action); accessories are derived from awards,
// so correcting the underlying action reverses them automatically. No points economy.

export type Badge = 'explorer' | 'connection' | 'follow-through';

export interface Award {
  id: string;
  badge: Badge;
  actionId: string;
  label: string;
}

export interface RewardState {
  awards: Award[];
}

export const BADGE_TEXT: Record<Badge, string> = {
  explorer: 'Explorer',
  connection: 'Connection',
  'follow-through': 'Follow-through',
};

export const ACCESSORY = { id: 'star-scarf', name: 'Star scarf', unlockedBy: 'First Connection' } as const;

export const emptyRewards = (): RewardState => ({ awards: [] });

export function award(state: RewardState, badge: Badge, actionId: string, label: string): RewardState {
  const id = `${badge}:${actionId}`;
  if (state.awards.some((a) => a.id === id)) return state;
  return { awards: [...state.awards, { id, badge, actionId, label }] };
}

/** Remove awards for an action and for actions that depend on it (e.g. its follow-up). */
export function revokeAction(state: RewardState, actionId: string): RewardState {
  return { awards: state.awards.filter((a) => a.actionId !== actionId && !a.actionId.endsWith(`:${actionId}`)) };
}

export function unlockedAccessories(state: RewardState): string[] {
  return state.awards.some((a) => a.badge === 'connection') ? [ACCESSORY.id] : [];
}
