import { http } from './client'
import type { AuthResponse, User } from '../types/api'

export function login(email: string, password: string): Promise<AuthResponse> {
  return http.post<AuthResponse>('/auth/login', { email, password })
}

export function register(name: string, email: string, password: string): Promise<AuthResponse> {
  return http.post<AuthResponse>('/auth/register', { name, email, password })
}

export function logout(): Promise<{ ok: boolean }> {
  return http.post<{ ok: boolean }>('/auth/logout')
}

export function fetchMe(signal?: AbortSignal): Promise<User> {
  return http.get<User>('/me', {}, { signal })
}

/** Kosongkan salah satu argumen kalau tidak ingin diubah. */
export function updateMe(input: { name: string; avatarColor: string }): Promise<User> {
  return http.patch<User>('/me', input)
}
