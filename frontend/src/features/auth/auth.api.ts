import { apiRequest } from '../../lib/api'

type TokenResponse = {
  accessToken: string
  refreshToken: string
  tokenType: string
}

export function login(email: string, password: string) {
  return apiRequest<TokenResponse>('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  })
}