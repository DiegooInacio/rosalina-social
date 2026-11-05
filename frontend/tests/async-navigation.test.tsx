import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useNavigate } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { LoginForm } from '../src/features/auth/LoginForm'
import { login } from '../src/features/auth/auth.api'
import { getUserSubject, setTokens } from '../src/lib/auth'
import { FormActions } from '../src/components/ui/FormActions'

vi.mock('../src/features/auth/auth.api', () => ({ login: vi.fn() }))
const token = (email: string) => `header.${btoa(JSON.stringify({ sub: email, type: 'access', exp: Date.now() / 1000 + 3600 }))}.signature`
beforeEach(() => { localStorage.clear(); sessionStorage.clear(); vi.mocked(login).mockReset() })
afterEach(() => { localStorage.clear(); sessionStorage.clear() })

it('uma resposta de login antiga não substitui a sessão autenticada depois', async () => {
  let release!: (value: Awaited<ReturnType<typeof login>>) => void
  vi.mocked(login).mockImplementation(() => new Promise((resolve) => { release = resolve }))
  render(<MemoryRouter><Routes><Route path="/" element={<LoginForm />} /><Route path="/app" element={<p>Área interna</p>} /></Routes></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'primeira@teste.local' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-teste' } })
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await waitFor(() => expect(login).toHaveBeenCalledOnce())
  setTokens(token('segunda@teste.local'), 'refresh-segunda')
  await act(async () => { release({ accessToken: token('primeira@teste.local'), refreshToken: 'refresh-primeira', tokenType: 'Bearer' }) })
  expect(getUserSubject()).toBe('segunda@teste.local')
  expect(screen.queryByText('Área interna')).toBeNull()
  expect(screen.getByText(/A sessão mudou enquanto você entrava/)).toBeTruthy()
})

it('ignora a resposta de login depois de sair da página', async () => {
  let release!: (value: Awaited<ReturnType<typeof login>>) => void
  vi.mocked(login).mockImplementation(() => new Promise((resolve) => { release = resolve }))
  const first = render(<MemoryRouter><LoginForm /></MemoryRouter>)
  fireEvent.change(screen.getByLabelText('E-mail'), { target: { value: 'primeira@teste.local' } })
  fireEvent.change(screen.getByLabelText('Senha'), { target: { value: 'senha-teste' } })
  await userEvent.click(screen.getByRole('button', { name: 'Entrar' }))
  await waitFor(() => expect(login).toHaveBeenCalledOnce())
  first.unmount()
  await act(async () => { release({ accessToken: token('primeira@teste.local'), refreshToken: 'refresh-primeira', tokenType: 'Bearer' }) })
  expect(getUserSubject()).toBeNull()
})

it.each(['Continuar depois', 'Cancelar'])('%s não navega sobre outra tela quando a operação antiga termina', async (action) => {
  let release!: (value: boolean) => void
  const pending = vi.fn(() => new Promise<boolean>((resolve) => { release = resolve }))
  function Navigation() {
    const navigate = useNavigate()
    return <button onClick={() => navigate('/second')}>Abrir outro formulário</button>
  }
  render(<MemoryRouter initialEntries={['/first']}><Navigation /><Routes>
    <Route path="/first" element={<FormActions isDirty={false} isSubmitting={false} onSaveDraft={pending} onClear={pending} submitLabel="Salvar" />} />
    <Route path="/second" element={<input aria-label="Nova edição" defaultValue="Dados preservados" />} />
    <Route path="/app" element={<p>Painel</p>} />
  </Routes></MemoryRouter>)
  await userEvent.click(screen.getByRole('button', { name: action }))
  await waitFor(() => expect(pending).toHaveBeenCalledOnce())
  await userEvent.click(screen.getByRole('button', { name: 'Abrir outro formulário' }))
  await act(async () => { release(true) })
  expect(screen.getByDisplayValue('Dados preservados')).toBeTruthy()
  expect(screen.queryByText('Painel')).toBeNull()
})
