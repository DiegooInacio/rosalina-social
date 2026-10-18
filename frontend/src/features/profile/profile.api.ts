import { apiRequest } from '../../lib/api'

export type UserProfile = {
  id: string
  name: string
  email: string
  role: 'ADMIN' | 'OPERADOR'
}

// Contrato previsto para o backend; veja a seção Meu perfil no README.
export const getProfile = (signal?: AbortSignal) => apiRequest<UserProfile>('/api/v1/me', { signal })
export const updateProfile = (name: string) => apiRequest<UserProfile>('/api/v1/me', {
  method: 'PATCH', body: JSON.stringify({ name }),
})
export const changePassword = (values: { currentPassword: string; newPassword: string }) => apiRequest<void>('/api/v1/me/password', {
  method: 'PUT', body: JSON.stringify(values),
})
