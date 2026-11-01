const ACCESS_KEY = 'rosalina.accessToken'
const REFRESH_KEY = 'rosalina.refreshToken'

export function getAccessToken() {
  return localStorage.getItem(ACCESS_KEY)
}

export function getRefreshToken() {
  return localStorage.getItem(REFRESH_KEY)
}

export function isAccessTokenExpired(token: string) {
  try {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    return claims.type !== 'access' || typeof claims.exp !== 'number' || claims.exp * 1000 <= Date.now() + 5000
  } catch { return true }
}

export function setTokens(accessToken: string, refreshToken: string) {
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  window.dispatchEvent?.(new Event('rosalina:session'))
}

export function clearTokens() {
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  window.dispatchEvent?.(new Event('rosalina:session'))
}

export function getUserSubject(): string | null {
  try {
    const payload = getAccessToken()?.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    if (!payload) return null
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    return claims.type === 'access' && typeof claims.sub === 'string' && claims.sub.trim() ? claims.sub : null
  } catch { return null }
}

// Esta informação controla a interface; a API continua validando as permissões.
export function getUserRole(): 'ADMIN' | 'OPERADOR' | null {
  try {
    const token = getAccessToken()
    if (!token) return null
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    // Um acesso vencido com refresh disponível ainda pode renovar a sessão.
    // A autorização efetiva continua sendo feita pela API em cada pedido.
    if (claims.type !== 'access' || typeof claims.exp !== 'number' || (claims.exp * 1000 <= Date.now() && !getRefreshToken())) return null
    return claims.role === 'ADMIN' || claims.role === 'OPERADOR' ? claims.role : null
  } catch {
    return null
  }
}
