import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { apiRequest } from '../src/lib/api'
import { getAccessToken, getRefreshToken, setTokens } from '../src/lib/auth'

const fetchMock = vi.fn<typeof fetch>()
const redirect = vi.fn()
let sequence = 0
function token(expired = false) {
  return `header.${btoa(JSON.stringify({ sub: 'pessoa@test.local', type: 'access', exp: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600), jti: sequence++ }))}.signature`
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); fetchMock.mockReset(); redirect.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  vi.stubGlobal('window', { location: { assign: redirect } })
})
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear() })

it('renova uma única vez para pedidos simultâneos e preserva o corpo e o rascunho', async () => {
  const expired = token(true), current = token()
  setTokens(expired, 'refresh-original')
  sessionStorage.setItem('rascunho', 'dados preservados')
  fetchMock.mockImplementation(async (url) => String(url).endsWith('/auth/refresh')
    ? Response.json({ accessToken: current, refreshToken: 'refresh-novo' })
    : Response.json({ ok: true }))
  await Promise.all([apiRequest('/api/v1/catalogs'), apiRequest('/api/v1/form-drafts', { method: 'POST', body: '{"data":{"name":"Maria"}}' })])
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1)
  const calls = fetchMock.mock.calls.filter(([url]) => !String(url).endsWith('/auth/refresh'))
  expect(calls).toHaveLength(2)
  expect(calls.every(([, init]) => new Headers(init?.headers).get('Authorization') === `Bearer ${current}`)).toBe(true)
  expect(calls.find(([, init]) => init?.method === 'POST')?.[1]?.body).toBe('{"data":{"name":"Maria"}}')
  expect(getRefreshToken()).toBe('refresh-novo')
  expect(sessionStorage.getItem('rascunho')).toBe('dados preservados')
  expect(redirect).not.toHaveBeenCalled()
})

it('envia para login se a renovação expirou, preservando os dados da aba', async () => {
  setTokens(token(true), 'refresh-expirado')
  sessionStorage.setItem('rascunho', 'dados preservados')
  fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
  await expect(apiRequest('/api/v1/catalogs')).rejects.toMatchObject({ status: 401, message: expect.stringContaining('Sua sessão expirou') })
  expect(redirect).toHaveBeenCalledWith('/login')
  expect(getAccessToken()).toBeNull()
  expect(sessionStorage.getItem('rascunho')).toBe('dados preservados')
})

it('não encerra a sessão por falha temporária de renovação e permite tentar novamente', async () => {
  const expired = token(true)
  setTokens(expired, 'refresh')
  fetchMock.mockRejectedValueOnce(new TypeError('Offline'))
  await expect(apiRequest('/api/v1/catalogs')).rejects.toMatchObject({ status: 503 })
  expect(getAccessToken()).toBe(expired)
  expect(redirect).not.toHaveBeenCalled()
  fetchMock.mockResolvedValueOnce(Response.json({ accessToken: token(), refreshToken: 'refresh-novo' }))
    .mockResolvedValueOnce(Response.json([]))
  expect(await apiRequest('/api/v1/catalogs')).toEqual([])
})

it('distingue falta de permissão de sessão expirada', async () => {
  setTokens(token(), 'refresh')
  fetchMock.mockResolvedValue(new Response(null, { status: 403 }))
  await expect(apiRequest('/api/v1/users')).rejects.toMatchObject({ status: 403, message: 'Sua conta não tem permissão para esta ação.' })
  expect(fetchMock).toHaveBeenCalledOnce()
  expect(redirect).not.toHaveBeenCalled()
})

it('repete 401 somente uma vez após renovar a sessão', async () => {
  setTokens(token(), 'refresh')
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 401 }))
    .mockResolvedValueOnce(Response.json({ accessToken: token(), refreshToken: 'refresh-novo' }))
    .mockResolvedValueOnce(new Response(null, { status: 401 }))
  await expect(apiRequest('/api/v1/catalogs')).rejects.toMatchObject({ status: 401 })
  expect(fetchMock).toHaveBeenCalledTimes(3)
  expect(redirect).toHaveBeenCalledOnce()
})

it('não restaura a sessão após logout durante uma renovação', async () => {
  setTokens(token(true), 'refresh')
  let release!: (response: Response) => void
  fetchMock.mockImplementationOnce(() => new Promise((resolve) => { release = resolve }))
  const pending = apiRequest('/api/v1/form-drafts', { method: 'POST', body: '{}' })
  localStorage.clear()
  release(Response.json({ accessToken: token(), refreshToken: 'refresh-novo' }))
  await expect(pending).rejects.toMatchObject({ status: 409 })
  expect(getAccessToken()).toBeNull()
  expect(fetchMock).toHaveBeenCalledOnce()
})

it('limita o tempo de espera sem repetir gravações automaticamente', async () => {
  vi.useFakeTimers()
  try {
    setTokens(token(), 'refresh')
    fetchMock.mockImplementation(() => new Promise(() => {}))
    const result = expect(apiRequest('/api/v1/form-drafts', { method: 'POST', body: '{}' })).rejects.toMatchObject({ status: 504 })
    await vi.advanceTimersByTimeAsync(20001)
    await result
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(redirect).not.toHaveBeenCalled()
  } finally { vi.useRealTimers() }
})

it('o prazo também inclui a leitura do corpo da resposta', async () => {
  vi.useFakeTimers()
  try {
    setTokens(token(), 'refresh')
    fetchMock.mockResolvedValue(new Response(new ReadableStream({ start() {} })))
    const result = expect(apiRequest('/api/v1/catalogs')).rejects.toMatchObject({ status: 504 })
    await vi.advanceTimersByTimeAsync(20001)
    await result
  } finally { vi.useRealTimers() }
})


it('reaproveita renovação feita por outra aba enquanto aguarda o bloqueio', async () => {
  const expired = token(true), current = token()
  setTokens(expired, 'refresh-antigo')
  const lock = vi.fn(async (_name: string, operation: () => Promise<unknown>) => {
    setTokens(current, 'refresh-rotacionado-em-outra-aba')
    return operation()
  })
  vi.stubGlobal('navigator', { locks: { request: lock } })
  fetchMock.mockResolvedValue(Response.json({ ok: true }))
  expect(await apiRequest('/api/v1/catalogs')).toEqual({ ok: true })
  expect(fetchMock).toHaveBeenCalledOnce()
  expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toBe(`Bearer ${current}`)
  expect(getRefreshToken()).toBe('refresh-rotacionado-em-outra-aba')
  expect(lock).toHaveBeenCalledOnce()
})
