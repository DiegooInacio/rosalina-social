import { fireEvent, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { EditUserPage } from '../src/features/users/EditUserPage'
import { NewUserPage } from '../src/features/users/NewUserPage'
import { UsersPage } from '../src/features/users/UsersPage'
import { Sidebar } from '../src/components/layout/Sidebar'
import { setTokens } from '../src/lib/auth'
import type { ManagedUser } from '../src/features/users/users.api'

const admin: ManagedUser = { id: 'admin', name: 'Admin', email: 'admin@test.local', role: 'ADMIN', active: true }
const operator: ManagedUser = { id: 'operator', name: 'Joana', email: 'joana@test.local', role: 'OPERADOR', active: true }
const fetchMock = vi.fn<typeof fetch>()
let users: ManagedUser[]
function signIn(role: string) {
  setTokens(`header.${btoa(JSON.stringify({ sub: admin.email, role, type: 'access', exp: Date.now() / 1000 + 3600 }))}.signature`, 'refresh')
}
function show(path = '/app/usuarios') {
  render(<MemoryRouter initialEntries={[path]}><Sidebar /><Routes><Route path="/app/usuarios/:id/editar" element={<EditUserPage />} /><Route path="/app/usuarios/novo" element={<NewUserPage />} /><Route path="/app/usuarios" element={<UsersPage />} /><Route path="/app" element={<p>Painel</p>} /></Routes></MemoryRouter>)
}
beforeEach(() => {
  localStorage.clear(); signIn('ADMIN'); users = [{ ...admin }, { ...operator }]
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (url, init) => {
    const path = String(url)
    const body = init?.body ? JSON.parse(String(init.body)) : {}
    if (!init?.method) return Response.json(users)
    if (path.endsWith('/password')) return new Response(null, { status: 204 })
    if (init.method === 'POST') { const saved = { ...body, id: 'new', active: true }; users.push(saved); return Response.json(saved, { status: 201 }) }
    const id = path.split('/').at(-1)
    const saved = { ...users.find(user => user.id === id)!, ...body }
    users = users.map(user => user.id === id ? saved : user)
    return Response.json(saved)
  })
  vi.stubGlobal('fetch', fetchMock)
})
afterEach(() => { localStorage.clear(); vi.unstubAllGlobals() })
const fill = (label: string, value: string) => fireEvent.change(screen.getByLabelText(label), { target: { value } })

it('cria conta com cargo, valida confirmação e não envia confirmação à API', async () => {
  show(); await userEvent.click(screen.getByRole('link', { name: 'Novo usuário' }))
  expect(screen.queryByRole('list', { name: 'Contas cadastradas' })).toBeNull()
  fill('Nome (obrigatório)', '  Maria  '); fill('E-mail de acesso (obrigatório)', 'maria@test.local')
  fill('Senha inicial (obrigatória)', 'senha-segura'); fill('Confirmar senha (obrigatório)', 'diferente')
  await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
  expect(screen.getByText('As senhas não coincidem.')).toBeTruthy()
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
  fill('Confirmar senha (obrigatório)', 'senha-segura')
  await userEvent.selectOptions(screen.getByLabelText('Cargo (obrigatório)'), 'ADMIN')
  await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
  expect(await screen.findByText('Maria')).toBeTruthy()
  const init = fetchMock.mock.calls.find(([, init]) => init?.method === 'POST')![1]!
  expect(JSON.parse(String(init.body))).toEqual({ name: 'Maria', email: 'maria@test.local', role: 'ADMIN', password: 'senha-segura' })
  expect(new Headers(init.headers).get('Authorization')).toMatch(/^Bearer /)
  expect(screen.queryByLabelText('Senha inicial (obrigatória)')).toBeNull()
  expect(screen.getByText('Conta criada. A pessoa já pode entrar com o e-mail e a senha cadastrados.')).toBeTruthy()
})

it('edita nome e cargo preservando o e-mail', async () => {
  show(); await userEvent.click(await screen.findByRole('button', { name: 'Editar Joana' }))
  await screen.findByDisplayValue('Joana')
  expect(screen.getByRole('heading', { name: 'Editar usuário' })).toBeTruthy()
  expect(screen.queryByRole('list', { name: 'Contas cadastradas' })).toBeNull()
  expect((screen.getByLabelText('E-mail de acesso (obrigatório)') as HTMLInputElement).readOnly).toBe(true)
  expect(screen.queryByLabelText('Senha inicial (obrigatória)')).toBeNull()
  fill('Nome (obrigatório)', 'Joana Silva')
  await userEvent.selectOptions(screen.getByLabelText('Cargo (obrigatório)'), 'ADMIN')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByText('Joana Silva')).toBeTruthy()
  expect(screen.getByText('Dados da conta salvos.')).toBeTruthy()
  expect(users[1]).toEqual({ ...operator, name: 'Joana Silva', role: 'ADMIN' })
  expect(new URL(String(fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')?.[0]), 'http://localhost').pathname).toBe('/api/v1/users/operator')
})

it('redefine senha sem persistir credenciais na interface ou armazenamento', async () => {
  show(); await userEvent.click(await screen.findByRole('button', { name: 'Redefinir senha de Joana' }))
  fill('Nova senha (obrigatória)', 'nova-senha-123'); fill('Confirmar nova senha (obrigatório)', 'nova-senha-123')
  await userEvent.click(screen.getByRole('button', { name: 'Confirmar redefinição' }))
  expect(await screen.findByText('Senha redefinida. As sessões anteriores foram encerradas.')).toBeTruthy()
  const call = fetchMock.mock.calls.find(([url]) => String(url).endsWith('/password'))!
  expect(JSON.parse(String(call[1]?.body))).toEqual({ newPassword: 'nova-senha-123' })
  expect(screen.queryByLabelText('Nova senha (obrigatória)')).toBeNull()
  expect(JSON.stringify(localStorage)).not.toContain('nova-senha-123')
  expect(JSON.stringify(sessionStorage)).not.toContain('nova-senha-123')
})

it('protege a própria conta e confirma desativação de outras pessoas', async () => {
  show(); await screen.findByText('Joana')
  expect(screen.queryByRole('button', { name: 'Desativar Admin' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Redefinir senha de Admin' })).toBeNull()
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await userEvent.click(screen.getByRole('button', { name: 'Desativar Joana' }))
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PATCH')).toBe(false)
  confirm.mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Desativar Joana' }))
  expect(await screen.findByRole('button', { name: 'Ativar Joana' })).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Ativar Joana' }))
  expect(await screen.findByRole('button', { name: 'Desativar Joana' })).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Editar Admin' }))
  await screen.findByDisplayValue('Admin')
  expect((screen.getByLabelText('Cargo (obrigatório)') as HTMLSelectElement).disabled).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull())
  expect(users[0].role).toBe('ADMIN')
})

it('preserva os dados após erro e associa e-mail duplicado ao campo', async () => {
  show('/app/usuarios/novo')
  fill('Nome (obrigatório)', 'Maria'); fill('E-mail de acesso (obrigatório)', operator.email)
  fill('Senha inicial (obrigatória)', 'senha-segura'); fill('Confirmar senha (obrigatório)', 'senha-segura')
  fetchMock.mockResolvedValueOnce(Response.json({ message: 'E-mail já cadastrado.', fields: { email: 'Este e-mail já possui uma conta.' } }, { status: 409 }))
  await userEvent.click(screen.getByRole('button', { name: 'Criar conta' }))
  expect(await screen.findByText('Este e-mail já possui uma conta.')).toBeTruthy()
  expect(screen.getByDisplayValue('Maria')).toBeTruthy()
})

it('filtra por e-mail e situação e permite recuperar falha da listagem', async () => {
  fetchMock.mockRejectedValueOnce(new Error('offline')); show()
  await userEvent.click(await screen.findByRole('button', { name: 'Tentar novamente' }))
  await screen.findByText('Joana')
  fill('Buscar por nome ou e-mail', 'joana@')
  const list = screen.getByRole('list', { name: 'Contas cadastradas' })
  expect(within(list).queryByText('Admin (você)')).toBeNull()
  await userEvent.selectOptions(screen.getByLabelText('Situação'), 'inactive')
  expect(screen.getByText('Nenhuma conta encontrada.')).toBeTruthy()
})

it('oculta menu e bloqueia acesso direto para operador', async () => {
  signIn('OPERADOR'); show()
  expect(await screen.findByText('Painel')).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Usuários e acessos' })).toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})


it('mantém a listagem sem o formulário de criação e abre nova conta sem consultar a lista', async () => {
  show()
  await screen.findByText('Joana')
  expect(screen.queryByRole('form', { name: 'Criar conta' })).toBeNull()
  fetchMock.mockClear()
  await userEvent.click(screen.getByRole('link', { name: 'Novo usuário' }))
  expect(screen.getByRole('heading', { name: 'Novo usuário' })).toBeTruthy()
  expect(screen.getByRole('form', { name: 'Criar conta' })).toBeTruthy()
  expect(fetchMock).not.toHaveBeenCalled()
})

it('cancela a criação vazia e confirma antes de descartar dados preenchidos', async () => {
  show('/app/usuarios/novo')
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(await screen.findByText('Joana')).toBeTruthy()
  expect(confirm).not.toHaveBeenCalled()
  await userEvent.click(screen.getByRole('link', { name: 'Novo usuário' }))
  fill('Nome (obrigatório)', 'Maria')
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(screen.getByDisplayValue('Maria')).toBeTruthy()
  confirm.mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
  expect(await screen.findByText('Joana')).toBeTruthy()
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'POST')).toBe(false)
})

it('protege o acesso direto à criação e não consulta nem grava usuários para operadores', async () => {
  signIn('OPERADOR'); show('/app/usuarios/novo')
  expect(await screen.findByText('Painel')).toBeTruthy()
  expect(screen.queryByRole('form', { name: 'Criar conta' })).toBeNull()
  expect(fetchMock).not.toHaveBeenCalled()
})


it('abre edição diretamente, confirma descarte e retorna sem gravar', async () => {
  show('/app/usuarios/operator/editar')
  await screen.findByDisplayValue('Joana')
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  fill('Nome (obrigatório)', 'Alteração local')
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }))
  expect(screen.getByDisplayValue('Alteração local')).toBeTruthy()
  confirm.mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }))
  expect(await screen.findByText('Joana')).toBeTruthy()
  expect(fetchMock.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
})

it('preserva edição e erros do servidor quando a gravação falha', async () => {
  show('/app/usuarios/operator/editar')
  await screen.findByDisplayValue('Joana')
  fill('Nome (obrigatório)', 'Joana editada')
  fetchMock.mockResolvedValueOnce(Response.json({ message: 'Não foi possível salvar.', fields: { name: 'Confira o nome.' } }, { status: 400 }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByText('Confira o nome.')).toBeTruthy()
  expect(screen.getByDisplayValue('Joana editada')).toBeTruthy()
  expect(screen.getByRole('heading', { name: 'Editar usuário' })).toBeTruthy()
})

it('recupera falha ao carregar edição sem mostrar formulário vazio', async () => {
  fetchMock.mockRejectedValueOnce(new Error('offline'))
  show('/app/usuarios/operator/editar')
  expect(await screen.findByText('Não foi possível carregar o usuário.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByDisplayValue('Joana')).toBeTruthy()
})

it('trata usuário inexistente e oferece retorno à lista', async () => {
  show('/app/usuarios/inexistente/editar')
  expect(await screen.findByText('Usuário não encontrado.')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Salvar alterações' })).toBeNull()
  await userEvent.click(screen.getByRole('link', { name: 'Voltar para usuários' }))
  expect(await screen.findByText('Joana')).toBeTruthy()
})

it('bloqueia edição para operadores sem consultar os usuários', async () => {
  signIn('OPERADOR'); show('/app/usuarios/operator/editar')
  expect(await screen.findByText('Painel')).toBeTruthy()
  expect(fetchMock).not.toHaveBeenCalled()
})
