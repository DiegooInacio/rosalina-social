import { onlyDigits } from './masks'
import { isValidCep } from './validators'

export type CepAddress = { street: string; neighborhood: string; city: string; state: string }
export type CepResult = { status: 'found'; address: CepAddress } | { status: 'not-found' | 'unavailable' }
const cache = new Map<string, { expires: number; request: Promise<CepResult> }>()

export async function lookupCep(value: string): Promise<CepResult> {
  if (!isValidCep(value)) return { status: 'not-found' }
  const digits = onlyDigits(value)
  const saved = cache.get(digits)
  if (saved && saved.expires > Date.now()) return saved.request
  const request = (async (): Promise<CepResult> => {
    try {
      const response = await fetch(`https://viacep.com.br/ws/${digits}/json/`, {
        signal: AbortSignal.timeout(8000), referrerPolicy: 'no-referrer', credentials: 'omit',
      })
      if (!response.ok) return { status: 'unavailable' }
      const data = await response.json()
      if (data?.erro === true || data?.erro === 'true') return { status: 'not-found' }
      if (typeof data?.cep !== 'string' || onlyDigits(data.cep) !== digits
        || typeof data.localidade !== 'string' || !data.localidade || typeof data.uf !== 'string' || !/^[A-Z]{2}$/.test(data.uf)) {
        return { status: 'unavailable' }
      }
      return { status: 'found', address: {
        street: typeof data.logradouro === 'string' ? data.logradouro : '',
        neighborhood: typeof data.bairro === 'string' ? data.bairro : '', city: data.localidade, state: data.uf,
      } }
    } catch { return { status: 'unavailable' } }
  })()
  cache.set(digits, { request, expires: Date.now() + 10 * 60 * 1000 })
  const result = await request
  if (result.status === 'unavailable') cache.delete(digits)
  return result
}
