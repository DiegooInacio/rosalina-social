import { useEffect } from 'react'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FormProvider, useForm } from 'react-hook-form'
import { MemoryRouter } from 'react-router'
import { expect, it, vi } from 'vitest'
import { apiRequest } from '../src/lib/api'
import { StudentRegistrationForm } from '../src/features/student-registration/StudentRegistrationForm'
import { toStudentRequest } from '../src/features/student-registration/student.schema'
import { MembersSection } from '../src/features/population-survey/sections/MembersSection'
import { toPopulationRequest, type PopulationFormData } from '../src/features/population-survey/population.schema'
import { populationEditValues, studentEditValues } from '../src/features/records/edit-values'
import { matchesReceipt } from '../src/features/records/edit-receipt'
import { PreservedCatalogs, catalogIds } from '../src/features/catalogs/PreservedCatalogs'
import { restoreDraftValues } from '../src/features/drafts/draft-storage'

vi.mock('../src/lib/api', async (original) => ({ ...await original<typeof import('../src/lib/api')>(), apiRequest: vi.fn() }))
const activityId = '00000000-0000-4000-8000-000000000001'
const record = { name: 'Ana', status: 'ATIVO', activity: { id: activityId, name: 'Capoeira antiga' }, birthDate: '2015-05-20', guardianPhone: '85999999999', cadunico: null, relatives: [{ type: 'MAE', name: 'Maria', literate: null }] }

it('edita telefone preservando atividade inativa e respostas não informadas', async () => {
  vi.mocked(apiRequest).mockImplementation(async (path) => path.includes('category=ATIVIDADE') ? [{ id: activityId, category: 'ATIVIDADE', name: 'Capoeira antiga', active: false }] : [])
  const values = studentEditValues(record)
  const save = vi.fn()
  render(<MemoryRouter><PreservedCatalogs.Provider value={catalogIds(values)}><StudentRegistrationForm editor={{ initialValues: values, originalValues: values, storageKey: 'preservation-test', hasBackup: false, cancel: vi.fn(), save }} /></PreservedCatalogs.Provider></MemoryRouter>)
  await screen.findByRole('option', { name: 'Capoeira antiga (inativa)' })
  expect((screen.getByLabelText('Atividade matriculada (obrigatória)') as HTMLSelectElement).value).toBe(activityId)
  expect((screen.getByLabelText('Possui Cadastro Único (CadÚnico)') as HTMLSelectElement).value).toBe('')
  fireEvent.change(screen.getByLabelText('Telefone do responsável (obrigatório)'), { target: { value: '85988888888' } })
  await userEvent.click(screen.getByRole('button', { name: 'Salvar alterações' }))
  await waitFor(() => expect(save).toHaveBeenCalledOnce())
  expect(toStudentRequest(save.mock.calls[0][0])).toMatchObject({ activityId, cadunico: null, relatives: [{ name: 'Maria', literate: null }] })
})

it('distingue ausente, Não e Sim ao reconstituir a cópia local', () => {
  const values = studentEditValues(record)
  const restored = restoreDraftValues(values, { ...values, cadunico: false, mother: { ...values.mother, literate: true } })
  expect(values.cadunico).toBe(null)
  expect(restored.cadunico).toBe(false)
  expect(restored.mother.literate).toBe(true)
})

it('preserva CIN do responsável sem CPF separado e acompanha alterações na CIN', async () => {
  let read!: () => PopulationFormData
  function Form() {
    const methods = useForm<PopulationFormData>({ defaultValues: populationEditValues({ referenceDate: '2026-01-01', responsible: { name: 'Maria', documentType: 'CIN', documentNumber: '52998224725' }, members: [{ id: 'original', name: 'Maria', documentType: 'CIN', documentNumber: '52998224725', isResponsible: true }] }) })
    useEffect(() => { read = methods.getValues }, [methods])
    return <FormProvider {...methods}><input aria-label="CIN do responsável" {...methods.register('responsible.documentNumber')} /><MembersSection /></FormProvider>
  }
  render(<Form />)
  expect(read().members[0]).toMatchObject({ id: 'original', documentType: 'CIN', documentNumber: '52998224725' })
  fireEvent.change(screen.getByLabelText('CIN do responsável'), { target: { value: '11144477735' } })
  await waitFor(() => expect(read().members[0].documentNumber).toBe('11144477735'))
  expect(toPopulationRequest(read()).members[0]).toMatchObject({ id: 'original', documentType: 'CIN', documentNumber: '11144477735' })
})

it('reconhece gravação de aluno com documentos e telefones normalizados', () => {
  const body = toStudentRequest(studentEditValues({ ...record, guardianPhone: '(85) 99999-9999', cpf: '529.982.247-25' }))
  expect(matchesReceipt('students', { ...record, cpf: '52998224725' }, { revision: 'old', body })).toBe(true)
  expect(matchesReceipt('students', { ...record, cpf: '52998224725', name: 'Outra pessoa' }, { revision: 'old', body })).toBe(false)
})

it('reconhece integrantes novos e idades calculadas sem confundir Não e ausência', () => {
  const raw = { referenceDate: '2026-01-01', responsible: { name: 'Maria', birthDate: '1986-01-01' }, members: [{ name: 'Maria', birthDate: '1986-01-01', isResponsible: true, income: 0 }], authorizations: { personalData: false } }
  const body = toPopulationRequest(populationEditValues(raw))
  const saved = { ...raw, responsible: { ...raw.responsible, age: 40 }, members: [{ ...raw.members[0], id: 'generated', age: 40 }] }
  expect(matchesReceipt('population-surveys', saved, { revision: 'old', body })).toBe(true)
  expect(matchesReceipt('population-surveys', { ...saved, authorizations: null }, { revision: 'old', body })).toBe(false)
})


it('preserva nascimento, idade e CIN existentes apenas no integrante e permite corrigi-los', async () => {
  let read!: () => PopulationFormData
  function Form() {
    const methods = useForm<PopulationFormData>({ defaultValues: populationEditValues({ referenceDate: '2026-01-01', responsible: { name: 'Maria' }, members: [{ id: 'original', name: 'Maria', birthDate: '1986-01-01', age: 40, documentType: 'CIN', documentNumber: '52998224725', isResponsible: true }] }) })
    useEffect(() => { read = methods.getValues }, [methods])
    return <FormProvider {...methods}><input aria-label="Nascimento do responsável" {...methods.register('responsible.birthDate')} /><MembersSection /></FormProvider>
  }
  render(<Form />)
  expect(read().members[0]).toMatchObject({ birthDate: '01/01/1986', age: '40', documentType: 'CIN', documentNumber: '52998224725' })
  expect((screen.getByLabelText('Data de nascimento') as HTMLInputElement).readOnly).toBe(false)
  expect((screen.getByLabelText('CPF') as HTMLInputElement).readOnly).toBe(false)
  fireEvent.change(screen.getByLabelText('CPF'), { target: { value: '11144477735' } })
  expect(read().members[0].documentNumber).toBe('111.444.777-35')
  fireEvent.change(screen.getByLabelText('Nascimento do responsável'), { target: { value: '01/01/1990' } })
  await waitFor(() => expect(read().members[0].birthDate).toBe('01/01/1990'))
  expect(read().members[0].age).toBe('')
  expect((screen.getByLabelText('Data de nascimento') as HTMLInputElement).readOnly).toBe(true)
})
