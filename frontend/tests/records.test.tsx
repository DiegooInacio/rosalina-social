import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { apiRequest, ApiError } from '../src/lib/api'
import { RecordListPage } from '../src/features/records/RecordListPage'
import { RecordDetailsPage } from '../src/features/records/RecordDetailsPage'
import { AppRoutes } from '../src/app/router'
import { displayValue } from '../src/features/records/record-display'

vi.mock('../src/lib/api', async (original) => ({ ...await original<typeof import('../src/lib/api')>(), apiRequest: vi.fn(), verifySession: vi.fn(async (token: string) => token) }))
const request = vi.mocked(apiRequest)
const student = { id: 'student-1', name: 'Ana Silva', status: 'ATIVO', cpf: '***.***.247-**', activity: 'Capoeira', birthDate: '2015-05-20' }
const survey = { id: 'survey-1', responsibleName: 'Maria Silva', referenceDate: '2026-01-01', updatedAt: '2026-01-02T12:00:00Z' }
const page = (content: unknown[], number = 0, totalPages = 1) => ({ content, number, totalPages, totalElements: totalPages > 1 ? 21 : content.length })
function show(kind: 'students' | 'population-surveys', url?: string) {
  const base = kind === 'students' ? '/app/alunos' : '/app/levantamentos'
  return render(<MemoryRouter initialEntries={[url ?? base]}><Routes>
    <Route path={base} element={<RecordListPage kind={kind} />} />
    <Route path={`${base}/:id`} element={<RecordDetailsPage kind={kind} />} />
  </Routes></MemoryRouter>)
}
function section(title: string) {
  return within(screen.getByRole('heading', { name: title }).closest('section')!)
}
function detailValue(title: string, label: string) {
  return section(title).getByText(label, { selector: 'dt' }).nextElementSibling?.textContent
}
beforeEach(() => { request.mockReset(); localStorage.clear(); sessionStorage.clear() })
afterEach(() => { localStorage.clear(); sessionStorage.clear() })

it('lista alunos, pagina, busca por nome/CPF/situação e mantém filtros ao voltar da ficha', async () => {
  request.mockImplementation(async (path) => {
    const url = new URL(path, 'http://localhost')
    if (url.pathname.endsWith('/student-1')) return { ...student, cpf: '52998224725', activity: { name: 'Capoeira' }, relatives: [] }
    return page([student], Number(url.searchParams.get('page') ?? 0), 2)
  })
  show('students')
  expect(await screen.findByText('Ana Silva')).toBeTruthy()
  expect(screen.getByText('***.***.247-**')).toBeTruthy()
  expect(screen.getByText('20/05/2015')).toBeTruthy()
  expect((screen.getByRole('button', { name: 'Anterior' }) as HTMLButtonElement).disabled).toBe(true)
  await userEvent.click(screen.getByRole('button', { name: 'Próxima' }))
  await screen.findByText('Página 2 de 2')
  fireEvent.change(screen.getByLabelText('Nome do aluno'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText('CPF completo'), { target: { value: '52998224725' } })
  await userEvent.selectOptions(screen.getByLabelText('Situação'), 'ATIVO')
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() => expect(request.mock.calls.some(([path]) => path.includes('name=Ana') && path.includes('cpf=52998224725') && path.includes('status=ATIVO') && path.includes('page=0'))).toBe(true))
  await userEvent.click(await screen.findByRole('link', { name: 'Ver ficha de Ana Silva' }))
  await screen.findByRole('heading', { name: 'Ana Silva', level: 1 })
  expect(screen.getByText('529.982.247-25')).toBeTruthy()
  await userEvent.click(screen.getByRole('link', { name: /Voltar para alunos/ }))
  await screen.findByText('Ana Silva')
  expect((screen.getByLabelText('Nome do aluno') as HTMLInputElement).value).toBe('Ana')
  expect((screen.getByLabelText('Situação') as HTMLSelectElement).value).toBe('ATIVO')
})

it('lista levantamentos e pesquisa pelo responsável sem enviar filtro de situação', async () => {
  request.mockResolvedValue(page([survey]))
  show('population-surveys')
  await screen.findByText('Maria Silva')
  expect(screen.getByText('01/01/2026')).toBeTruthy()
  expect(screen.queryByLabelText('Situação')).toBeNull()
  fireEvent.change(screen.getByLabelText('Nome do responsável'), { target: { value: 'Maria' } })
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await waitFor(() => expect(request.mock.calls.some(([path]) => path === '/api/v1/population-surveys?page=0&size=20&name=Maria')).toBe(true))
})

it('valida CPF completo e limpa também filtros digitados ainda não enviados', async () => {
  request.mockResolvedValue(page([]))
  show('students')
  await screen.findByText(/Nenhum cadastro concluído/)
  fireEvent.change(screen.getByLabelText('Nome do aluno'), { target: { value: 'Ana' } })
  fireEvent.change(screen.getByLabelText('CPF completo'), { target: { value: '123' } })
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  expect(await screen.findByText('Informe um CPF válido com 11 dígitos.')).toBeTruthy()
  expect(request).toHaveBeenCalledOnce()
  await userEvent.click(screen.getByRole('button', { name: 'Limpar filtros' }))
  expect((screen.getByLabelText('Nome do aluno') as HTMLInputElement).value).toBe('')
  expect((screen.getByLabelText('CPF completo') as HTMLInputElement).value).toBe('')
  expect(screen.queryByText('Informe um CPF válido com 11 dígitos.')).toBeNull()
})

it('mostra falha de consulta e permite nova tentativa', async () => {
  request.mockRejectedValueOnce(new ApiError('Servidor indisponível.', 503)).mockResolvedValue(page([student]))
  show('students')
  expect(await screen.findByRole('alert')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }))
  expect(await screen.findByText('Ana Silva')).toBeTruthy()
})

it('ignora resposta atrasada de uma busca anterior', async () => {
  let release!: (value: unknown) => void
  request.mockImplementationOnce(() => new Promise((resolve) => { release = resolve })).mockResolvedValue(page([student]))
  show('students')
  fireEvent.change(screen.getByLabelText('Nome do aluno'), { target: { value: 'Ana' } })
  await userEvent.click(screen.getByRole('button', { name: 'Buscar' }))
  await screen.findByText('Ana Silva')
  await act(async () => release(page([{ ...student, name: 'Busca antiga' }])))
  expect(screen.queryByText('Busca antiga')).toBeNull()
  expect(screen.getByText('Ana Silva')).toBeTruthy()
})

it('exibe todos os grupos da ficha de aluno, ordena família e distingue Não de zero', async () => {
  request.mockResolvedValue({ ...student, activity: { id: 'activity', name: 'Capoeira' }, cpf: '52998224725',
    relatives: [{ type: 'PAI', name: 'José' }, { type: 'MAE', name: 'Maria', literate: false }],
    socioeconomic: { hasWaterSupply: false, hasSewage: true, householdIncome: 0 }, address: 'Rua A', city: 'Fortaleza' })
  show('students', '/app/alunos/student-1')
  await screen.findByRole('heading', { level: 1, name: 'Ana Silva' })
  expect(section('Identificação do aluno').getByText('Capoeira')).toBeTruthy()
  expect(detailValue('Situação socioeconômica', 'Água')).toBe('Não')
  expect(detailValue('Situação socioeconômica', 'Esgoto')).toBe('Sim')
  expect(detailValue('Situação socioeconômica', 'Renda familiar mensal')).toMatch(/R\$\s*0,00/)
  expect(detailValue('Situação socioeconômica', 'Veículo')).toBe('Não informado')
  const titles = screen.getAllByRole('heading', { level: 2 }).map((heading) => heading.textContent)
  expect(titles.indexOf('Mãe · referência familiar')).toBeLessThan(titles.indexOf('Pai'))
})

it('exibe ficha do levantamento, resolve catálogos inativos e mantém renda desconhecida', async () => {
  request.mockImplementation(async (path) => path === '/api/v1/catalogs'
    ? [{ id: 'education-id', name: 'Ensino médio', active: false }]
    : { id: 'survey-1', status: 'COMPLETED', referenceDate: '2026-01-01', responsible: { name: 'Maria Silva', educationId: 'education-id' },
      housing: { electricity: false }, health: { allergies: 'Amendoim' }, members: [{ id: 'member', name: 'Maria Silva', isResponsible: true, income: 0 }],
      financialSummary: { memberCount: 1, incomeComplete: false, totalIncome: null, perCapitaIncome: null },
      authorizations: { imageAndSound: false, personalData: true }, declaration: { registrarSignatureName: 'Ana' } })
  show('population-surveys', '/app/levantamentos/survey-1')
  await screen.findByRole('heading', { level: 1, name: 'Maria Silva' })
  expect(await screen.findByText('Ensino médio')).toBeTruthy()
  expect(screen.queryByText('education-id')).toBeNull()
  expect(detailValue('Autorizações', 'Uso de imagem e som')).toBe('Não autorizado')
  expect(detailValue('Autorizações', 'Tratamento de dados pessoais')).toBe('Autorizado')
  expect(detailValue('Resumo financeiro', 'Renda total')).toBe('Não informado')
  expect(detailValue('Integrante 1 · Maria Silva', 'Renda mensal')).toMatch(/R\$\s*0,00/)
  expect(section('Saúde').getByText('Amendoim')).toBeTruthy()
  expect(section('Declaração e assinaturas').getByText('Ana')).toBeTruthy()
})

it('mantém ficha disponível se apenas a consulta de catálogos falhar', async () => {
  request.mockImplementation(async (path) => { if (path === '/api/v1/catalogs') throw new ApiError('Offline', 503); return { responsible: { name: 'Maria Silva', educationId: 'missing' }, members: [] } })
  show('population-surveys', '/app/levantamentos/survey-1')
  await screen.findByRole('heading', { level: 1, name: 'Maria Silva' })
  expect(await screen.findByText(/Não foi possível carregar os nomes/)).toBeTruthy()
  expect(screen.getByText('Opção não localizada')).toBeTruthy()
})

it('trata cadastro inexistente com volta para a lista', async () => {
  request.mockRejectedValue(new ApiError('Aluno não encontrado.', 404))
  show('students', '/app/alunos/missing')
  await screen.findByRole('heading', { name: 'Cadastro não encontrado' })
  expect(screen.getByRole('link', { name: /Voltar para alunos/ }).getAttribute('href')).toMatch(/^\/app\/alunos\??$/)
})

it('integra as consultas no menu e na visão geral para usuário autenticado', async () => {
  localStorage.setItem('rosalina.accessToken', 'session')
  render(<MemoryRouter initialEntries={['/app']}><AppRoutes /></MemoryRouter>)
  await waitFor(() => expect(screen.getAllByRole('link', { name: /^Alunos cadastrados/ })).toHaveLength(2))
  expect(screen.getAllByRole('link', { name: /^Levantamentos cadastrados/ })).toHaveLength(2)
  request.mockResolvedValue(page([student]))
  await userEvent.click(screen.getAllByRole('link', { name: /^Alunos cadastrados/ })[0])
  expect(await screen.findByText('Ana Silva')).toBeTruthy()
})

it('formata valores opcionais sem confundir zero, falso e ausência', () => {
  expect(displayValue(false)).toBe('Não')
  expect(displayValue(0)).toBe('0')
  expect(displayValue(null, 'money')).toBe('Não informado')
  expect(displayValue('2026-01-01', 'date')).toBe('01/01/2026')
})
