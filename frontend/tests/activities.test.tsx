import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { ActivitiesPage } from '../src/features/activities/ActivitiesPage'
import { StudentRegistrationForm } from '../src/features/student-registration/StudentRegistrationForm'
import { Sidebar } from '../src/components/layout/Sidebar'
import { setTokens } from '../src/lib/auth'
import type { CatalogItem } from '../src/features/catalogs/catalog.api'

const capoeira: CatalogItem = { id: '00000000-0000-4000-8000-000000000001', category: 'ATIVIDADE', name: 'Capoeira', active: true }
const music: CatalogItem = { id: '00000000-0000-4000-8000-000000000002', category: 'ATIVIDADE', name: 'Música', active: false }
let serverItems: CatalogItem[]
const fetchMock = vi.fn<typeof fetch>()

function signIn(role: string) {
  const claims = btoa(JSON.stringify({ sub: 'admin@test.local', role, type: 'access', exp: Math.floor(Date.now() / 1000) + 3600 }))
  setTokens(`header.${claims}.signature`, 'refresh')
}

function showPage() {
  render(<MemoryRouter initialEntries={['/app/atividades']}>
    <Sidebar />
    <Routes>
      <Route path="/app/atividades" element={<ActivitiesPage />} />
      <Route path="/app" element={<p>Painel de cadastros</p>} />
    </Routes>
  </MemoryRouter>)
}

beforeEach(() => {
  localStorage.clear()
  signIn('ADMIN')
  serverItems = [{ ...capoeira }, { ...music }]
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url)
    const body = init?.body ? JSON.parse(String(init.body)) : undefined
    if (path.includes('/form-drafts')) {
      if (!init?.method || init.method === 'GET') return Response.json({ content: [] })
      return Response.json({ id: 'draft', status: 'DRAFT', version: 0, formType: body.formType, data: body.data, updatedAt: new Date().toISOString() })
    }
    if (!init?.method || init.method === 'GET') return Response.json(path.includes('category=ATIVIDADE') ? serverItems : [])
    if (init.method === 'POST') {
      const saved = { id: '00000000-0000-4000-8000-000000000003', ...body, active: true }
      serverItems.push(saved)
      return Response.json(saved, { status: 201 })
    }
    const existing = serverItems.find((item) => path.endsWith(item.id))!
    const saved = { ...existing, ...body }
    serverItems = serverItems.map((item) => item.id === saved.id ? saved : item)
    return Response.json(saved)
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

it('lista ativas e inativas, permite buscar sem acento e filtrar por situação', async () => {
  showPage()
  expect(await screen.findByText('Capoeira')).toBeTruthy()
  expect(screen.getByText('Música')).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Atividades' })).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Buscar atividade'), { target: { value: 'musica' } })
  expect(screen.getByText('Música')).toBeTruthy()
  expect(screen.queryByText('Capoeira')).toBeNull()
  fireEvent.change(screen.getByLabelText('Buscar atividade'), { target: { value: '' } })
  await userEvent.selectOptions(screen.getByLabelText('Situação'), 'active')
  expect(screen.getByText('Capoeira')).toBeTruthy()
  expect(screen.queryByText('Música')).toBeNull()
})

it('cadastra pelo catálogo de atividades com autenticação e inclui o resultado na lista', async () => {
  showPage()
  const input = await screen.findByLabelText('Nome da atividade (obrigatório)')
  fireEvent.change(input, { target: { value: '  Reforço escolar  ' } })
  await userEvent.click(screen.getByRole('button', { name: 'Cadastrar atividade' }))
  expect(await screen.findByText('Reforço escolar')).toBeTruthy()
  const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')!
  expect(JSON.parse(String(init?.body))).toEqual({ category: 'ATIVIDADE', name: 'Reforço escolar' })
  expect(new Headers(init?.headers).get('Authorization')).toMatch(/^Bearer /)
  expect((input as HTMLInputElement).value).toBe('')
})

it('impede nomes vazios e duplicados, inclusive inativos', async () => {
  showPage()
  await screen.findByLabelText('Nome da atividade (obrigatório)')
  await userEvent.click(screen.getByRole('button', { name: 'Cadastrar atividade' }))
  expect(screen.getByText('Informe o nome da atividade.')).toBeTruthy()
  fireEvent.change(screen.getByLabelText('Nome da atividade (obrigatório)'), { target: { value: '  música  ' } })
  await userEvent.click(screen.getByRole('button', { name: 'Cadastrar atividade' }))
  expect(screen.getByText(/Já existe uma atividade com esse nome/)).toBeTruthy()
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
})

it('renomeia mantendo o ID, a categoria e a situação da atividade', async () => {
  showPage()
  await userEvent.click(await screen.findByRole('button', { name: 'Renomear Música' }))
  const form = screen.getByRole('form', { name: 'Editar Música' })
  fireEvent.change(within(form).getByLabelText('Nome da atividade'), { target: { value: 'Musicalização' } })
  await userEvent.click(within(form).getByRole('button', { name: 'Salvar nome' }))
  expect(await screen.findByText('Musicalização')).toBeTruthy()
  expect(serverItems.find((item) => item.id === music.id)).toEqual({ ...music, name: 'Musicalização' })
  const url = String(fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')?.[0])
  expect(new URL(url, 'http://localhost').pathname).toBe(`/api/v1/catalogs/${music.id}`)
})

it('só desativa depois de confirmar, permite reativar e usa PATCH sem excluir registros', async () => {
  showPage()
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await userEvent.click(await screen.findByRole('button', { name: 'Desativar Capoeira' }))
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  confirm.mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Desativar Capoeira' }))
  await userEvent.click(await screen.findByRole('button', { name: 'Ativar Capoeira' }))
  expect(await screen.findByRole('button', { name: 'Desativar Capoeira' })).toBeTruthy()
  const patches = fetchMock.mock.calls.filter(([, init]) => init?.method === 'PATCH')
  expect(patches.map(([, init]) => JSON.parse(String(init?.body)))).toEqual([{ active: false }, { active: true }])
  expect(serverItems).toHaveLength(2)
})

it('mostra erro de carregamento e tenta novamente', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
  showPage()
  expect(await screen.findByText('Não foi possível carregar as atividades.')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText('Capoeira')).toBeTruthy()
})

it('preserva o nome digitado quando o servidor recusa o cadastro', async () => {
  showPage()
  await screen.findByLabelText('Nome da atividade (obrigatório)')
  fetchMock.mockResolvedValueOnce(Response.json({ message: 'Item já existe nesta categoria.' }, { status: 409 }))
  fireEvent.change(screen.getByLabelText('Nome da atividade (obrigatório)'), { target: { value: 'Informática' } })
  await userEvent.click(screen.getByRole('button', { name: 'Cadastrar atividade' }))
  await waitFor(() => expect(screen.getByRole('alert').textContent).toContain('Item já existe'))
  expect(screen.getByDisplayValue('Informática')).toBeTruthy()
  expect(serverItems).toHaveLength(2)
})

it('oculta a administração e bloqueia acesso direto para operadores', async () => {
  signIn('OPERADOR')
  showPage()
  expect(await screen.findByText('Painel de cadastros')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Atividades' })).toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('não concede acesso com token malformado', async () => {
  setTokens('invalid-token', 'refresh')
  showPage()
  expect(await screen.findByText('Painel de cadastros')).toBeTruthy()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('apresenta o estado vazio sem inventar opções', async () => {
  serverItems = []
  showPage()
  expect(await screen.findByText(/Nenhuma atividade cadastrada/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Cadastrar atividade' })).toBeTruthy()
})

it('atualiza atividades no cadastro do aluno sem apagar dados e remove uma seleção desativada', async () => {
  render(<MemoryRouter><StudentRegistrationForm /></MemoryRouter>)
  await screen.findByRole('option', { name: 'Capoeira' })
  expect(screen.queryByRole('option', { name: 'Música' })).toBeNull()
  expect(screen.getByRole('link', { name: /Gerenciar atividades/ }).getAttribute('target')).toBe('_blank')
  fireEvent.change(screen.getByLabelText('Nome (obrigatório)'), { target: { value: 'Aluno em preenchimento' } })
  await userEvent.selectOptions(screen.getByLabelText('Atividade matriculada (obrigatória)'), capoeira.id)
  serverItems = [{ ...capoeira, active: false }, { ...music, active: true }]
  await userEvent.click(screen.getByRole('button', { name: 'Atualizar atividades' }))
  expect(await screen.findByRole('option', { name: 'Música' })).toBeTruthy()
  expect(screen.queryByRole('option', { name: 'Capoeira' })).toBeNull()
  expect(screen.getByDisplayValue('Aluno em preenchimento')).toBeTruthy()
  await waitFor(() => expect((screen.getByLabelText('Atividade matriculada (obrigatória)') as HTMLSelectElement).value).toBe(''))
  await userEvent.selectOptions(screen.getByLabelText('Atividade matriculada (obrigatória)'), music.id)
  expect((screen.getByLabelText('Atividade matriculada (obrigatória)') as HTMLSelectElement).value).toBe(music.id)
})
