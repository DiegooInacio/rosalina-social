import { act, fireEvent, render, screen, within } from '@testing-library/react'
import { FormProvider, useForm } from 'react-hook-form'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { clearTokens, getAccessToken, setTokens } from '../src/lib/auth'
import { localFormDataRevision, observeLocalFormDataReset } from '../src/lib/local-form-data'
import { logout } from '../src/features/auth/logout'
import { useEditBackup } from '../src/features/records/edit-session'
import { AuthorizationsSection } from '../src/features/population-survey/sections/AuthorizationsSection'
import { populationDefaultValues, type PopulationFormData } from '../src/features/population-survey/population.schema'

const fetchMock = vi.fn<typeof fetch>()
function signIn() {
  setTokens(`header.${btoa(JSON.stringify({ type: 'access', sub: 'operador@test.local', exp: Date.now() / 1000 + 3600 }))}.signature`, 'refresh')
}
const draftKey = 'rosalina.pendingDraft.operador.STUDENT'
const editKey = 'rosalina.recordEdit.operador.students.record'
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); fetchMock.mockReset()
  vi.stubGlobal('fetch', fetchMock)
  signIn()
  sessionStorage.setItem(draftKey, 'dados de família')
  sessionStorage.setItem(editKey, 'dados de saúde')
  sessionStorage.setItem('outra-aplicacao', 'preservar')
  localStorage.setItem('rosalina.theme', 'dark')
})
afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear() })

it('remove cópias locais ao sair após revogar a sessão, preservando preferências', async () => {
  fetchMock.mockResolvedValue(new Response(null, { status: 204 }))
  const previous = localFormDataRevision()
  await logout()
  expect(getAccessToken()).toBeNull()
  expect(sessionStorage.getItem(draftKey)).toBeNull()
  expect(sessionStorage.getItem(editKey)).toBeNull()
  expect(sessionStorage.getItem('outra-aplicacao')).toBe('preservar')
  expect(localStorage.getItem('rosalina.theme')).toBe('dark')
  expect(localFormDataRevision()).not.toBe(previous)
  expect(fetchMock.mock.calls[0][0]).toContain('/auth/logout')
})

it('mantém a sessão e o preenchimento quando a saída falha por indisponibilidade', async () => {
  fetchMock.mockRejectedValue(new TypeError('offline'))
  await expect(logout()).rejects.toMatchObject({ status: 503 })
  expect(getAccessToken()).not.toBeNull()
  expect(sessionStorage.getItem(draftKey)).toBe('dados de família')
})

it('limpa cópias ao sair de uma sessão já revogada, e preserva recuperação na expiração involuntária', async () => {
  clearTokens()
  expect(sessionStorage.getItem(draftKey)).toBe('dados de família')
  signIn()
  fetchMock.mockResolvedValue(new Response(null, { status: 401 }))
  await logout()
  expect(sessionStorage.getItem(draftKey)).toBeNull()
})

it('propaga a limpeza para outra aba e ignora eventos de outros aplicativos', () => {
  const dispose = observeLocalFormDataReset()
  try {
    window.dispatchEvent(new StorageEvent('storage', { key: 'outro', storageArea: localStorage }))
    expect(sessionStorage.getItem(draftKey)).not.toBeNull()
    const previous = localFormDataRevision()
    window.dispatchEvent(new StorageEvent('storage', { key: 'rosalina.localFormDataReset', storageArea: localStorage, newValue: 'saida-em-outra-aba' }))
    expect(sessionStorage.getItem(draftKey)).toBeNull()
    expect(sessionStorage.getItem(editKey)).toBeNull()
    expect(localFormDataRevision()).not.toBe(previous)
  } finally { dispose() }
})

it('uma edição antiga não recria cópias depois da saída, mesmo com novo login', () => {
  sessionStorage.removeItem(editKey)
  function Editor() {
    const methods = useForm({ defaultValues: { name: 'Inicial' } })
    useEditBackup(methods, { storageKey: editKey, initialValues: { name: 'Inicial' }, originalValues: { name: 'Inicial' }, hasBackup: false, save: vi.fn(), cancel: vi.fn() })
    return <input aria-label="Nome" {...methods.register('name')} />
  }
  render(<Editor />)
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Alteração' } })
  expect(sessionStorage.getItem(editKey)).toContain('Alteração')
  act(() => { clearTokens(true); signIn() })
  fireEvent.change(screen.getByLabelText('Nome'), { target: { value: 'Resposta atrasada' } })
  expect(sessionStorage.getItem(editKey)).toBeNull()
})

it('avisa sobre recusa e ausência de resposta sem vincular imagem/som ao tratamento', () => {
  function Authorizations() {
    const methods = useForm<PopulationFormData>({ defaultValues: populationDefaultValues() })
    return <FormProvider {...methods}><AuthorizationsSection /></FormProvider>
  }
  render(<Authorizations />)
  expect(screen.getByRole('note').textContent).toContain('Não há autorização informada')
  const data = within(screen.getByRole('group', { name: 'Tratamento de dados pessoais' }))
  const image = within(screen.getByRole('group', { name: 'Uso de imagem e som' }))
  fireEvent.click(image.getByRole('radio', { name: 'Autorizo' }))
  fireEvent.click(data.getByRole('radio', { name: 'Não autorizo' }))
  expect(screen.getByRole('note').textContent).toContain('A recusa está registrada')
  expect(screen.getByRole('note').textContent).toContain('O salvamento e os rascunhos continuam ativos')
  expect(image.getByRole('radio', { name: 'Autorizo', checked: true })).toBeTruthy()
  fireEvent.click(data.getByRole('radio', { name: 'Autorizo' }))
  expect(screen.queryByRole('note')).toBeNull()
})
