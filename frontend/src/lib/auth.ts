const ACCESS_KEY = 'rosalina.accessToken'
const REFRESH_KEY = 'rosalina.refreshToken'
type UserRole = 'ADMIN' | 'OPERADOR'
let confirmedRole: { token: string; role: UserRole } | null = null

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
  confirmedRole = null;
  localStorage.setItem(ACCESS_KEY, accessToken)
  localStorage.setItem(REFRESH_KEY, refreshToken)
  window.dispatchEvent?.(new Event('rosalina:session'))
}

export function clearTokens() {
  confirmedRole = null;
  localStorage.removeItem(ACCESS_KEY)
  localStorage.removeItem(REFRESH_KEY)
  window.dispatchEvent?.(new Event('rosalina:session'))
}

export function tokenSubject(token: string | null): string | null {
  try {
    const payload = token?.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')
    if (!payload) return null
    const claims = JSON.parse(atob(payload.padEnd(Math.ceil(payload.length / 4) * 4, '=')))
    return claims.type === 'access' && typeof claims.sub === 'string' && claims.sub.trim() ? claims.sub : null
  } catch { return null }
}

export function getUserSubject(): string | null { return tokenSubject(getAccessToken()) }

// Serialize refresh/logout across tabs that share the same credentials.
export function withSessionLock<T>(operation: () => Promise<T>): Promise<T> {
  return navigator.locks ? navigator.locks.request('rosalina:session', operation) : operation()
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
    if (confirmedRole?.token === token) return confirmedRole.role
    return claims.role === 'ADMIN' || claims.role === 'OPERADOR' ? claims.role : null
  } catch {
    return null
  }
}

// Keep the confirmation through an auth guard redirect in the same page lifecycle.
let passwordChangedNotice = false
export function markPasswordChanged() { passwordChangedNotice = true }
export function hasPasswordChangedNotice() { return passwordChangedNotice }
export function clearPasswordChangedNotice() { passwordChangedNotice = false }


export function confirmUserRole(token: string, role: UserRole) {
  if (getAccessToken() !== token) return
  const previous = getUserRole()
  confirmedRole = { token, role }
  if (previous !== role) window.dispatchEvent?.(new Event('rosalina:profile'))
}
