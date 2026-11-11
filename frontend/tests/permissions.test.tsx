import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, expect, it, vi } from 'vitest'
import { ActivitiesPage } from '../src/features/activities/ActivitiesPage'
import { PrivateLayout } from '../src/layouts/PrivateLayout'
import { getAccessToken, setTokens } from '../src/lib/auth'

afterEach(() => { localStorage.clear(); vi.unstubAllGlobals() })

it('atualiza menus e bloqueios usando o cargo do servidor sem trocar o token', async () => {
  localStorage.clear()
  const token = `header.${btoa(JSON.stringify({ sub: 'admin@test.local', role: 'ADMIN', type: 'access', exp: Date.now() / 1000 + 3600 }))}.signature`
  setTokens(token, 'refresh')
  let role = 'ADMIN'
  const fetchMock = vi.fn<typeof fetch>(async url => String(url).endsWith('/api/v1/me')
    ? Response.json({ id: 'account', name: 'Admin', email: 'admin@test.local', role }) : Response.json([]))
  vi.stubGlobal('fetch', fetchMock)
  render(<MemoryRouter initialEntries={['/app/atividades']}><Routes><Route path="/app" element={<PrivateLayout />}>
    <Route index element={<h1>Painel</h1>} /><Route path="atividades" element={<ActivitiesPage />} />
  </Route></Routes></MemoryRouter>)
  expect(await screen.findByRole('heading', { name: 'Atividades' })).toBeTruthy()
  expect(screen.getByRole('link', { name: 'Usuários e acessos' })).toBeTruthy()
  role = 'OPERADOR'
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  expect(await screen.findByRole('heading', { name: 'Painel' })).toBeTruthy()
  expect(screen.queryByRole('link', { name: 'Usuários e acessos' })).toBeNull()
  expect(screen.queryByRole('link', { name: 'Atividades' })).toBeNull()
  expect(getAccessToken()).toBe(token)
  role = 'ADMIN'
  await act(async () => { window.dispatchEvent(new Event('focus')) })
  await waitFor(() => expect(screen.getByRole('link', { name: 'Usuários e acessos' })).toBeTruthy())
  await userEvent.click(screen.getByRole('link', { name: 'Atividades' }))
  expect(await screen.findByRole('heading', { name: 'Atividades' })).toBeTruthy()
  expect(fetchMock.mock.calls.some(([url]) => String(url).endsWith('/auth/refresh'))).toBe(false)
  expect(getAccessToken()).toBe(token)
})
