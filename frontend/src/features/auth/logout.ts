import { apiRequest, ApiError } from '../../lib/api'
import { clearTokens, getAccessToken, getRefreshToken, withSessionLock } from '../../lib/auth'

export function logout() {
  return withSessionLock(async () => {
    const refreshToken = getRefreshToken()
    const accessToken = getAccessToken()
    if (refreshToken || accessToken) {
      try { await apiRequest<void>('/api/v1/auth/logout', { method: 'POST', headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined, body: JSON.stringify({ refreshToken: refreshToken ?? 'unavailable' }) }) }
      catch (error) {
        // An invalid/revoked token already has no usable session on the server.
        if (!(error instanceof ApiError && error.status === 401)) throw error
      }
    }
    if (getRefreshToken() !== refreshToken) throw new Error('Sua sessão mudou. Confira a conta atual antes de sair.')
    clearTokens()
  })
}
