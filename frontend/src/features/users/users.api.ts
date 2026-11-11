import { apiRequest } from '../../lib/api'

export type UserRole = 'ADMIN' | 'OPERADOR'
export type ManagedUser = { id: string; name: string; email: string; role: UserRole; active: boolean }
export type NewUser = { name: string; email: string; role: UserRole; password: string }
const path = '/api/v1/users'
export const listUsers = (signal?: AbortSignal) => apiRequest<ManagedUser[]>(path, { signal })
export const createUser = (data: NewUser) => apiRequest<ManagedUser>(path, { method: 'POST', body: JSON.stringify(data) })
export const updateUser = (id: string, data: Pick<ManagedUser, 'name' | 'role'>) => apiRequest<ManagedUser>(`${path}/${id}`, { method: 'PUT', body: JSON.stringify(data) })
export const setUserStatus = (id: string, active: boolean) => apiRequest<ManagedUser>(`${path}/${id}`, { method: 'PATCH', body: JSON.stringify({ active }) })
export const resetUserPassword = (id: string, newPassword: string) => apiRequest<void>(`${path}/${id}/password`, { method: 'PUT', body: JSON.stringify({ newPassword }) })
