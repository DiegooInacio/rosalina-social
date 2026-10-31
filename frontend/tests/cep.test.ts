import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { lookupCep } from '../src/lib/cep'

const fetchMock = vi.fn<typeof fetch>()
beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock) })
afterEach(() => vi.unstubAllGlobals())

describe('serviço de CEP', () => {
  it('rejeita formato inválido sem fazer requisição', async () => {
    for (const value of ['123', 'abc60744390', '00000-000']) {
      expect(await lookupCep(value)).toEqual({ status: 'not-found' })
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('consulta sem credenciais e reaproveita o resultado com ou sem máscara', async () => {
    fetchMock.mockResolvedValue(Response.json({ cep: '60744-390', logradouro: 'Rua Teste', bairro: 'Bairro Teste', localidade: 'Fortaleza', uf: 'CE' }))
    expect(await lookupCep('60744-390')).toEqual({ status: 'found', address: { street: 'Rua Teste', neighborhood: 'Bairro Teste', city: 'Fortaleza', state: 'CE' } })
    await lookupCep('60744390')
    expect(fetchMock).toHaveBeenCalledOnce()
    expect(fetchMock.mock.calls[0][0]).toBe('https://viacep.com.br/ws/60744390/json/')
    expect(fetchMock.mock.calls[0][1]?.headers).toBeUndefined()
  })

  it('distingue CEP inexistente de indisponibilidade', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ erro: true }))
    expect(await lookupCep('99999-999')).toEqual({ status: 'not-found' })
    fetchMock.mockRejectedValueOnce(new TypeError('Offline'))
    expect(await lookupCep('01001-000')).toEqual({ status: 'unavailable' })
    fetchMock.mockResolvedValueOnce(Response.json({ cep: '01001-000', localidade: 'São Paulo', uf: 'SP' }))
    expect((await lookupCep('01001-000')).status).toBe('found')
  })

  it('não trata respostas incompletas ou HTTP 500 como CEP inexistente', async () => {
    fetchMock.mockResolvedValueOnce(Response.json({ message: 'erro' }))
    expect(await lookupCep('60000-001')).toEqual({ status: 'unavailable' })
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 500 }))
    expect(await lookupCep('60000-002')).toEqual({ status: 'unavailable' })
  })
})
