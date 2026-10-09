import { clearTokens, getAccessToken } from './auth'

const API_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  // Rotas de login/refresh não devem enviar token antigo
  const isAuthRoute = path.startsWith('/api/v1/auth/')
  const token = isAuthRoute ? null : getAccessToken()

  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  })

  // Token expirado ou inválido: limpa e manda para o login
  if (response.status === 401 && token) {
    clearTokens()
    window.location.assign('/login')
  }

  if (!response.ok) {
    let message = 'Não foi possível concluir a solicitação.'
    try {
      const body = await response.json()
      if (typeof body?.message === 'string') message = body.message
    } catch {
      // resposta sem corpo: mantém a mensagem padrão
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return response.json() as Promise<T>
}