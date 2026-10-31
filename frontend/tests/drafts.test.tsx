import { Activity, StrictMode } from 'react'
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentRegistrationForm } from '../src/features/student-registration/StudentRegistrationForm'
import { PopulationSurveyForm } from '../src/features/population-survey/PopulationSurveyForm'
import { draftStorageKey, readPending } from '../src/features/drafts/draft-storage'
import type { FormDraft, FormType } from '../src/features/drafts/drafts.api'
import { setTokens } from '../src/lib/auth'
import { PrivateLayout } from '../src/layouts/PrivateLayout'
import * as cep from '../src/lib/cep'

const catalogState = vi.hoisted(() => ({ hide: false }))
const activityId = '00000000-0000-4000-8000-000000000001'
vi.mock('../src/features/catalogs/useCatalog', () => ({
  useCatalog: () => ({ items: catalogState.hide ? [] : [{ id: '00000000-0000-4000-8000-000000000001', name: 'Capoeira' }], isLoading: false, hasError: false, reload: vi.fn() }),
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
  return render(<StrictMode><MemoryRouter initialEntries={['/form']}><Routes>
    <Route path="/form" element={type === 'STUDENT' ? <StudentRegistrationForm /> : <PopulationSurveyForm />} />
    <Route path="/app" element={<p>Painel de cadastros</p>} />
  </Routes></MemoryRouter></StrictMode>)
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
  catalogState.hide = false
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
      const id = body.requestId ?? `draft-${drafts.size + 1}`
      if (drafts.has(id)) return Response.json(drafts.get(id), { status: 201 })
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
    await ready()
    expect(screen.getByDisplayValue('20/0')).toBeTruthy()
    expect(screen.getByDisplayValue('Maria parcial')).toBeTruthy()
    if (type === 'POPULATION_SURVEY') {
      expect(screen.getByDisplayValue('Integrante parcial')).toBeTruthy()
      expect(screen.getByDisplayValue('R$ 1,20')).toBeTruthy()
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
  await ready()
  change('Nome (obrigatório)', 'Nova edição nesta aba')
  await act(async () => release())
  expect(readPending(draftStorageKey('STUDENT'))?.data.name).toBe('Nova edição nesta aba')
})

it('mantém a cópia pendente quando a busca inicial falha e recupera depois de tentar novamente', async () => {
  const first = show('STUDENT'); await ready()
  change('Nome (obrigatório)', 'Preservado no reload')
  first.unmount()
  const onlineFetch = fetchMock.getMockImplementation()!
  fetchMock.mockRejectedValue(new TypeError('Offline'))
  show('STUDENT')
  await screen.findByRole('button', { name: 'Tentar buscar rascunhos novamente' })
  expect(screen.getByLabelText('Nome (obrigatório)').matches(':disabled')).toBe(true)
  expect(readPending(draftStorageKey('STUDENT'))?.data.name).toBe('Preservado no reload')
  fetchMock.mockImplementation(onlineFetch)
  await userEvent.click(screen.getByRole('button', { name: 'Tentar buscar rascunhos novamente' }))
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


it('recupera automaticamente o rascunho mais recente e permite continuar outro sem perder a escolha', async () => {
  const seed = (id: string, name: string, updatedAt: string): FormDraft => ({
    id, title: name, formType: 'STUDENT', status: 'DRAFT', data: { name }, version: 0,
    createdAt: updatedAt, updatedAt,
  })
  drafts.set('old', seed('old', 'Mais antigo', '2026-01-01T10:00:00Z'))
  drafts.set('recent', seed('recent', 'Mais recente', '2026-02-01T10:00:00Z'))
  show('STUDENT'); await ready()
  expect(screen.getByDisplayValue('Mais recente')).toBeTruthy()
  fireEvent.click(screen.getByText('Outros rascunhos salvos'))
  await userEvent.click(screen.getByRole('button', { name: 'Continuar Mais antigo' }))
  await ready()
  expect(screen.getByDisplayValue('Mais antigo')).toBeTruthy()
  change('Nome (obrigatório)', 'Editado sem salvar')
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await userEvent.click(screen.getByRole('button', { name: 'Continuar Mais recente' }))
  expect(confirm).toHaveBeenCalledOnce()
  expect(screen.getByDisplayValue('Editado sem salvar')).toBeTruthy()
  confirm.mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Continuar Mais recente' }))
  await ready()
  expect(screen.getByDisplayValue('Mais recente')).toBeTruthy()
})

it('limpa o rascunho recuperado automaticamente sem excluir os demais', async () => {
  const seed = (id: string, name: string, updatedAt: string): FormDraft => ({
    id, title: name, formType: 'STUDENT', status: 'DRAFT', data: { name }, version: 0,
    createdAt: updatedAt, updatedAt,
  })
  drafts.set('old', seed('old', 'Mais antigo', '2026-01-01T10:00:00Z'))
  drafts.set('recent', seed('recent', 'Mais recente', '2026-02-01T10:00:00Z'))
  show('STUDENT'); await ready()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
  await waitFor(() => expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe(''))
  expect(drafts.has('recent')).toBe(false)
  expect(drafts.has('old')).toBe(true)
})

it('atualiza a validação depois de recuperar, corrigir e reenviar um rascunho', async () => {
  drafts.set('resume', {
    id: 'resume', title: 'Maria', formType: 'STUDENT', status: 'DRAFT', version: 0,
    data: { name: 'Maria', guardianPhone: '(95) 00123-9123', guardian: { name: 'Responsável preenchido' } },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  })
  show('STUDENT'); await ready()
  expect(screen.getByDisplayValue('Responsável preenchido')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  expect(await screen.findByText(/O celular deve começar com 9 depois do DDD/)).toBeTruthy()
  expect(screen.queryByText('Informe o nome do responsável.')).toBeNull()
  valid('STUDENT')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await screen.findByRole('status')
  expect(lastSubmission.guardianPhone).toBe('(85) 99999-9999')
  expect(recordCount).toBe(1)
})


it('recupera mãe e saneamento sem exigir outro responsável ou perder dados recolhidos', async () => {
  const page = show('STUDENT'); await ready()
  change('Nome (obrigatório)', 'Aluno com mãe')
  change('Nome da mãe', 'Maria')
  change('Nome do pai', 'João')
  for (const [label, answer] of [['Água', 'Sim'], ['Esgoto', 'Não'], ['Coleta de lixo', 'Sim']]) {
    await userEvent.click(within(screen.getByRole('group', { name: label })).getByRole('radio', { name: answer }))
  }
  const mother = screen.getByLabelText('Nome da mãe').closest('details')!
  await userEvent.click(mother.querySelector('summary')!)
  expect(mother.open).toBe(false)
  await saveNow(); page.unmount()
  show('STUDENT'); await ready()
  expect((screen.getByLabelText('Nome da mãe') as HTMLInputElement).value).toBe('Maria')
  expect((screen.getByLabelText('Nome do pai') as HTMLInputElement).value).toBe('João')
  expect(screen.getByLabelText('Nome da mãe').closest('details')!.open).toBe(true)
  expect(screen.getByLabelText('Nome do pai').closest('details')!.open).toBe(false)
  for (const [label, answer] of [['Água', 'Sim'], ['Esgoto', 'Não'], ['Coleta de lixo', 'Sim']]) {
    expect(within(screen.getByRole('group', { name: label })).getByRole('radio', { name: answer, checked: true })).toBeTruthy()
  }
  change('Atividade matriculada (obrigatória)', activityId)
  change('Data de nascimento (obrigatória)', '20/05/2015')
  change('Telefone do responsável (obrigatório)', '85999999999')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await screen.findByRole('status')
  expect(lastSubmission.relatives).toEqual([expect.objectContaining({ type: 'MAE', name: 'Maria' }), expect.objectContaining({ type: 'PAI', name: 'João' })])
  expect(lastSubmission.socioeconomic).toMatchObject({ hasWaterSupply: true, hasSewage: false, hasGarbageCollection: true })
})

it.each([['mae', 'Mãe'], ['Vizinha', 'Vizinha']])('preserva o parentesco antigo %s ao recuperar o rascunho', async (saved, expected) => {
  drafts.set('kinship', {
    id: 'kinship', title: 'Aluno', formType: 'STUDENT', status: 'DRAFT', version: 0,
    data: { name: 'Aluno', guardian: { name: 'Maria', kinship: saved } },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  })
  show('STUDENT'); await ready()
  const select = screen.getByLabelText('Grau de parentesco') as HTMLSelectElement
  expect(select.value).toBe(expected)
  expect(select.selectedOptions[0].textContent).toContain(expected)
  change('Atividade matriculada (obrigatória)', activityId)
  change('Data de nascimento (obrigatória)', '20/05/2015')
  change('Telefone do responsável (obrigatório)', '85999999999')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await screen.findByRole('status')
  expect(lastSubmission.relatives).toEqual([expect.objectContaining({ kinship: expected })])
})

it('abre os rascunhos e salva normalmente com sessão de acesso expirada', async () => {
  const claims = (exp: number) => `header.${btoa(JSON.stringify({ sub: 'operador@test.local', role: 'OPERADOR', type: 'access', exp }))}.signature`
  const now = Math.floor(Date.now() / 1000)
  const current = claims(now + 3600)
  setTokens(claims(now - 60), 'refresh')
  const server = fetchMock.getMockImplementation()!
  fetchMock.mockImplementation(async (input, init) => String(input).endsWith('/api/v1/auth/refresh')
    ? Response.json({ accessToken: current, refreshToken: 'novo-refresh' }) : server(input, init))
  show('STUDENT'); await ready()
  valid('STUDENT')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await screen.findByRole('status')
  expect(recordCount).toBe(1)
  expect(fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/auth/refresh'))).toHaveLength(1)
  expect(lastSubmission.name).toBe('Maria')
})


it('preserva o formulário quando efeitos são desmontados e retomados mantendo o estado', async () => {
  const view = (mode: 'visible' | 'hidden') => <MemoryRouter><Activity mode={mode}><StudentRegistrationForm /></Activity></MemoryRouter>
  const page = render(view('visible')); await ready()
  change('Nome (obrigatório)', 'Preenchimento durante edição de código')
  const before = fetchMock.mock.calls.filter(([url, init]) => String(url).includes('/form-drafts?') && !init?.method).length
  page.rerender(view('hidden'))
  page.rerender(view('visible'))
  await ready()
  expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe('Preenchimento durante edição de código')
  const after = fetchMock.mock.calls.filter(([url, init]) => String(url).includes('/form-drafts?') && !init?.method).length
  expect(after).toBe(before)
  await saveNow()
  expect([...drafts.values()][0].data.name).toBe('Preenchimento durante edição de código')
})

it('formata valores monetários antigos e recupera novos valores sem alterar os centavos', async () => {
  drafts.set('money', {
    id: 'money', title: 'Aluno', formType: 'STUDENT', status: 'DRAFT', version: 0,
    data: { name: 'Aluno', socioeconomic: { householdIncome: '1200,50', waterExpense: '0' } },
    createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  })
  const first = show('STUDENT'); await ready()
  expect((screen.getByLabelText('Renda familiar mensal (R$)') as HTMLInputElement).value).toBe('R$ 1.200,50')
  expect((screen.getByLabelText('Gasto mensal com água (R$)') as HTMLInputElement).value).toBe('R$ 0,00')
  const input = screen.getByLabelText('Renda familiar mensal (R$)')
  await userEvent.clear(input)
  await userEvent.click(input)
  await userEvent.paste('2.500,90')
  await saveNow()
  expect(drafts.get('money')!.data.socioeconomic).toMatchObject({ householdIncome: '2500.90', waterExpense: '0' })
  first.unmount(); show('STUDENT'); await ready()
  expect((screen.getByLabelText('Renda familiar mensal (R$)') as HTMLInputElement).value).toBe('R$ 2.500,90')
  const water = screen.getByLabelText('Gasto mensal com água (R$)')
  await userEvent.click(water)
  await userEvent.keyboard('{Backspace}')
  expect((water as HTMLInputElement).value).toBe('')
})

describe.each(['STUDENT', 'POPULATION_SURVEY'] as const)('limpeza pelo topo: %s', (type) => {
  it('pede confirmação para rascunho recuperado e preserva os dados ao cancelar ou falhar', async () => {
    const first = show(type); await ready()
    change('Nome (obrigatório)', 'Preenchimento salvo')
    await saveNow(); first.unmount()
    show(type); await ready()
    const clear = screen.getByRole('button', { name: 'Limpar formulário pelo topo' })
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(clear)
    expect(confirm).toHaveBeenCalledOnce()
    expect(calls('DELETE')).toHaveLength(0)
    expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe('Preenchimento salvo')
    confirm.mockReturnValue(true)
    failDelete = true
    await userEvent.click(clear)
    await screen.findByText(/Não foi possível descartar/)
    expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe('Preenchimento salvo')
    failDelete = false
    await userEvent.click(clear)
    await waitFor(() => expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe(''))
    expect(drafts.size).toBe(0)
    expect(readPending(draftStorageKey(type))).toBeNull()
  })

  it('limpa formulário vazio sem confirmação', async () => {
    show(type); await ready()
    const confirm = vi.spyOn(window, 'confirm')
    await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário pelo topo' }))
    expect(confirm).not.toHaveBeenCalled()
    expect(calls('DELETE')).toHaveLength(0)
  })
})


it('confere a conclusão pelo pedido original mesmo com a atividade desativada', async () => {
  const page = show('STUDENT'); await ready(); valid('STUDENT')
  dropCompletion = true
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await screen.findByRole('button', { name: 'Verificar conclusão' })
  expect(recordCount).toBe(1)
  catalogState.hide = true
  page.rerender(<StrictMode><MemoryRouter initialEntries={['/form']}><Routes><Route path="/form" element={<StudentRegistrationForm />} /><Route path="/app" element={<p>Painel de cadastros</p>} /></Routes></MemoryRouter></StrictMode>)
  await waitFor(() => expect((screen.getByLabelText('Atividade matriculada (obrigatória)') as HTMLSelectElement).value).toBe(''))
  await userEvent.click(screen.getByRole('button', { name: 'Verificar conclusão' }))
  await screen.findByRole('link', { name: 'Ver ficha do cadastro salvo' })
  expect(recordCount).toBe(1)
  const requests = fetchMock.mock.calls.filter(([url]) => String(url).endsWith('/complete'))
  expect(requests).toHaveLength(2)
  expect(requests[1][1]?.body).toBe(requests[0][1]?.body)
})

it.each(['STUDENT', 'POPULATION_SURVEY'] as const)('confere conclusão de %s sem consultar CEP novamente', async (type) => {
  const lookup = vi.spyOn(cep, 'lookupCep').mockResolvedValue({ status: 'found', address: { street: 'Rua A', neighborhood: 'Rosalina', city: 'Fortaleza', state: 'CE' } })
  show(type); await ready(); valid(type)
  change('CEP', '60744-390')
  await screen.findByText('CEP encontrado. Confira o endereço e complete os dados que faltarem.')
  dropCompletion = true
  await userEvent.click(screen.getByRole('button', { name: type === 'STUDENT' ? 'Salvar cadastro' : 'Salvar levantamento' }))
  await screen.findByRole('button', { name: 'Verificar conclusão' })
  lookup.mockClear().mockResolvedValue({ status: 'not-found' })
  await userEvent.click(screen.getByRole('button', { name: 'Verificar conclusão' }))
  await screen.findByRole('link', { name: 'Ver ficha do cadastro salvo' })
  expect(lookup).not.toHaveBeenCalled()
  expect(recordCount).toBe(1)
})


it('trocar de conta reinicia o formulário e voltar restaura somente a cópia do titular', async () => {
  render(<MemoryRouter initialEntries={['/app/form']}><Routes><Route path="app" element={<PrivateLayout />}><Route path="form" element={<StudentRegistrationForm />} /></Route></Routes></MemoryRouter>)
  await ready()
  change('Nome (obrigatório)', 'Dados privados da primeira conta')
  const firstKey = draftStorageKey('STUDENT')
  await act(async () => { signIn('segunda-conta@test.local') })
  await ready()
  expect(screen.queryByDisplayValue('Dados privados da primeira conta')).toBeNull()
  expect(readPending(firstKey)?.data.name).toBe('Dados privados da primeira conta')
  expect(readPending(draftStorageKey('STUDENT'))).toBeNull()
  change('Nome (obrigatório)', 'Dados da segunda conta')
  await act(async () => { signIn() })
  await ready()
  expect(screen.getByDisplayValue('Dados privados da primeira conta')).toBeTruthy()
  expect(screen.queryByDisplayValue('Dados da segunda conta')).toBeNull()
})

it.each([false, true])('repete a criação com o mesmo identificador sem duplicar rascunhos (reload=%s)', async (reload) => {
  const server = fetchMock.getMockImplementation()!
  let first = true
  fetchMock.mockImplementation(async (input, init) => {
    const response = await server(input, init)
    if (first && String(input).endsWith('/api/v1/form-drafts') && init?.method === 'POST') {
      first = false
      throw new TypeError('Resposta perdida após criação')
    }
    return response
  })
  const firstPage = show('STUDENT'); await ready()
  change('Nome (obrigatório)', 'Um preenchimento')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar rascunho agora' }))
  await screen.findByText(/Não foi possível salvar o rascunho/)
  const requestId = readPending(draftStorageKey('STUDENT'))!.creationId
  expect(requestId).toBeTruthy()
  expect(drafts.size).toBe(1)
  if (reload) { firstPage.unmount(); show('STUDENT'); await ready() }
  change('Nome (obrigatório)', 'Preenchimento atualizado')
  await saveNow()
  expect(drafts.size).toBe(1)
  expect([...drafts.values()][0].data.name).toBe('Preenchimento atualizado')
  expect(calls('POST').map(([, init]) => JSON.parse(String(init?.body)).requestId)).toEqual([requestId, requestId])
  expect(recordCount).toBe(0)
})


it('renovar o token da mesma conta mantém o preenchimento e não recarrega os rascunhos', async () => {
  render(<MemoryRouter initialEntries={['/app/form']}><Routes><Route path="app" element={<PrivateLayout />}><Route path="form" element={<StudentRegistrationForm />} /></Route></Routes></MemoryRouter>)
  await ready()
  change('Nome (obrigatório)', 'Mesmo usuário')
  const before = fetchMock.mock.calls.filter(([url]) => String(url).includes('/form-drafts?')).length
  await act(async () => {
    setTokens(`header.${btoa(JSON.stringify({ sub: 'operador@test.local', role: 'OPERADOR', type: 'access', exp: Math.floor(Date.now() / 1000) + 7200 }))}.signature`, 'refresh-novo')
  })
  expect(screen.getByDisplayValue('Mesmo usuário')).toBeTruthy()
  expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/form-drafts?'))).toHaveLength(before)
})
