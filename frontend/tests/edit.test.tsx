import { Activity } from 'react'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Routes, Route } from 'react-router'
import { beforeEach, afterEach, expect, it, vi } from 'vitest'
import { apiRequest, ApiError } from '../src/lib/api'
import { RecordEditPage } from '../src/features/records/RecordEditPage'
import { studentEditValues, populationEditValues } from '../src/features/records/edit-values'
import { toPopulationRequest } from '../src/features/population-survey/population.schema'
import { setTokens } from '../src/lib/auth'

vi.mock('../src/lib/api', async (original) => ({ ...await original<typeof import('../src/lib/api')>(), apiRequest: vi.fn() }))
vi.mock('../src/features/catalogs/useCatalog', () => ({ useCatalog: () => ({ items: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Capoeira' }], isLoading: false, hasError: false, reload: vi.fn() }) }))
const request = vi.mocked(apiRequest)
const record = { id: 'student', revision: '2026-01-01T00:00:00Z', status: 'ATIVO', name: 'Ana', activity: { id: '00000000-0000-4000-8000-000000000001', name: 'Capoeira' }, birthDate: '2015-05-20', guardianPhone: '85999999999', relatives: [{ type: 'MAE', name: 'Maria', literate: false }], socioeconomic: { hasWaterSupply: false, householdIncome: 0 } }
function show() {
  return render(<MemoryRouter initialEntries={['/app/alunos/student/editar']}><Routes>
    <Route path="/app/alunos/:id/editar" element={<RecordEditPage kind="students" />} />
    <Route path="/app/alunos/:id" element={<p>Ficha atualizada</p>} />
  </Routes></MemoryRouter>)
}
beforeEach(() => {
  localStorage.clear(); sessionStorage.clear(); request.mockReset()
  setTokens(`header.${btoa(JSON.stringify({ sub: 'admin@teste.local', type: 'access', role: 'ADMIN', exp: Date.now() / 1000 + 3600 }))}.signature`, 'refresh')
  request.mockImplementation(async () => structuredClone(record))
})
afterEach(() => { localStorage.clear(); sessionStorage.clear() })

it('reconstitui datas, catálogos, zero e Não corretamente', () => {
  const values = studentEditValues(record)
  expect(values.birthDate).toBe('20/05/2015')
  expect(values.activityId).toBe(record.activity.id)
  expect(values.mother.name).toBe('Maria')
  expect(values.socioeconomic.householdIncome).toBe('0')
  expect(values.socioeconomic.hasWaterSupply).toBe('false')
})
it('preserva UUIDs dos integrantes ao enviar a edição', () => {
  const values = populationEditValues({ referenceDate: '2026-01-01', responsible: { name: 'Maria' }, members: [{ id: 'member-original', name: 'Maria', isResponsible: true, income: 0 }], authorizations: { imageAndSound: false } })
  expect(toPopulationRequest(values).members[0]).toMatchObject({ id: 'member-original', income: 0 })
  expect(toPopulationRequest(values).authorizations?.imageAndSound).toBe(false)
})
it('salva pelo PUT do registro atual sem usar rascunhos de novos cadastros', async () => {
  show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await screen.findByText('Ficha atualizada')
  const put = request.mock.calls.find(([, init]) => init?.method === 'PUT')!
  expect(put[0]).toBe('/api/v1/students/student')
  expect(new Headers(put[1]?.headers).get('If-Match')).toBe('"2026-01-01T00:00:00Z"')
  expect(JSON.parse(String(put[1]?.body))).toMatchObject({ guardianPhone: '(85) 98888-8888', relatives: [{ type: 'MAE', name: 'Maria' }], socioeconomic: { hasWaterSupply: false, householdIncome: 0 } })
  expect(request.mock.calls.some(([path]) => path.includes('form-drafts'))).toBe(false)
})
it('recupera alterações da edição ao voltar à página', async () => {
  const first = show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  first.unmount(); show()
  expect((await screen.findByLabelText('Telefone do responsável (obrigatório)') as HTMLInputElement).value).toBe('(85) 98888-8888')
})
it('preserva a edição se o PUT falhar e permite nova tentativa', async () => {
  request.mockImplementation(async (_path, init) => { if (init?.method === 'PUT') throw new ApiError('Offline', 503); return structuredClone(record) })
  show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  expect(await screen.findByText(/Não foi possível salvar o cadastro/)).toBeTruthy()
  expect((screen.getByLabelText('Telefone do responsável (obrigatório)') as HTMLInputElement).value).toBe('(85) 98888-8888')
  expect(sessionStorage.length).toBeGreaterThan(0)
  request.mockResolvedValue(structuredClone(record))
  await userEvent.click(screen.getByRole('button', { name: 'Tentar salvar novamente' }))
  await screen.findByText('Ficha atualizada')
})
it('bloqueia sobrescrita se o registro mudou antes de salvar', async () => {
  show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  request.mockResolvedValue({ ...record, name: 'Outra edição' })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await screen.findByText(/Este cadastro mudou em outra sessão/)
  expect(request.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
})
it('cancelar exige confirmação e mantém os dados se recusada', async () => {
  show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }))
  expect(confirm).toHaveBeenCalledOnce()
  expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeTruthy()
  confirm.mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Cancelar edição' }))
  await waitFor(() => expect(screen.getByText('Ficha atualizada')).toBeTruthy())
})


it('mantém a versão inicial da edição se os efeitos reiniciarem e o servidor mudar', async () => {
  const view = (mode: 'visible' | 'hidden') => <MemoryRouter initialEntries={['/app/alunos/student/editar']}><Activity mode={mode}><Routes><Route path="/app/alunos/:id/editar" element={<RecordEditPage kind="students" />} /></Routes></Activity></MemoryRouter>
  const page = render(view('visible'))
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  request.mockResolvedValue({ ...record, name: 'Versão de outra sessão' })
  page.rerender(view('hidden')); page.rerender(view('visible'))
  await waitFor(() => expect(request.mock.calls.length).toBeGreaterThan(1))
  expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe('Ana')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await screen.findByText(/Este cadastro mudou em outra sessão/)
  expect(request.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
})

it.each([500, 502, 503, 504])('confirma o PUT concluído quando a resposta falha com %s, sem repetir a gravação', async (status) => {
  let server = structuredClone(record)
  request.mockImplementation(async (_path, init) => {
    if (init?.method === 'PUT') {
      server = { ...server, ...JSON.parse(String(init.body)), revision: 'new' }
      throw new ApiError('Resposta perdida', status)
    }
    return structuredClone(server)
  })
  show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await screen.findByText('Ficha atualizada')
  expect(request.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1)
  expect(sessionStorage.length).toBe(0)
})

it('recupera o recibo após recarregar quando PUT e conferência perderam a resposta', async () => {
  let server = structuredClone(record)
  let offline = false
  request.mockImplementation(async (_path, init) => {
    if (init?.method === 'PUT') { server = { ...server, ...JSON.parse(String(init.body)), revision: 'new' }; offline = true }
    if (offline) throw new ApiError('Sem conexão', 503)
    return structuredClone(server)
  })
  const first = show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await screen.findByText(/Não foi possível salvar o cadastro/)
  first.unmount(); offline = false; show()
  await userEvent.click(await screen.findByRole('button', { name: 'Conferir salvamento' }))
  await screen.findByText('Ficha atualizada')
  expect(request.mock.calls.filter(([, init]) => init?.method === 'PUT')).toHaveLength(1)
})


it('preserva a cópia nova e não envia PUT se a prechecagem antiga termina após navegação', async () => {
  let release!: (value: unknown) => void
  let gets = 0
  request.mockImplementation(async (_path, init) => {
    if (init?.method === 'PUT') return structuredClone(record)
    gets++
    if (gets === 2) return await new Promise((resolve) => { release = resolve })
    return structuredClone(record)
  })
  const first = show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(gets).toBe(2))
  first.unmount(); show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85977777777' } })
  const key = sessionStorage.key(0)!
  await act(async () => { release(structuredClone(record)) })
  expect(request.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
  expect(JSON.parse(sessionStorage.getItem(key)!).data.guardianPhone).toBe('(85) 97777-7777')
  expect((screen.getByLabelText('Telefone do responsável (obrigatório)') as HTMLInputElement).value).toBe('(85) 97777-7777')
})

it('um PUT antigo não remove o recibo nem navega a edição reaberta', async () => {
  let release!: () => void
  let server = structuredClone(record)
  request.mockImplementation(async (_path, init) => {
    if (init?.method === 'PUT') {
      await new Promise<void>((resolve) => { release = resolve })
      server = { ...server, ...JSON.parse(String(init.body)), revision: 'new' }
    }
    return structuredClone(server)
  })
  const first = show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(request.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true))
  first.unmount(); show()
  await screen.findByRole('button', { name: 'Conferir salvamento' })
  await act(async () => { release() })
  expect(sessionStorage.length).toBe(1)
  expect(screen.queryByText('Ficha atualizada')).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Conferir salvamento' }))
  await screen.findByText('Ficha atualizada')
  expect(sessionStorage.length).toBe(0)
})


it('retoma uma edição com PUT pendente após os efeitos reiniciarem', async () => {
  let release!: () => void
  let server = structuredClone(record)
  request.mockImplementation(async (_path, init) => {
    if (init?.method === 'PUT') {
      await new Promise<void>((resolve) => { release = resolve })
      server = { ...server, ...JSON.parse(String(init.body)), revision: 'new' }
    }
    return structuredClone(server)
  })
  const view = (mode: 'visible' | 'hidden') => <MemoryRouter initialEntries={['/app/alunos/student/editar']}><Activity mode={mode}><Routes>
    <Route path="/app/alunos/:id/editar" element={<RecordEditPage kind="students" />} />
    <Route path="/app/alunos/:id" element={<p>Ficha atualizada</p>} />
  </Routes></Activity></MemoryRouter>
  const page = render(view('visible'))
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(request.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(true))
  page.rerender(view('hidden'))
  await act(async () => { release() })
  page.rerender(view('visible'))
  await userEvent.click(await screen.findByRole('button', { name: 'Conferir salvamento' }))
  await screen.findByText('Ficha atualizada')
})


it('permite comparar a cópia preservada com a versão atual após conflito', async () => {
  const first = show()
  fireEvent.change(await screen.findByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  first.unmount()
  request.mockImplementation(async (path) => path === '/api/v1/catalogs' ? [] : { ...record, guardianPhone: '85977777777', revision: 'new' })
  show()
  await screen.findByRole('button', { name: 'Descartar edição anterior e usar dados atuais' })
  await userEvent.click(screen.getByText('Comparar minha cópia com os dados atuais'))
  expect(screen.getByText('(85) 98888-8888', { selector: 'td' })).toBeTruthy()
  expect(screen.getByText('(85) 97777-7777', { selector: 'td' })).toBeTruthy()
  expect(JSON.parse(sessionStorage.getItem(sessionStorage.key(0)!)!).data.guardianPhone).toBe('(85) 98888-8888')
  expect(request.mock.calls.some(([, init]) => init?.method === 'PUT')).toBe(false)
})
