import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { StudentRegistrationForm } from '../src/features/student-registration/StudentRegistrationForm'
import { PopulationSurveyForm } from '../src/features/population-survey/PopulationSurveyForm'
import { createStudent } from '../src/features/student-registration/student.api'
import { createPopulationSurvey } from '../src/features/population-survey/population.api'
import { lookupCep, type CepResult } from '../src/lib/cep'
import { ApiError } from '../src/lib/api'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

const activityId = '00000000-0000-4000-8000-000000000001'
vi.mock('../src/features/catalogs/useCatalog', () => ({
  useCatalog: () => ({ items: [{ id: '00000000-0000-4000-8000-000000000001', name: 'Opção de teste' }], isLoading: false, hasError: false }),
}))
vi.mock('../src/features/student-registration/student.api', () => ({ createStudent: vi.fn() }))
vi.mock('../src/lib/cep', () => ({ lookupCep: vi.fn() }))
vi.mock('../src/features/population-survey/population.api', () => ({ createPopulationSurvey: vi.fn() }))
// Estes testes isolam validação e ações do formulário. A sessão real de rascunho
// é exercitada, com chamadas HTTP simuladas, em drafts.test.tsx.
vi.mock('../src/features/drafts/useFormDraft', () => ({
  useFormDraft: (type: string, methods: UseFormReturn<FieldValues>, defaults: () => FieldValues) => ({
    phase: 'ready', saveState: 'idle', choices: [], hasLocal: false, hasDraft: false,
    action: 'none', uncertain: false, error: '', canEdit: true, canSubmit: true,
    flush: async () => true,
    discard: async () => { methods.reset(defaults()); return true },
    complete: async (submission: object) => {
      if (type === 'STUDENT') await createStudent(submission as Parameters<typeof createStudent>[0])
      else await createPopulationSurvey(submission as Parameters<typeof createPopulationSurvey>[0])
      methods.reset(defaults())
      return { draftId: 'draft', formType: type, recordId: 'saved' }
    },
  }),
}))

function showForm(kind: 'student' | 'population') {
  return render(<MemoryRouter initialEntries={['/form']}>
    <Routes>
      <Route path="/form" element={kind === 'student' ? <StudentRegistrationForm /> : <PopulationSurveyForm />} />
      <Route path="/app" element={<p>Painel de cadastros</p>} />
    </Routes>
  </MemoryRouter>)
}

function fill(label: string | RegExp, value: string) {
  const group = screen.queryByRole('group', { name: label })
  if (group) {
    const radio = within(group).getAllByRole('radio').find((option) => (option as HTMLInputElement).value === value)
    if (!radio) throw new Error(`Opção ${value} não encontrada.`)
    fireEvent.click(radio)
  } else {
    fireEvent.change(screen.getByLabelText(label), { target: { value } })
  }
}

function fillStudent() {
  fill('Nome (obrigatório)', 'Aluno Teste')
  fill('Atividade matriculada (obrigatória)', activityId)
  fill('Data de nascimento (obrigatória)', '01/01/2010')
  fill('Telefone do responsável (obrigatório)', '85999999999')
  fill('Nome do responsável (obrigatório)', 'Responsável Teste')
}

beforeEach(() => {
  vi.mocked(lookupCep).mockReset().mockResolvedValue({ status: 'found', address: { street: 'Rua Teste', neighborhood: 'Centro', city: 'Fortaleza', state: 'CE' } })
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
    expect(screen.getAllByRole('radio').every((radio) => radio.matches(':disabled'))).toBe(true)
    expect(screen.getByRole('button', { name: 'Limpar formulário' }).matches(':disabled')).toBe(true)
    expect(screen.getByDisplayValue(kind === 'student' ? 'Aluno Teste' : 'Responsável Teste')).toBeTruthy()
    expect(kind === 'student' ? createStudent : createPopulationSurvey).toHaveBeenCalledOnce()
    await act(async () => resolveRequest({ id: 'saved', financialSummary: { memberCount: 0, totalIncome: null, perCapitaIncome: null, incomeComplete: false } }))
    expect(await screen.findByRole('status')).toBeTruthy()
    expect((screen.getByLabelText('Nome (obrigatório)') as HTMLInputElement).value).toBe('')
    expect(screen.getByLabelText('Nome (obrigatório)').matches(':disabled')).toBe(false)
    expect(screen.getAllByRole('radio').some((radio) => radio.matches(':disabled'))).toBe(false)
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
  expect(screen.queryByRole('group', { name: 'Possui veículo' })).toBeNull()
  expect((within(screen.getByRole('group', { name: 'Recebe Bolsa Família' })).getByRole('radio', { name: 'Sim', checked: true }) as HTMLInputElement).value).toBe('true')
  vi.mocked(createStudent).mockResolvedValue({})
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  expect(await screen.findByRole('status')).toBeTruthy()
  expect(vi.mocked(createStudent).mock.calls[0][0].socioeconomic).toMatchObject({
    hasOtherAssets: false, hasVehicle: undefined, hasOtherProperty: undefined, receivesBolsaFamilia: true,
  })
})

it('distingue Não de Não informado e mantém autorizações independentes nas opções visíveis', async () => {
  showForm('population')
  fill('Nome (obrigatório)', 'Responsável Teste')
  const work = within(screen.getByRole('group', { name: 'Trabalha' }))
  expect(work.getByRole('radio', { name: 'Não informado', checked: true })).toBeTruthy()
  await userEvent.click(work.getByRole('radio', { name: 'Sim' }))
  fill('Em que trabalha', 'Costura')
  await userEvent.click(work.getByRole('radio', { name: 'Não' }))
  expect(screen.queryByLabelText('Em que trabalha')).toBeNull()
  await userEvent.click(within(screen.getByRole('group', { name: 'Uso de imagem e som' })).getByRole('radio', { name: 'Não autorizo' }))
  expect(within(screen.getByRole('group', { name: 'Tratamento de dados pessoais' })).getByRole('radio', { name: 'Não informado', checked: true })).toBeTruthy()
  await userEvent.click(within(screen.getByRole('group', { name: 'Tratamento de dados pessoais' })).getByRole('radio', { name: 'Autorizo' }))
  vi.mocked(createPopulationSurvey).mockRejectedValue(new Error('Falha de rede'))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar levantamento' }))
  expect(await screen.findByText(/Não foi possível salvar/)).toBeTruthy()
  expect(vi.mocked(createPopulationSurvey).mock.calls[0][0].workAndBenefits?.works).toBe(false)
  expect(vi.mocked(createPopulationSurvey).mock.calls[0][0].authorizations).toEqual({ imageAndSound: false, personalData: true })

  await userEvent.click(work.getByRole('radio', { name: 'Não informado' }))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar levantamento' }))
  await waitFor(() => expect(createPopulationSurvey).toHaveBeenCalledTimes(2))
  expect(vi.mocked(createPopulationSurvey).mock.calls[1][0].workAndBenefits).toBeUndefined()
  vi.spyOn(window, 'confirm').mockReturnValue(true)
  await userEvent.click(screen.getByRole('button', { name: 'Limpar formulário' }))
  expect(work.getByRole('radio', { name: 'Não informado', checked: true })).toBeTruthy()
  expect(within(screen.getByRole('group', { name: 'Uso de imagem e som' })).getByRole('radio', { name: 'Não informado', checked: true })).toBeTruthy()
})


it('aceita a CIN no CPF do aluno e dos familiares sem exigir RG', async () => {
  showForm('student')
  fillStudent()
  const cpfs = screen.getAllByLabelText('CPF')
  fireEvent.change(cpfs[0], { target: { value: '52998224725' } })
  fireEvent.change(screen.getByLabelText('Nome do responsável (obrigatório)').closest('details')!.querySelector('[id=guardian-cpf]')!, { target: { value: '11144477735' } })
  const hintId = cpfs[0].getAttribute('aria-describedby')!
  expect(document.getElementById(hintId)?.textContent).toContain('Carteira de Identidade Nacional (CIN)')
  expect(screen.getAllByLabelText('RG antigo (opcional)').every((input) => (input as HTMLInputElement).value === '')).toBe(true)
  vi.mocked(createStudent).mockResolvedValue({})
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await waitFor(() => expect(createStudent).toHaveBeenCalledOnce())
  const request = vi.mocked(createStudent).mock.calls[0][0]
  expect(request.cpf).toBe('529.982.247-25')
  expect(request.rg).toBeUndefined()
  expect(request.relatives.at(-1)).toMatchObject({ cpf: '111.444.777-35', rg: undefined })
})

it('envia CPF/CIN uma vez por pessoa e permite preencher ou apagar o RG antigo', async () => {
  showForm('population')
  fill('Nome (obrigatório)', 'Responsável Teste')
  fill('CPF', '52998224725')
  fill('RG antigo (opcional)', 'AB-123')
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar responsável à família' }))
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar integrante' }))
  const member = within(screen.getByRole('group', { name: 'Integrante 2' }))
  fireEvent.change(member.getByLabelText('Nome completo (obrigatório)'), { target: { value: 'Outro integrante' } })
  fireEvent.change(member.getByLabelText('CPF'), { target: { value: '11144477735' } })
  expect((member.getByLabelText('CPF') as HTMLInputElement).value).toBe('111.444.777-35')
  expect(screen.queryByLabelText('Tipo de documento')).toBeNull()
  vi.mocked(createPopulationSurvey).mockRejectedValue(new Error('Falha de rede'))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar levantamento' }))
  await waitFor(() => expect(createPopulationSurvey).toHaveBeenCalledOnce())
  const request = vi.mocked(createPopulationSurvey).mock.calls[0][0]
  expect(request.responsible).toMatchObject({ cpf: '529.982.247-25', documentType: 'RG', documentNumber: 'AB-123' })
  expect(request.members).toEqual(expect.arrayContaining([
    expect.objectContaining({ documentType: 'CPF', documentNumber: '529.982.247-25' }),
    expect.objectContaining({ documentType: 'CPF', documentNumber: '111.444.777-35' }),
  ]))
  fill('RG antigo (opcional)', '')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar levantamento' }))
  await waitFor(() => expect(createPopulationSurvey).toHaveBeenCalledTimes(2))
  expect(vi.mocked(createPopulationSurvey).mock.calls[1][0].responsible).toMatchObject({ documentType: undefined, documentNumber: undefined })
})


it('atualiza erros após corrigir nome e telefone, preservando os valores enviados', async () => {
  showForm('student')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  expect(await screen.findByText('Informe o nome do responsável.')).toBeTruthy()
  expect(screen.getByText('Informe o telefone do responsável.')).toBeTruthy()
  fillStudent()
  fill('Telefone do responsável (obrigatório)', '95001239123')
  await waitFor(() => expect(screen.queryByText('Informe o nome do responsável.')).toBeNull())
  expect(await screen.findByText(/O celular deve começar com 9 depois do DDD/)).toBeTruthy()
  expect(screen.queryByText('Informe o telefone do responsável.')).toBeNull()
  fill('Telefone do responsável (obrigatório)', '85999999999')
  await waitFor(() => expect(screen.getByLabelText('Telefone do responsável (obrigatório)').getAttribute('aria-invalid')).toBe('false'))
  vi.mocked(createStudent).mockResolvedValue({})
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await waitFor(() => expect(createStudent).toHaveBeenCalledOnce())
  expect(vi.mocked(createStudent).mock.calls[0][0]).toMatchObject({ guardianPhone: '(85) 99999-9999', relatives: [expect.objectContaining({ name: 'Responsável Teste' })] })
})

it.each(['student', 'population'] as const)('aceita somente dígitos nos documentos numéricos de %s', async (kind) => {
  showForm(kind)
  const input = screen.getByLabelText('NIS')
  await userEvent.type(input, 'ab123cd45')
  expect((input as HTMLInputElement).value).toBe('12345')
  await userEvent.clear(input)
  await userEvent.click(input)
  await userEvent.paste('abc 123.456-789')
  expect((input as HTMLInputElement).value).toBe('123456789')
  if (kind === 'student') {
    const cns = screen.getByLabelText('Cartão Nacional de Saúde')
    await userEvent.type(cns, 'abc123def')
    expect((cns as HTMLInputElement).value).toBe('123')
  }
})

describe.each(['student', 'population'] as const)('consulta de CEP: %s', (kind) => {
  const submit = kind === 'student' ? 'Salvar cadastro' : 'Salvar levantamento'
  function validForm() {
    showForm(kind)
    if (kind === 'student') fillStudent()
    else fill('Nome (obrigatório)', 'Responsável Teste')
  }

  it('consulta ao completar 8 dígitos e preenche os campos de endereço', async () => {
    validForm()
    fill('CEP', '60744')
    await new Promise((resolve) => setTimeout(resolve, 400))
    expect(lookupCep).not.toHaveBeenCalled()
    fill('CEP', '60744390')
    expect((screen.getByLabelText('CEP') as HTMLInputElement).value).toBe('60744-390')
    await waitFor(() => expect((screen.getByLabelText('Cidade') as HTMLInputElement).value).toBe('Fortaleza'))
    expect((screen.getByLabelText(kind === 'student' ? 'Endereço' : 'Rua') as HTMLInputElement).value).toBe('Rua Teste')
    expect((screen.getByLabelText('Bairro') as HTMLInputElement).value).toBe('Centro')
    if (kind === 'population') expect((screen.getByLabelText('UF') as HTMLSelectElement).value).toBe('CE')
  })

  it('oferece a substituição do endereço manual e só troca ao clicar', async () => {
    validForm()
    const streetLabel = kind === 'student' ? 'Endereço' : 'Rua'
    fill(streetLabel, 'Rua preenchida manualmente')
    fill('Bairro', 'Bairro informado')
    if (kind === 'student') fill('Ponto de referência', 'Perto da praça')
    else { fill('Número', '42'); fill('Complemento', 'Casa B') }
    fill('CEP', '60744390')
    const replace = await screen.findByRole('button', { name: 'Usar endereço do CEP' })
    expect(screen.getByText('O endereço encontrado para este CEP é diferente do preenchido.')).toBeTruthy()
    expect(screen.getByText(/Encontrado: Rua Teste/)).toBeTruthy()
    expect((screen.getByLabelText(streetLabel) as HTMLInputElement).value).toBe('Rua preenchida manualmente')
    expect((screen.getByLabelText('Bairro') as HTMLInputElement).value).toBe('Bairro informado')
    await userEvent.click(replace)
    expect((screen.getByLabelText(streetLabel) as HTMLInputElement).value).toBe('Rua Teste')
    expect((screen.getByLabelText('Bairro') as HTMLInputElement).value).toBe('Centro')
    expect(screen.queryByRole('button', { name: 'Usar endereço do CEP' })).toBeNull()
    if (kind === 'student') expect((screen.getByLabelText('Ponto de referência') as HTMLInputElement).value).toBe('Perto da praça')
    else {
      expect((screen.getByLabelText('Número') as HTMLInputElement).value).toBe('42')
      expect((screen.getByLabelText('Complemento') as HTMLInputElement).value).toBe('Casa B')
    }
    // O aviso acompanha edições posteriores e some ao mudar o CEP.
    fill(streetLabel, 'Outra rua')
    expect(await screen.findByRole('button', { name: 'Usar endereço do CEP' })).toBeTruthy()
    fill('CEP', '60744')
    expect(screen.queryByRole('button', { name: 'Usar endereço do CEP' })).toBeNull()
  })

  it('preserva rua e bairro quando o CEP retorna somente a cidade', async () => {
    validForm()
    const streetLabel = kind === 'student' ? 'Endereço' : 'Rua'
    fill(streetLabel, 'Rua manual')
    fill('Bairro', 'Bairro manual')
    fill('Cidade', 'Outra cidade')
    vi.mocked(lookupCep).mockResolvedValue({ status: 'found', address: { street: '', neighborhood: '', city: 'Fortaleza', state: 'CE' } })
    fill('CEP', '60744390')
    await userEvent.click(await screen.findByRole('button', { name: 'Usar endereço do CEP' }))
    expect((screen.getByLabelText('Cidade') as HTMLInputElement).value).toBe('Fortaleza')
    expect((screen.getByLabelText(streetLabel) as HTMLInputElement).value).toBe('Rua manual')
    expect((screen.getByLabelText('Bairro') as HTMLInputElement).value).toBe('Bairro manual')
  })

  it('inclui o endereço consultado mesmo ao salvar imediatamente após preencher o CEP', async () => {
    validForm()
    fill('CEP', '60744390')
    await userEvent.click(screen.getByRole('button', { name: submit }))
    await waitFor(() => expect(kind === 'student' ? createStudent : createPopulationSurvey).toHaveBeenCalledOnce())
    if (kind === 'student') expect(vi.mocked(createStudent).mock.calls[0][0]).toMatchObject({ address: 'Rua Teste', neighborhood: 'Centro', city: 'Fortaleza' })
    else expect(vi.mocked(createPopulationSurvey).mock.calls[0][0].address).toMatchObject({ street: 'Rua Teste', neighborhood: 'Centro', city: 'Fortaleza', state: 'CE' })
  })

  it('impede conclusão com CEP inexistente e permite corrigir sem perder dados', async () => {
    validForm()
    vi.mocked(lookupCep).mockResolvedValue({ status: 'not-found' })
    fill('CEP', '99999999')
    await screen.findByText('CEP não encontrado. Confira os 8 dígitos informados.')
    await userEvent.click(screen.getByRole('button', { name: submit }))
    expect(await screen.findByText(/não foi salvo. Confira o CEP informado/)).toBeTruthy()
    expect(createStudent).not.toHaveBeenCalled()
    expect(createPopulationSurvey).not.toHaveBeenCalled()
    vi.mocked(lookupCep).mockResolvedValue({ status: 'found', address: { street: '', neighborhood: '', city: 'Fortaleza', state: 'CE' } })
    fill('CEP', '60744390')
    await waitFor(() => expect(screen.queryByText('CEP não encontrado. Confira os 8 dígitos informados.')).toBeNull())
    expect(screen.getByLabelText('Nome (obrigatório)')).toBeTruthy()
    await userEvent.click(screen.getByRole('button', { name: submit }))
    await waitFor(() => expect(kind === 'student' ? createStudent : createPopulationSurvey).toHaveBeenCalledOnce())
  })

  it('permite endereço manual se a consulta estiver indisponível e oferece nova tentativa', async () => {
    validForm()
    vi.mocked(lookupCep).mockResolvedValue({ status: 'unavailable' })
    fill('CEP', '60744390')
    expect(await screen.findByText(/Você pode preencher o endereço manualmente/)).toBeTruthy()
    expect(screen.getByRole('button', { name: 'Tentar consultar CEP novamente' })).toBeTruthy()
    fill('Cidade', 'Fortaleza')
    await userEvent.click(screen.getByRole('button', { name: submit }))
    await waitFor(() => expect(kind === 'student' ? createStudent : createPopulationSurvey).toHaveBeenCalledOnce())
  })

  it('ignora resposta de CEP anterior e preserva endereço editado durante a consulta', async () => {
    validForm()
    let resolveFirst!: (result: CepResult) => void
    vi.mocked(lookupCep).mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve }))
    fill('CEP', '01001000')
    await waitFor(() => expect(lookupCep).toHaveBeenCalledOnce())
    fill('CEP', '60744390')
    fill(kind === 'student' ? 'Endereço' : 'Rua', 'Rua digitada manualmente, 10')
    await waitFor(() => expect((screen.getByLabelText('Cidade') as HTMLInputElement).value).toBe('Fortaleza'))
    await act(async () => resolveFirst({ status: 'found', address: { street: 'Praça da Sé', neighborhood: 'Sé', city: 'São Paulo', state: 'SP' } }))
    expect((screen.getByLabelText('Cidade') as HTMLInputElement).value).toBe('Fortaleza')
    expect((screen.getByLabelText(kind === 'student' ? 'Endereço' : 'Rua') as HTMLInputElement).value).toBe('Rua digitada manualmente, 10')
  })
})


it('abre a mãe inicialmente, recolhe pai/responsável e mantém os dados ao esconder', async () => {
  showForm('student')
  const mother = screen.getByLabelText('Nome da mãe').closest('details')!
  const father = screen.getByLabelText('Nome do pai').closest('details')!
  const guardian = screen.getByLabelText('Nome do responsável (obrigatório)').closest('details')!
  expect([mother, father, guardian].map((details) => details.open)).toEqual([true, false, false])
  expect(Array.from(mother.parentElement!.querySelectorAll('details'))).toEqual([mother, father, guardian])
  fill('Nome da mãe', 'Maria')
  expect(await screen.findByText('Referência familiar: mãe.')).toBeTruthy()
  expect(screen.getByLabelText('Nome do responsável').getAttribute('aria-required')).toBe('false')
  await userEvent.click(mother.querySelector('summary')!)
  expect(mother.open).toBe(false)
  await userEvent.click(mother.querySelector('summary')!)
  expect((screen.getByLabelText('Nome da mãe') as HTMLInputElement).value).toBe('Maria')
  await userEvent.click(father.querySelector('summary')!)
  fill('Nome do pai', 'João')
  expect(screen.getByText('Referência familiar: mãe.')).toBeTruthy()
  fill('Nome da mãe', '')
  expect(await screen.findByText('Referência familiar: pai.')).toBeTruthy()
})

it.each(['mother', 'father'] as const)('salva cadastro com apenas %s e sem outro responsável', async (person) => {
  showForm('student')
  fill('Nome (obrigatório)', 'Aluno Teste')
  fill('Atividade matriculada (obrigatória)', activityId)
  fill('Data de nascimento (obrigatória)', '01/01/2010')
  fill('Telefone do responsável (obrigatório)', '85999999999')
  const input = screen.getByLabelText(person === 'mother' ? 'Nome da mãe' : 'Nome do pai')
  if (person === 'father') await userEvent.click(input.closest('details')!.querySelector('summary')!)
  fireEvent.change(input, { target: { value: 'Pessoa informada' } })
  vi.mocked(createStudent).mockResolvedValue({})
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await waitFor(() => expect(createStudent).toHaveBeenCalledOnce())
  expect(vi.mocked(createStudent).mock.calls[0][0].relatives).toEqual([expect.objectContaining({ type: person === 'mother' ? 'MAE' : 'PAI', name: 'Pessoa informada' })])
})

it('abre a seção recolhida que contém um erro e permite corrigi-lo', async () => {
  showForm('student')
  const guardian = screen.getByLabelText('Nome do responsável (obrigatório)').closest('details')!
  expect(guardian.open).toBe(false)
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await screen.findByText('Informe o nome do responsável.')
  expect(guardian.open).toBe(true)
})

it('envia água, esgoto e coleta de lixo como booleanos independentes', async () => {
  showForm('student'); fillStudent()
  for (const label of ['Água', 'Esgoto', 'Coleta de lixo']) {
    expect(screen.queryByRole('combobox', { name: label })).toBeNull()
    expect(within(screen.getByRole('group', { name: label })).getByRole('radio', { name: 'Não informado', checked: true })).toBeTruthy()
  }
  fill('Água', 'true'); fill('Esgoto', 'false'); fill('Coleta de lixo', 'true')
  vi.mocked(createStudent).mockRejectedValue(new Error('Falha de rede'))
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await waitFor(() => expect(createStudent).toHaveBeenCalledOnce())
  expect(vi.mocked(createStudent).mock.calls[0][0].socioeconomic).toMatchObject({ hasWaterSupply: true, hasSewage: false, hasGarbageCollection: true, waterSupplyId: undefined, sewageId: undefined, garbageCollectionId: undefined })
  fill('Água', '')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await waitFor(() => expect(createStudent).toHaveBeenCalledTimes(2))
  expect(vi.mocked(createStudent).mock.calls[1][0].socioeconomic?.hasWaterSupply).toBeUndefined()
})

it('oferece parentescos padronizados e envia a opção escolhida', async () => {
  showForm('student'); fillStudent()
  const select = screen.getByRole('combobox', { name: 'Grau de parentesco', hidden: true })
  const guardian = select.closest('details')!
  if (!guardian.open) await userEvent.click(guardian.querySelector('summary')!)
  for (const label of ['Mãe', 'Pai', 'Avó', 'Avô', 'Tia', 'Tio', 'Irmã', 'Irmão', 'Responsável legal', 'Outro']) {
    expect(within(select).getByRole('option', { name: label })).toBeTruthy()
  }
  await userEvent.selectOptions(select, 'Avó')
  vi.mocked(createStudent).mockResolvedValue({})
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await waitFor(() => expect(createStudent).toHaveBeenCalledOnce())
  expect(vi.mocked(createStudent).mock.calls[0][0].relatives[0].kinship).toBe('Avó')
})

it('formata todos os valores do aluno e envia números corretos, distinguindo zero de vazio', async () => {
  showForm('student'); fillStudent()
  const labels = ['Gasto mensal com água (R$)', 'Gasto mensal com luz (R$)', 'Gasto mensal com telefone (R$)', 'Aluguel ou financiamento mensal (R$)', 'Gasto mensal com alimentação (R$)', 'Renda familiar mensal (R$)']
  for (const label of labels) {
    const input = screen.getByLabelText(label)
    await userEvent.type(input, '123456')
    expect((input as HTMLInputElement).value).toBe('R$ 1.234,56')
  }
  await userEvent.clear(screen.getByLabelText(labels[0]))
  await userEvent.type(screen.getByLabelText(labels[0]), '0')
  await userEvent.clear(screen.getByLabelText(labels[2]))
  const income = screen.getByLabelText(labels[5])
  await userEvent.clear(income)
  await userEvent.click(income)
  await userEvent.paste('R$ 2.500,90')
  expect((income as HTMLInputElement).value).toBe('R$ 2.500,90')
  vi.mocked(createStudent).mockResolvedValue({})
  await userEvent.click(screen.getByRole('button', { name: 'Salvar cadastro' }))
  await waitFor(() => expect(createStudent).toHaveBeenCalledOnce())
  expect(vi.mocked(createStudent).mock.calls[0][0].socioeconomic).toMatchObject({ waterExpense: 0, electricityExpense: 1234.56, phoneExpense: undefined, rentOrFinancingExpense: 1234.56, foodExpense: 1234.56, householdIncome: 2500.90 })
})

it('sincroniza identificação do responsável sem alterar renda do integrante', async () => {
  showForm('population')
  fill('Nome (obrigatório)', 'Maria')
  fill('CPF', '52998224725')
  await userEvent.click(screen.getByRole('button', { name: 'Adicionar responsável à família' }))
  const member = within(screen.getByRole('group', { name: 'Integrante 1' }))
  fireEvent.change(member.getByLabelText('Renda mensal (R$)'), { target: { value: '123456' } })
  fill('Nome (obrigatório)', 'Maria atualizada')
  fireEvent.change(screen.getAllByLabelText('CPF')[0], { target: { value: '11144477735' } })
  await waitFor(() => expect((member.getByLabelText('Nome completo (obrigatório)') as HTMLInputElement).value).toBe('Maria atualizada'))
  expect((member.getByLabelText('CPF') as HTMLInputElement).value).toBe('111.444.777-35')
  expect((member.getByLabelText('Nome completo (obrigatório)') as HTMLInputElement).readOnly).toBe(true)
  expect((member.getByLabelText('Renda mensal (R$)') as HTMLInputElement).value).toBe('R$ 1.234,56')
  await userEvent.click(screen.getByRole('button', { name: 'Salvar levantamento' }))
  await waitFor(() => expect(createPopulationSurvey).toHaveBeenCalledOnce())
  expect(vi.mocked(createPopulationSurvey).mock.calls[0][0].members[0]).toMatchObject({ name: 'Maria atualizada', documentNumber: '111.444.777-35', income: 1234.56 })
})

it.each(['student', 'population'] as const)('oferece acesso à ficha depois de salvar %s', async (kind) => {
  showForm(kind)
  if (kind === 'student') fillStudent()
  else fill('Nome (obrigatório)', 'Maria')
  await userEvent.click(screen.getByRole('button', { name: kind === 'student' ? 'Salvar cadastro' : 'Salvar levantamento' }))
  expect((await screen.findByRole('link', { name: 'Ver ficha do cadastro salvo' })).getAttribute('href')).toBe(`/app/${kind === 'student' ? 'alunos' : 'levantamentos'}/saved`)
})
