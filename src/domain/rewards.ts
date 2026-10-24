// Passport stamps. One award per (stamp, action); accessories are derived from awards,
// so correcting the underlying action reverses them automatically. No points economy.

export type Stamp = 'explorer' | 'connection' | 'follow-through';

export interface Award {
  id: string;
  stamp: Stamp;
  actionId: string;
  label: string;
}

export interface RewardState {
  awards: Award[];
}

export const STAMP_TEXT: Record<Stamp, string> = {
  explorer: 'Explorer',
  connection: 'Connection',
  'follow-through': 'Follow-through',
};

export const ACCESSORY = { id: 'star-scarf', name: 'Star scarf', unlockedBy: 'First Connection' } as const;

export const emptyRewards = (): RewardState => ({ awards: [] });

export function award(state: RewardState, stamp: Stamp, actionId: string, label: string): RewardState {
  const id = `${stamp}:${actionId}`;
  if (state.awards.some((a) => a.id === id)) return state;
  return { awards: [...state.awards, { id, stamp, actionId, label }] };
}

/** Remove awards for an action and for actions that depend on it (e.g. its follow-up). */
export function revokeAction(state: RewardState, actionId: string): RewardState {
  return { awards: state.awards.filter((a) => a.actionId !== actionId && !a.actionId.endsWith(`:${actionId}`)) };
}

export function unlockedAccessories(state: RewardState): string[] {
  return state.awards.some((a) => a.stamp === 'connection') ? [ACCESSORY.id] : [];
}
