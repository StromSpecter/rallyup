import { http } from './client'
import type { Community, LeaderboardKind, LeaderboardRow, Sport } from '../types/api'

export type LeaderboardBoard = {
  community: Community
  sport: Sport
  kind: LeaderboardKind
  rows: LeaderboardRow[]
}

export function fetchLeaderboard(
  communitySlug: string,
  sport: Sport,
  kind: LeaderboardKind,
  signal?: AbortSignal,
): Promise<LeaderboardBoard> {
  return http.get<LeaderboardBoard>('/leaderboard', { communitySlug, sport, kind }, { signal })
}
