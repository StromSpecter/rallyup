import { http } from './client'
import type { Event, Match, ScoreSubmission, SetScore } from '../types/api'

export type MatchDetail = {
  match: Match
  event: Event
  canManage: boolean
}

export function fetchMatch(matchId: string, signal?: AbortSignal): Promise<MatchDetail> {
  return http.get<MatchDetail>(`/matches/${matchId}`, {}, { signal })
}

export function submitScore(matchId: string, sets: SetScore[]): Promise<ScoreSubmission> {
  return http.post<ScoreSubmission>(`/matches/${matchId}/score`, { sets })
}

export function confirmScore(matchId: string, scoreId: string): Promise<ScoreSubmission> {
  return http.post<ScoreSubmission>(`/matches/${matchId}/score/${scoreId}/confirm`)
}

export function disputeScore(
  matchId: string,
  scoreId: string,
  reason: string,
): Promise<{ ok: boolean }> {
  return http.post<{ ok: boolean }>(`/matches/${matchId}/score/${scoreId}/dispute`, { reason })
}
