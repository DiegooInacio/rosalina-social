import { clearTokens, getAccessToken, getRefreshToken, isAccessTokenExpired, setTokens, tokenSubject, withSessionLock } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number
  fields: Record<string, string>

  constructor(message: string, status: number, fields: Record<string, string> = {}) {
    super(message)
    this.status = status
    this.fields = fields
  }
}

let renewing: { token: string; request: Promise<string> } | null = null
let renewed: { before: string; after: string } | null = null
export const API_TIMEOUT_MS = 20000

async function request(path: string, init?: RequestInit) {
  const controller = new AbortController()
  let timedOut = false
  const timer = setTimeout(() => { timedOut = true; controller.abort() }, API_TIMEOUT_MS)
  const forwardAbort = () => controller.abort()
  init?.signal?.addEventListener('abort', forwardAbort)
  try {
    const aborted = new Promise<never>((_, reject) => controller.signal.addEventListener('abort', () => reject(
      new ApiError(timedOut ? 'O servidor demorou para responder. Seu preenchimento foi preservado. Tente novamente.' : 'A solicitação foi interrompida. Tente novamente.', timedOut ? 504 : 503),
    ), { once: true }))
    if (init?.signal?.aborted) controller.abort()
    return await Promise.race([aborted, (async () => {
      const response = await fetch(`${API_URL}${path}`, { ...init, signal: controller.signal })
      // Inclui a leitura do corpo no prazo; cabeçalhos rápidos não bastam.
      const body = await response.text()
      return new Response(body || null, { status: response.status, statusText: response.statusText, headers: response.headers })
    })()])
  } catch (error) {
    if (error instanceof ApiError) throw error
    throw new ApiError('Não foi possível conectar à API. Verifique se o servidor está disponível e tente novamente.', 503)
  } finally { clearTimeout(timer); init?.signal?.removeEventListener('abort', forwardAbort) }
}

function expireSession() {
  clearTokens()
  window.location.assign('/login')
  return new ApiError('Sua sessão expirou. Entre novamente para continuar. Seu preenchimento foi preservado nesta aba.', 401)
}

function renewAccessToken(token: string): Promise<string> {
  if (renewing?.token === token) return renewing.request
  if (renewed?.before === token && getAccessToken() === renewed.after) return Promise.resolve(renewed.after)
  if (getAccessToken() !== token) return Promise.reject(new ApiError('Sua sessão mudou. Recarregue a página antes de continuar.', 409))
  const operation = withSessionLock(async () => {
    const current = getAccessToken()
    if (current !== token) {
      if (current && tokenSubject(current) === tokenSubject(token)) return current
      throw new ApiError('Sua sessão mudou. Recarregue a página antes de continuar.', 409)
    }
    const refreshToken = getRefreshToken()
    if (!refreshToken) throw expireSession()
    const response = await request('/api/v1/auth/refresh', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ refreshToken }),
    })
    // Não sobrescreve outra conta nem restaura uma sessão encerrada enquanto o pedido estava em andamento.
    if (getAccessToken() !== token || getRefreshToken() !== refreshToken) {
      throw new ApiError('Sua sessão mudou. Recarregue a página antes de continuar.', 409)
    }
    if (response.status === 401 || response.status === 403) throw expireSession()
    if (!response.ok) throw new ApiError('Não foi possível renovar sua sessão agora. Tente novamente em instantes.', 503)
    let data
    try { data = await response.json() }
    catch { throw new ApiError('Não foi possível validar a resposta de renovação da sessão. Tente novamente.', 502) }
    if (typeof data?.accessToken !== 'string' || !data.accessToken || typeof data?.refreshToken !== 'string' || !data.refreshToken) {
      throw new ApiError('Não foi possível validar a resposta de renovação da sessão. Tente novamente.', 502)
    }
    setTokens(data.accessToken, data.refreshToken)
    renewed = { before: token, after: data.accessToken }
    return data.accessToken
  })
  renewing = { token, request: operation }
  void operation.finally(() => { if (renewing?.request === operation) renewing = null }).catch(() => {})
  return operation
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  // Rotas de login/refresh não devem enviar token antigo
  const isAuthRoute = path.startsWith('/api/v1/auth/')
  let token = isAuthRoute ? null : getAccessToken()
  if (token && isAccessTokenExpired(token)) token = await renewAccessToken(token)
  const send = () => request(path, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })
  let response = await send()
  if (token && (response.status === 401 || (response.status === 403 && isAccessTokenExpired(token)))) {
    token = await renewAccessToken(token)
    response = await send()
    if (response.status === 401) throw expireSession()
  }

  if (!response.ok) {
    let message = response.status === 403 ? 'Sua conta não tem permissão para esta ação.'
      : response.status >= 500 ? 'A API está indisponível no momento. Tente novamente em instantes.'
      : 'Não foi possível concluir a solicitação.'
    const fields: Record<string, string> = {}
    try {
      const body = await response.json()
      if (typeof body?.message === 'string') message = body.message
      if (body?.fields && typeof body.fields === 'object') {
        for (const [field, value] of Object.entries(body.fields)) {
          if (typeof value === 'string') fields[field] = value
        }
      }
    } catch {
      // resposta sem corpo: mantém a mensagem padrão
    }
    throw new ApiError(message, response.status, fields)
  }

  if (response.status === 204) {
    return undefined as T
  }

  try { return await response.json() as T }
  catch { throw new ApiError('A API retornou uma resposta inválida. Verifique a configuração do servidor e tente novamente.', 502) }
}
