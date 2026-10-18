import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { Header } from '../src/components/layout/Header'
import { ProfilePage } from '../src/features/profile/ProfilePage'
import { getAccessToken, setTokens } from '../src/lib/auth'

const account = { id: 'user-1', name: 'Maria Silva', email: 'maria@example.com', role: 'OPERADOR' }
const fetchMock = vi.fn<typeof fetch>()

beforeEach(() => {
  localStorage.clear()
  const claims = btoa(JSON.stringify({ sub: account.email, role: account.role, type: 'access', exp: Date.now() / 1000 + 3600 }))
  setTokens(`header.${claims}.signature`, 'refresh')
  fetchMock.mockReset()
  fetchMock.mockImplementation(async (_url, init) => {
    if (init?.method === 'PUT') return new Response(null, { status: 204 })
    if (init?.method === 'PATCH') return Response.json({ ...account, ...JSON.parse(String(init.body)) })
    return Response.json(account)
  })
  vi.stubGlobal('fetch', fetchMock)
})

afterEach(() => {
  localStorage.clear()
  vi.unstubAllGlobals()
})

function showPage() {
  render(<MemoryRouter><ProfilePage /></MemoryRouter>)
}

async function fillPasswords(confirmation = 'senha-nova-123') {
  await screen.findByDisplayValue(account.name)
  fireEvent.change(screen.getByLabelText('Senha atual (obrigatória)'), { target: { value: 'senha-antiga-123' } })
  fireEvent.change(screen.getByLabelText('Nova senha (obrigatória)'), { target: { value: 'senha-nova-123' } })
  fireEvent.change(screen.getByLabelText('Confirmar nova senha (obrigatório)'), { target: { value: confirmation } })
}

it('consulta a conta autenticada e mantém e-mail e permissão somente para leitura', async () => {
  showPage()
  expect(await screen.findByDisplayValue(account.name)).toBeTruthy()
  expect(screen.getByText(account.email)).toBeTruthy()
  expect(screen.getByText('Operador')).toBeTruthy()
  expect(screen.queryByRole('combobox')).toBeNull()
  expect(screen.getByRole('button', { name: 'Salvar nome' }).matches(':disabled')).toBe(true)
  expect(String(fetchMock.mock.calls[0][0])).toContain('/api/v1/me')
  expect(new Headers(fetchMock.mock.calls[0][1]?.headers).get('Authorization')).toMatch(/^Bearer /)
})

it('salva apenas o nome, sem espaços nas extremidades, e atualiza a referência do formulário', async () => {
  showPage()
  fireEvent.change(await screen.findByDisplayValue(account.name), { target: { value: '  Maria Oliveira  ' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }))
  expect(await screen.findByText('Nome atualizado com sucesso.')).toBeTruthy()
  expect(screen.getByDisplayValue('Maria Oliveira')).toBeTruthy()
  const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'PATCH')!
  expect(JSON.parse(String(init?.body))).toEqual({ name: 'Maria Oliveira' })
  expect(screen.getByRole('button', { name: 'Salvar nome' }).matches(':disabled')).toBe(true)
})

it('impede nome em branco e preserva o preenchimento quando o servidor recusa', async () => {
  showPage()
  const name = await screen.findByDisplayValue(account.name)
  fireEvent.change(name, { target: { value: '   ' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }))
  expect(await screen.findByText('Informe seu nome.')).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  fireEvent.change(name, { target: { value: 'Maria Oliveira' } })
  fetchMock.mockResolvedValueOnce(Response.json({ message: 'Não foi possível atualizar o nome.', fields: { name: 'Confira o nome informado.' } }, { status: 400 }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar nome' }))
  expect(await screen.findByText('Confira o nome informado.')).toBeTruthy()
  expect(screen.getByDisplayValue('Maria Oliveira')).toBeTruthy()
  expect(screen.queryByText('Nome atualizado com sucesso.')).toBeNull()
})

it('valida a confirmação antes de enviar e não persiste senhas no navegador', async () => {
  showPage()
  await fillPasswords('outra-senha')
  await userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }))
  expect(await screen.findByText('As senhas não coincidem.')).toBeTruthy()
  expect(fetchMock).toHaveBeenCalledTimes(1)
  fireEvent.change(screen.getByLabelText('Confirmar nova senha (obrigatório)'), { target: { value: 'senha-nova-123' } })
  await userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }))
  expect(await screen.findByText('Senha alterada com sucesso.')).toBeTruthy()
  const [, init] = fetchMock.mock.calls.find(([, init]) => init?.method === 'PUT')!
  expect(JSON.parse(String(init?.body))).toEqual({ currentPassword: 'senha-antiga-123', newPassword: 'senha-nova-123' })
  expect((screen.getByLabelText('Senha atual (obrigatória)') as HTMLInputElement).value).toBe('')
  expect(JSON.stringify({ ...localStorage, ...sessionStorage })).not.toContain('senha-')
})

it('exibe o erro da senha atual sem mostrar sucesso e permite mostrar ou ocultar senhas', async () => {
  showPage()
  await fillPasswords()
  await userEvent.click(screen.getByLabelText('Mostrar senhas'))
  expect(screen.getByLabelText('Senha atual (obrigatória)').getAttribute('type')).toBe('text')
  fetchMock.mockResolvedValueOnce(Response.json({ message: 'Confira a senha atual.', fields: { currentPassword: 'Senha atual incorreta.' } }, { status: 400 }))
  await userEvent.click(screen.getByRole('button', { name: 'Alterar senha' }))
  expect(await screen.findByText('Senha atual incorreta.')).toBeTruthy()
  expect(screen.queryByText('Senha alterada com sucesso.')).toBeNull()
  expect(getAccessToken()).toBeTruthy()
})

it('mostra dados da sessão se a rota não existir, bloqueia alterações e permite tentar de novo', async () => {
  fetchMock.mockResolvedValueOnce(new Response(null, { status: 404 }))
  showPage()
  expect(await screen.findByText(/A edição do perfil ainda não está disponível/)).toBeTruthy()
  expect(screen.getByText(account.email)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Alterar senha' }).matches(':disabled')).toBe(true)
  expect(screen.getByLabelText('Nome').matches(':disabled')).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByDisplayValue(account.name)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Alterar senha' }).matches(':disabled')).toBe(false)
})

it('não apresenta falha de conexão como sucesso', async () => {
  fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))
  showPage()
  expect(await screen.findByText(/Não foi possível carregar seu perfil/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Alterar senha' }).matches(':disabled')).toBe(true)
})

it('abre o perfil pelo menu, fecha com Escape e encerra a sessão', async () => {
  render(<MemoryRouter initialEntries={['/app']}><Header /><Routes>
    <Route path="/app" element={<p>Painel</p>} />
    <Route path="/app/perfil" element={<ProfilePage />} />
    <Route path="/login" element={<p>Login</p>} />
  </Routes></MemoryRouter>)
  const toggle = screen.getByRole('button', { name: /Minha conta/ })
  await userEvent.click(toggle)
  await userEvent.keyboard('{Escape}')
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  expect(document.activeElement).toBe(toggle)
  await userEvent.click(toggle)
  await userEvent.click(screen.getByRole('link', { name: 'Meu perfil' }))
  expect(await screen.findByRole('heading', { name: 'Meu perfil' })).toBeTruthy()
  await userEvent.click(toggle)
  await userEvent.click(screen.getByRole('button', { name: 'Sair' }))
  await waitFor(() => expect(screen.getByText('Login')).toBeTruthy())
  expect(getAccessToken()).toBeNull()
})
