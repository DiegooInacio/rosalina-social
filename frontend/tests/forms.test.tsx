import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentRegistrationForm } from '../src/features/student-registration/StudentRegistrationForm'
import { PopulationSurveyForm } from '../src/features/population-survey/PopulationSurveyForm'
import { createStudent } from '../src/features/student-registration/student.api'
import { createPopulationSurvey } from '../src/features/population-survey/population.api'
import { ApiError } from '../src/lib/api'

const activityId = '00000000-0000-4000-8000-000000000001'
vi.mock('../src/features/catalogs/useCatalog', () => ({
  useCatalog: () => ({ items: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Opção de teste' }], isLoading: false, hasError: false }),
}))
vi.mock('../src/features/student-registration/student.api', () => ({ createStudent: vi.fn() }))
vi.mock('../src/features/population-survey/population.api', () => ({ createPopulationSurvey: vi.fn() }))

function showForm(kind: 'student' | 'population') {
  return render(<MemoryRouter initialEntries={['/form']}>
    <Routes>
      <Route path="/form" element={kind === 'student' ? <StudentRegistrationForm /> : <PopulationSurveyForm />} />
      <Route path="/app" element={<p>Painel de cadastros</p>} />
    </Routes>
  </MemoryRouter>)
}

function fill(label: string | RegExp, value: string) {
  fireEvent.change(screen.getByLabelText(label), { target: { value } })
}

function fillStudent() {
  fill('Nome (obrigatório)', 'Aluno Teste')
  fill('Atividade matriculada (obrigatória)', activityId)
  fill('Data de nascimento (obrigatória)', '01/01/2010')
  fill('Telefone do responsável (obrigatório)', '85999999999')
  fill('Nome do responsável (obrigatório)', 'Responsável Teste')
}

beforeEach(() => {
  vi.mocked(createStudent).mockReset()
  vi.mocked(createPopulationSurvey).mockReset()
})

describe.each(['student', 'population'] as const)('RF15–RF18: %s', (kind) => {
  const submitLabel = kind === 'student' ? 'Salvar cadastro' : 'Salvar levantamento'

  it('impede envio inválido e preserva os outros dados preenchidos', async () => {
    showForm(kind)
    fill(kind === 'student' ? 'Cidade' : 'Nome social', 'Dado preservado')
    await userEvent.click(screen.getByRole('button', { name: submitLabel }))
    expect(await screen.findByText(/não foi salvo\. Revise/)).toBeTruthy()
    expect((screen.getByLabelText(kind === 'student' ? 'Cidade' : 'Nome social') as HTMLInputElement).value).toBe('Dado preservado')
    expect(createStudent).not.toHaveBeenCalled()
    expect(createPopulationSurvey).not.toHaveBeenCalled()
    expect(document.activeElement?.getAttribute('role')).toBe('alert')
    await userEvent.click(screen.getByRole('button', { name: 'Revisar primeiro campo com erro' }))
    expect(document.activeElement?.getAttribute('aria-invalid')).toBe('true')
  })

  it('só limpa dados, erros e integrantes após confirmar o descarte', async () => {
    showForm(kind)
    fill('Nome (obrigatório)', 'Nome preservado')
    if (kind === 'population') {
      await userEvent.click(screen.getByRole('button', { name: 'Adicionar integrante' }))
      fill('Nome completo (obrigatório)', 'Outro integrante')
    }
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
    expect(confirm).toHaveBeenCalledOnce()
    expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe('Nome preservado')
    if (kind === 'population') expect(screen.getByDisplayValue('Outro integrante')).toBeTruthy()

    // Produz erros e depois confirma a limpeza.
    fill(kind === 'student' ? 'E-mail do aluno' : 'E-mail', 'inválido')
    await userEvent.click(screen.getByRole('button', { name: submitLabel }))
    expect(await screen.findByText(/não foi salvo\. Revise/)).toBeTruthy()
    confirm.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
    expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe('')
    expect(screen.queryByRole('alert')).toBeNull()
    if (kind === 'population') expect(screen.queryByText('Integrante 1')).toBeNull()
  })

  it('permite desistir do cancelamento e só navega após confirmar', async () => {
    showForm(kind)
    fill('Nome (obrigatório)', 'Nome preservado')
    const confirm = vi.spyOn(window, 'confirm').mockReturnValue(false)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.queryByText('Painel de cadastros')).toBeNull()
    expect(screen.getByDisplayValue('Nome preservado')).toBeTruthy()
    confirm.mockReturnValue(true)
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByText('Painel de cadastros')).toBeTruthy()
  })

  it('não pede confirmação ao limpar ou cancelar um formulário intacto', async () => {
    showForm(kind)
    const confirm = vi.spyOn(window, 'confirm')
    await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
    await userEvent.click(screen.getByRole('button', { name: 'Cancelar' }))
    expect(await screen.findByText('Painel de cadastros')).toBeTruthy()
    expect(confirm).not.toHaveBeenCalled()
  })

  it('bloqueia alterações e duplicação do envio, e limpa somente após o sucesso', async () => {
    showForm(kind)
    type SavedSurvey = Awaited<ReturnType<typeof createPopulationSurvey>>
    let resolveRequest!: (value: SavedSurvey) => void
    const pending = new Promise<SavedSurvey>((resolve) => { resolveRequest = resolve })
    if (kind === 'student') {
      fillStudent()
      vi.mocked(createStudent).mockReturnValue(pending)
    } else {
      fill('Nome (obrigatório)', 'Responsável Teste')
      vi.mocked(createPopulationSurvey).mockReturnValue(pending)
    }
    await userEvent.dblClick(screen.getByRole('button', { name: submitLabel }))
    expect(screen.getByRole('button', { name: 'Salvando...' }).matches(':disabled')).toBe(true)
    expect(screen.getByLabelText('Nome (obrigatório)').matches(':disabled')).toBe(true)
    expect(screen.getByRole('button', { name: 'Limpar formulário' }).matches(':disabled')).toBe(true)
    expect(screen.getByDisplayValue(kind === 'student' ? 'Aluno Teste' : 'Responsável Teste')).toBeTruthy()
    expect(kind === 'student' ? createStudent : createPopulationSurvey).toHaveBeenCalledOnce()
    await act(async () => resolveRequest({ id: 'saved', financialSummary: { memberCount: 0, totalIncome: null, perCapitaIncome: null, incomeComplete: false } }))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe('')
    expect(screen.getByLabelText('Nome (obrigatório)').matches(':disabled')).toBe(false)
  })

  it('preserva o preenchimento em falha de rede e permite corrigir e reenviar', async () => {
    showForm(kind)
    if (kind === 'student') {
      fillStudent()
      vi.mocked(createStudent).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({})
    } else {
      fill('Nome (obrigatório)', 'Responsável Teste')
      vi.mocked(createPopulationSurvey).mockRejectedValueOnce(new TypeError('Failed to fetch')).mockResolvedValueOnce({ id: 'saved', financialSummary: { memberCount: 0, totalIncome: null, perCapitaIncome: null, incomeComplete: false } })
    }
    await userEvent.click(screen.getByRole('button', { name: submitLabel }))
    expect(await screen.findByText(/Não foi possível salvar/)).toBeTruthy()
    expect(screen.getByDisplayValue(kind === 'student' ? 'Aluno Teste' : 'Responsável Teste')).toBeTruthy()
    fill('Nome (obrigatório)', 'Nome corrigido')
    await userEvent.click(screen.getByRole('button', { name: submitLabel }))
    expect(await screen.findByRole('status')).toBeTruthy()
    const api = kind === 'student' ? vi.mocked(createStudent) : vi.mocked(createPopulationSurvey)
    expect(api).toHaveBeenCalledTimes(2)
    const request = api.mock.calls[1][0]
    expect('name' in request ? request.name : request.responsible.name).toBe('Nome corrigido')
  })
})

it('mostra erros da API junto ao CPF do aluno e ao familiar correto', async () => {
  showForm('student')
  fillStudent()
  // Sem pai/mãe, relatives[0] é o responsável.
  vi.mocked(createStudent).mockRejectedValue(new ApiError('Há campos inválidos.', 400, {
    cpf: 'CPF já cadastrado.', 'relatives[0].cpf': 'CPF do familiar inválido.',
  }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  expect(await screen.findByText('CPF já cadastrado.')).toBeTruthy()
  expect(screen.getByText('CPF do familiar inválido.')).toBeTruthy()
  expect(document.getElementById('guardian-cpf')?.getAttribute('aria-invalid')).toBe('true')
  expect(screen.getByDisplayValue('Aluno Teste')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Revisar primeiro campo com erro' }))
  expect(document.activeElement?.id).toBe('cpf')
})

it('mostra erros da API junto ao integrante sem apagar os demais', async () => {
  showForm('population')
  fill('Nome (obrigatório)', 'Responsável Teste')
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar responsável à família' }))
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar integrante' }))
  fireEvent.change(screen.getAllByLabelText('Nome completo (obrigatório)')[1], { target: { value: 'Outro integrante' } })
  vi.mocked(createPopulationSurvey).mockRejectedValue(new ApiError('Há campos inválidos.', 400, { 'members[1].documentNumber': 'Documento já utilizado.' }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar levantamento' }))
  expect(await screen.findByText('Documento já utilizado.')).toBeTruthy()
  expect(screen.getByDisplayValue('Outro integrante')).toBeTruthy()
  expect(screen.getAllByDisplayValue('Responsável Teste')).toHaveLength(2)
  await waitFor(() => expect(createPopulationSurvey).toHaveBeenCalledOnce())
})

it('atualiza campos condicionais sem apagar campos independentes antes do envio', async () => {
  showForm('population')
  fill('Nome (obrigatório)', 'Responsável Teste')
  fill('Trabalha', 'true')
  fill('Em que trabalha', 'Costura')
  fill('Recebe algum benefício', 'true')
  fill('Qual benefício recebe', 'Bolsa Família')
  fill('Trabalha', 'false')
  expect(screen.queryByLabelText('Em que trabalha')).toBeNull()
  expect(screen.getByDisplayValue('Bolsa Família')).toBeTruthy()
  fill('Trabalha', 'true')
  expect((screen.getByLabelText('Em que trabalha') as HTMLInputElement).value).toBe('')
  fill('Em que trabalha', 'Artesanato')

  fill('Tipo de moradia', 'ALUGADA')
  fill('Nome do proprietário', 'Proprietário Teste')
  fill('Tipo de moradia', 'PROPRIA')
  expect(screen.queryByLabelText('Nome do proprietário')).toBeNull()
  vi.mocked(createPopulationSurvey).mockResolvedValue({ id: 'saved', financialSummary: { memberCount: 0, totalIncome: null, perCapitaIncome: null, incomeComplete: false } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar levantamento' }))
  expect(await screen.findByRole('status')).toBeTruthy()
  const request = vi.mocked(createPopulationSurvey).mock.calls[0][0]
  expect(request.workAndBenefits).toMatchObject({ works: true, occupation: 'Artesanato', benefit: 'Bolsa Família' })
  expect(request.housing?.landlordName).toBeUndefined()
})

it('limpa somente os detalhes de patrimônio dependentes da resposta alterada', async () => {
  showForm('student')
  fillStudent()
  fill('Possui outros bens patrimoniais', 'true')
  fill('Possui veículo', 'true')
  fill('Recebe Bolsa Família', 'true')
  fill('Possui outros bens patrimoniais', 'false')
  expect(screen.queryByLabelText('Possui veículo')).toBeNull()
  expect((screen.getByLabelText('Recebe Bolsa Família') as HTMLSelectElement).value).toBe('true')
  vi.mocked(createStudent).mockResolvedValue({})
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  expect(await screen.findByRole('status')).toBeTruthy()
  expect(vi.mocked(createStudent).mock.calls[0][0].socioeconomic).toMatchObject({
    hasOtherAssets: false, hasVehicle: undefined, hasOtherProperty: undefined, receivesBolsaFamilia: true,
  })
})
