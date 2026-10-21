import { http } from './client'
import type { BenchPlayer, Event, EventStanding, Match, Registration, Sport } from '../types/api'

export type EventDetail = {
  event: Event
  registrations: Registration[]
  matches: Match[]
  standings: EventStanding[]
  bench: BenchPlayer[]
  myStatus?: Registration['status']
  myRole?: 'owner' | 'moderator' | 'member'
  canManage: boolean
}

export type EventFilter = {
  communitySlug?: string
  sport?: Sport | ''
  status?: string
  q?: string
  from?: string
  to?: string
  scope?: 'joined' | 'mine'
  limit?: number
  offset?: number
}

export type EventPayload = {
  communityId: string
  title: string
  sport: Sport
  format: 'doubles' | 'singles'
  venue: string
  city: string
  startsAt: string
  endsAt: string
  capacity: number
  fee: number
  levelMin: number
  levelMax: number
  notes: string
  status: string
}

export function listEvents(
  filter: EventFilter = {},
  signal?: AbortSignal,
): Promise<{ items: Event[]; total: number }> {
  return http.get<{ items: Event[]; total: number }>('/events', { ...filter }, { signal })
}

export function getEvent(eventId: string, signal?: AbortSignal): Promise<EventDetail> {
  return http.get<EventDetail>(`/events/${eventId}`, {}, { signal })
}

export function eventMatches(eventId: string, signal?: AbortSignal): Promise<{ items: Match[] }> {
  return http.get<{ items: Match[] }>(`/events/${eventId}/matches`, {}, { signal })
}

export function createEvent(payload: EventPayload): Promise<Event> {
  return http.post<Event>('/events', payload)
}

export function updateEvent(eventId: string, payload: EventPayload): Promise<Event> {
  return http.patch<Event>(`/events/${eventId}`, payload)
}

export function joinEvent(eventId: string): Promise<Registration> {
  return http.post<Registration>(`/events/${eventId}/join`)
}

export function leaveEvent(eventId: string): Promise<{ ok: boolean }> {
  return http.post<{ ok: boolean }>(`/events/${eventId}/leave`)
}

export function checkIn(eventId: string, userId: string, checkedIn: boolean): Promise<{ ok: boolean }> {
  return http.post<{ ok: boolean }>(`/events/${eventId}/registrations/${userId}/check-in`, {
    checkedIn,
  })
}

export function generatePairings(
  eventId: string,
  courts: number,
  append = false,
): Promise<{ items: Match[] }> {
  return http.post<{ items: Match[] }>(`/events/${eventId}/pairings`, { courts, append })
}

export function substitutePlayer(
  matchId: string,
  outUserId: string,
  inUserId: string,
): Promise<Match> {
  return http.post<Match>(`/matches/${matchId}/substitute`, { outUserId, inUserId })
}

export function closeEvent(eventId: string): Promise<Event> {
  return http.post<Event>(`/events/${eventId}/close`)
}

export function checkInAll(eventId: string): Promise<{ ok: boolean }> {
  return http.post<{ ok: boolean }>(`/events/${eventId}/check-in-all`)
}

export function cancelRegistration(eventId: string, userId: string): Promise<{ ok: boolean }> {
  return http.post<{ ok: boolean }>(`/events/${eventId}/registrations/${userId}/cancel`)
}
