import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentRegistrationForm } from '../src/features/student-registration/StudentRegistrationForm'
import { PopulationSurveyForm } from '../src/features/population-survey/PopulationSurveyForm'
import { draftStorageKey, readPending } from '../src/features/drafts/draft-storage'
import type { FormDraft, FormType } from '../src/features/drafts/drafts.api'
import { setTokens } from '../src/lib/auth'

const activityId = '00000000-0000-4000-8000-000000000001'
vi.mock('../src/features/catalogs/useCatalog', () => ({
  useCatalog: () => ({ items: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Capoeira' }], isLoading: false, hasError: false, reload: vi.fn() }),
}))
const fetchMock = vi.fn<typeof fetch>()
let drafts: Map<string, FormDraft>
let dropCompletion: boolean
let failSave: boolean
let failDelete: boolean
let updateGate: Promise<void> | undefined
let recordCount: number
let lastSubmission: Record<string, unknown>
let rejectCompletion: boolean
let dropDeleteResponse: boolean

function signIn(user = 'operador@test.local') {
  const claims = btoa(JSON.stringify({ sub: user, role: 'OPERADOR', type: 'access', exp: Math.floor(Date.now() / 1000) + 3600 }))
  setTokens(`header.${claims}.signature`, 'refresh')
}
function show(type: FormType) {
  return render(<MemoryRouter initialEntries={['/form']}><Routes>
    <Route path="/form" element={type === 'STUDENT' ? <StudentRegistrationForm /> : <PopulationSurveyForm />} />
    <Route path="/app" element={<p>Painel de cadastros</p>} />
  </Routes></MemoryRouter>)
}
function change(label: string, value: string) { fireEvent.change(screen.getByLabelText(label), { target: { value } }) }
async function ready() {
  await waitFor(() => expect(screen.getByLabelText('Nome (obrigatório)').matches(':disabled')).toBe(false))
}
async function saveNow() {
  await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho agora' }))
  await screen.findByText(/Rascunho salvo às/)
}
function calls(method: string) { return fetchMock.mock.calls.filter(([, init]) => init?.method === method) }
function valid(type: FormType) {
  change('Nome (obrigatório)', 'Maria')
  if (type === 'STUDENT') {
    change('Atividade matriculada (obrigatória)', activityId)
    change('Data de nascimento (obrigatória)', '20/05/2015')
    change('Telefone do responsável (obrigatório)', '85999999999')
    change('Nome do responsável (obrigatório)', 'Responsável Maria')
  }
}

beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); signIn()
  drafts = new Map(); dropCompletion = false; failSave = false; failDelete = false
  updateGate = undefined; recordCount = 0; lastSubmission = {}; rejectCompletion = false; dropDeleteResponse = false
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input), 'http://localhost')
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    const method = init?.method ?? 'GET'
    const suffix = url.pathname.replace('/api/v1/form-drafts', '')
    if (method === 'GET' && !suffix) return Response.json({ content: [...drafts.values()].filter((draft) => draft.status === 'DRAFT' && draft.formType === url.searchParams.get('formType')) })
    if (method === 'POST' && !suffix) {
      if (failSave) throw new TypeError('Offline')
      const id = `draft-${drafts.size + 1}`
      const draft: FormDraft = { id, ...body, status: 'DRAFT', version: 0, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }
      drafts.set(id, structuredClone(draft))
      return Response.json(draft, { status: 201 })
    }
    const id = suffix.split('/')[1]
    const draft = drafts.get(id)
    if (!draft) return Response.json({ message: 'Rascunho não encontrado.' }, { status: 404 })
    if (method === 'GET') return Response.json(draft)
    if (method === 'DELETE') {
      if (failDelete) throw new TypeError('Offline')
      if (Number(url.searchParams.get('version')) !== draft.version) return Response.json({ message: 'Conflito.' }, { status: 409 })
      drafts.delete(id)
      if (dropDeleteResponse) { dropDeleteResponse = false; throw new TypeError('Resposta perdida') }
      return new Response(null, { status: 204 })
    }
    if (method === 'POST' && suffix.endsWith('/complete')) {
      if (rejectCompletion) return Response.json({ message: 'Há campos inválidos.', fields: { cpf: 'CPF já cadastrado.' } }, { status: 400 })
      if (draft.status !== 'COMPLETED') {
        if (body.version !== draft.version) return Response.json({ message: 'Conflito.' }, { status: 409 })
        recordCount++
        lastSubmission = body.submission
        draft.status = 'COMPLETED'; draft.recordId = `record-${recordCount}`; draft.data = {}; draft.version++
      }
      if (dropCompletion) { dropCompletion = false; throw new TypeError('Resposta perdida') }
      return Response.json({ draftId: id, formType: draft.formType, recordId: draft.recordId })
    }
    if (method === 'PUT') {
      if (updateGate) { const gate = updateGate; updateGate = undefined; await gate }
      if (failSave) throw new TypeError('Offline')
      if (body.version !== draft.version || draft.status === 'COMPLETED') return Response.json({ message: 'Conflito.' }, { status: 409 })
      draft.data = body.data; draft.title = body.title; draft.version++; draft.updatedAt = new Date().toISOString()
      return Response.json(draft)
    }
    throw new Error(`Pedido inesperado: ${method} ${url.pathname}`)
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => { vi.unstubAllGlobals(); localStorage.clear(); sessionStorage.clear() })

describe.each(['STUDENT', 'POPULATION_SURVEY'] as const)('Rascunho: %s', (type) => {
  const submit = type === 'STUDENT' ? 'Salvar cadastro' : 'Salvar levantamento'

  it('salva automaticamente campos incompletos e recupera o estado após remontar a página', async () => {
    const page = show(type); await ready()
    change('Nome (obrigatório)', 'Maria parcial')
    change(type === 'STUDENT' ? 'Data de nascimento (obrigatória)' : 'Data de nascimento', '20/0')
    if (type === 'POPULATION_SURVEY') {
      await userEvent.click(screen.getByRole('button', { name: 'Adicionar integrante' }))
      change('Nome completo (obrigatório)', 'Integrante parcial')
      change('Renda mensal (R$)', '120,')
    }
    await waitFor(() => expect(drafts.size).toBe(1), { timeout: 2500 })
    await screen.findByText(/Rascunho salvo às/)
    const saved = [...drafts.values()][0]
    expect(saved.formType).toBe(type)
    expect(readPending(draftStorageKey(type))).toBeNull()
    page.unmount()
    show(type)
    await userEvent.click(await screen.findByRole('button', { name: 'Continuar Maria parcial' }))
    await ready()
    expect(screen.getByDisplayValue('20/0')).toBeTruthy()
    expect(screen.getByDisplayValue('Maria parcial')).toBeTruthy()
    if (type === 'POPULATION_SURVEY') {
      expect(screen.getByDisplayValue('Integrante parcial')).toBeTruthy()
      expect(screen.getByDisplayValue('120,')).toBeTruthy()
    }
    expect(recordCount).toBe(0)
  })

  it('recupera um reload ocorrido antes do primeiro autosave sem misturar contas', async () => {
    const page = show(type); await ready()
    change('Nome (obrigatório)', 'Ainda nesta aba')
    expect(readPending(draftStorageKey(type))?.data).toBeTruthy()
    const event = new Event('beforeunload', { cancelable: true })
    window.dispatchEvent(event)
    expect(event.defaultPrevented).toBe(true)
    page.unmount()
    const other = 'outro@test.local'
    signIn(other)
    const otherPage = show(type); await ready()
    expect(screen.queryByDisplayValue('Ainda nesta aba')).toBeNull()
    otherPage.unmount()
    signIn()
    show(type)
    await userEvent.click(await screen.findByRole('button', { name: 'Recuperar preenchimento desta aba' }))
    await ready()
    expect(screen.getByDisplayValue('Ainda nesta aba')).toBeTruthy()
    await saveNow()
    expect(drafts.size).toBe(1)
  })

  it('continua depois salvando o rascunho sem concluir o cadastro', async () => {
    show(type); await ready()
    change('Nome (obrigatório)', 'Continuar amanhã')
    await userEvent.click(screen.getByRole('button', { name: 'Continuar depois' }))
    expect(await screen.findByText('Painel de cadastros')).toBeTruthy()
    expect([...drafts.values()][0].status).toBe('DRAFT')
    expect(recordCount).toBe(0)
  })

  it('preserva o preenchimento se descartar falhar e limpa somente após confirmação do servidor', async () => {
    show(type); await ready()
    change('Nome (obrigatório)', 'Manter até descartar')
    await saveNow()
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
    expect(calls('DELETE')).toHaveLength(0)
    confirm.mockReturnValue(true); failDelete = true
    await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
    expect(await screen.findByText(/Não foi possível descartar/)).toBeTruthy()
    expect(screen.getByDisplayValue('Manter até descartar')).toBeTruthy()
    failDelete = false
    await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
    await waitFor(() => expect(drafts.size).toBe(0))
    expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe('')
    expect(readPending(draftStorageKey(type))).toBeNull()
  })

  it('conclui pelo rascunho com payload normalizado e não usa os endpoints antigos de criação', async () => {
    show(type); await ready(); valid(type)
    await userEvent.click(screen.getByRole('button', { name: submit }))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(recordCount).toBe(1)
    expect([...drafts.values()][0].status).toBe('COMPLETED')
    if (type === 'STUDENT') {
      expect(lastSubmission.birthDate).toBe('2015-05-20')
      expect(lastSubmission.relatives).toEqual(expect.arrayContaining([expect.objectContaining({ type: 'RESPONSAVEL', name: 'Responsável Maria' })]))
    } else expect(lastSubmission.responsible).toEqual(expect.objectContaining({ name: 'Maria' }))
    expect(fetchMock.mock.calls.some(([url]) => /\/api\/v1\/(students|population-surveys)$/.test(String(url)))).toBe(false)
    expect(readPending(draftStorageKey(type))).toBeNull()
  })

  it('confirma uma conclusão com resposta perdida depois de reload, sem duplicar o cadastro', async () => {
    const page = show(type); await ready(); valid(type)
    dropCompletion = true
    await userEvent.click(screen.getByRole('button', { name: submit }))
    expect(await screen.findByRole('button', { name: 'Verificar conclusão' })).toBeTruthy()
    expect(recordCount).toBe(1)
    expect(screen.getByLabelText('Nome (obrigatório)').matches(':disabled')).toBe(true)
    page.unmount()
    show(type)
    await userEvent.click(await screen.findByRole('button', { name: 'Recuperar preenchimento desta aba' }))
    await userEvent.click(await screen.findByRole('button', { name: 'Verificar conclusão' }))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect(recordCount).toBe(1)
    expect(readPending(draftStorageKey(type))).toBeNull()
  })
})

it('serializa atualizações e usa a versão confirmada quando há digitação durante um salvamento', async () => {
  show('STUDENT'); await ready()
  change('Nome (obrigatório)', 'Inicial'); await saveNow()
  let release!: () => void
  updateGate = new Promise<void>((resolve) => { release = resolve })
  change('Nome (obrigatório)', 'Primeira alteração')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho agora' }))
  await waitFor(() => expect(calls('PUT')).toHaveLength(1))
  change('Nome (obrigatório)', 'Última alteração')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho agora' }))
  expect(calls('PUT')).toHaveLength(1)
  await act(async () => release())
  await waitFor(() => expect(calls('PUT')).toHaveLength(2))
  await screen.findByText(/Rascunho salvo às/)
  expect(calls('PUT').map(([, init]) => JSON.parse(String(init?.body)).version)).toEqual([0, 1])
  expect([...drafts.values()][0].data.name).toBe('Última alteração')
})

it('preserva conflito após reload e permite salvar uma cópia sem sobrescrever a outra aba', async () => {
  const page = show('STUDENT'); await ready()
  change('Nome (obrigatório)', 'Original'); await saveNow()
  const remote = [...drafts.values()][0]
  remote.version++; remote.data.name = 'Outra aba'
  change('Nome (obrigatório)', 'Minha aba')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho agora' }))
  await screen.findByRole('button', { name: 'Salvar meu preenchimento como outro rascunho' })
  expect(readPending(draftStorageKey('STUDENT'))?.version).toBe(0)
  page.unmount(); show('STUDENT')
  await userEvent.click(await screen.findByRole('button', { name: 'Recuperar preenchimento desta aba' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Salvar meu preenchimento como outro rascunho' }))
  await screen.findByText(/Rascunho salvo às/)
  expect(remote.data.name).toBe('Outra aba')
  expect(drafts.size).toBe(2)
  expect([...drafts.values()][1].data.name).toBe('Minha aba')
})

it('preserva dados offline e tenta novamente quando a conexão volta', async () => {
  show('STUDENT'); await ready(); failSave = true
  change('Nome (obrigatório)', 'Trabalho offline')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho agora' }))
  await screen.findByText(/Não foi possível salvar o rascunho/)
  expect(readPending(draftStorageKey('STUDENT'))?.data.name).toBe('Trabalho offline')
  failSave = false
  act(() => window.dispatchEvent(new Event('online')))
  await screen.findByText(/Rascunho salvo às/)
  expect([...drafts.values()][0].data.name).toBe('Trabalho offline')
})

it('recupera os integrantes e autorizações independentes de um rascunho parcial', async () => {
  const page = show('POPULATION_SURVEY'); await ready()
  change('Nome (obrigatório)', 'Família')
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar integrante' }))
  change('Nome completo (obrigatório)', 'Filha')
  await userEvent.click(within(screen.getByRole('group', { name: 'Uso de imagem e som' })).getByRole('radio', { name: 'Não autorizo' }))
  await userEvent.click(within(screen.getByRole('group', { name: 'Tratamento de dados pessoais' })).getByRole('radio', { name: 'Autorizo' }))
  await saveNow(); page.unmount(); show('POPULATION_SURVEY')
  await userEvent.click(await screen.findByRole('button', { name: 'Continuar Família' }))
  await ready()
  expect(screen.getByDisplayValue('Filha')).toBeTruthy()
  expect(within(screen.getByRole('group', { name: 'Uso de imagem e som' })).getByRole('radio', { name: 'Não autorizo', checked: true })).toBeTruthy()
  expect(within(screen.getByRole('group', { name: 'Tratamento de dados pessoais' })).getByRole('radio', { name: 'Autorizo', checked: true })).toBeTruthy()
})

it('não apaga o conteúdo após erro de validação na conclusão', async () => {
  show('STUDENT'); await ready(); valid('STUDENT'); rejectCompletion = true
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  expect(await screen.findByText('CPF já cadastrado.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Verificar conclusão' })).toBeNull()
  expect(screen.getByDisplayValue('Maria')).toBeTruthy()
  expect([...drafts.values()][0].status).toBe('DRAFT')
  expect(screen.getByLabelText('Nome (obrigatório)').matches(':disabled')).toBe(false)
  rejectCompletion = false
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  expect(await screen.findByRole('status')).toBeTruthy()
  expect(recordCount).toBe(1)
})

it('não limpa alterações de uma página nova quando um salvamento antigo termina após navegação', async () => {
  const oldPage = show('STUDENT'); await ready()
  change('Nome (obrigatório)', 'Original'); await saveNow()
  let release!: () => void
  updateGate = new Promise<void>((resolve) => { release = resolve })
  change('Nome (obrigatório)', 'Salvamento antigo')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho agora' }))
  await waitFor(() => expect(calls('PUT')).toHaveLength(1))
  oldPage.unmount(); show('STUDENT')
  await userEvent.click(await screen.findByRole('button', { name: 'Recuperar preenchimento desta aba' }))
  await ready()
  change('Nome (obrigatório)', 'Nova edição nesta aba')
  await act(async () => release())
  expect(readPending(draftStorageKey('STUDENT'))?.data.name).toBe('Nova edição nesta aba')
})

it('mantém a cópia pendente quando a busca inicial falha e recupera depois de tentar novamente', async () => {
  const first = show('STUDENT'); await ready()
  change('Nome (obrigatório)', 'Preservado no reload')
  first.unmount()
  fetchMock.mockRejectedValueOnce(new TypeError('Offline'))
  show('STUDENT')
  await screen.findByRole('button', { name: 'Tentar buscar rascunhos novamente' })
  expect(screen.getByLabelText('Nome (obrigatório)').matches(':disabled')).toBe(true)
  expect(readPending(draftStorageKey('STUDENT'))?.data.name).toBe('Preservado no reload')
  await userEvent.click(screen.getByRole('button', { name: 'Tentar buscar rascunhos novamente' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Recuperar preenchimento desta aba' }))
  await ready()
  expect(screen.getByDisplayValue('Preservado no reload')).toBeTruthy()
})

it('preserva a cópia da aba se a resposta de descarte se perder e permite confirmar o descarte depois', async () => {
  show('STUDENT'); await ready()
  change('Nome (obrigatório)', 'Descarte sem resposta'); await saveNow()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  dropDeleteResponse = true
  await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
  await screen.findByText(/Não foi possível descartar/)
  expect(drafts.size).toBe(0)
  expect(readPending(draftStorageKey('STUDENT'))?.data.name).toBe('Descarte sem resposta')
  await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
  await waitFor(() => expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe(''))
  expect(readPending(draftStorageKey('STUDENT'))).toBeNull()
})

it('não envia dados do preenchimento antigo se a conta autenticada mudar', async () => {
  show('STUDENT'); await ready()
  change('Nome (obrigatório)', 'Dados do primeiro usuário')
  const originalKey = draftStorageKey('STUDENT')
  signIn('outra-conta@test.local')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho agora' }))
  await screen.findByText(/Não foi possível salvar o rascunho/)
  expect(calls('POST')).toHaveLength(0)
  expect(readPending(originalKey)?.data.name).toBe('Dados do primeiro usuário')
  expect(readPending(draftStorageKey('STUDENT'))).toBeNull()
})
