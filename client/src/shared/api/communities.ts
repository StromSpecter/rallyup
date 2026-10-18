import { http } from './client'
import type { Community, CommunityDetail } from '../types/api'

export type { CommunityDetail }

export function listCommunities(signal?: AbortSignal): Promise<{ items: Community[] }> {
  return http.get<{ items: Community[] }>('/communities', {}, { signal })
}

export function getCommunity(slug: string, signal?: AbortSignal): Promise<CommunityDetail> {
  return http.get<CommunityDetail>(`/communities/${slug}`, {}, { signal })
}

export function createCommunity(input: {
  name: string
  city: string
  description: string
}): Promise<Community> {
  return http.post<Community>('/communities', input)
}

export function joinCommunity(slug: string): Promise<Community> {
  return http.post<Community>(`/communities/${slug}/join`)
}

export function updateCommunity(
  slug: string,
  input: { name: string; city: string; description: string },
): Promise<Community> {
  return http.patch<Community>(`/communities/${slug}`, input)
}
