import { http } from './client'
import type { Match, PlayerProfile } from '../types/api'

export function fetchPlayer(userId: string, signal?: AbortSignal): Promise<PlayerProfile> {
  return http.get<PlayerProfile>(`/players/${userId}`, {}, { signal })
}

export function fetchPlayerMatches(
  userId: string,
  limit = 20,
  signal?: AbortSignal,
): Promise<{ items: Match[] }> {
  return http.get<{ items: Match[] }>(`/players/${userId}/matches`, { limit }, { signal })
}
