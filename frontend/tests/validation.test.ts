import { describe, expect, it } from 'vitest'
import { mapStudentErrors } from '../src/features/student-registration/student-errors'
import { studentDefaultValues, studentSchema } from '../src/features/student-registration/student.schema'
import { memberDefaultValues, populationDefaultValues, populationSchema } from '../src/features/population-survey/population.schema'
import { mapApiFormErrors } from '../src/lib/api-form-errors'
import { isValidCep, isValidCpf, isValidDate, isValidPhone } from '../src/lib/validators'

describe('RF15: validação antes do envio', () => {
  it('rejeita documentos e contatos com caracteres arbitrários, mesmo contendo os dígitos esperados', () => {
    expect(isValidCpf('529.982.247-25')).toBe(true)
    expect(isValidCpf('abc52998224725')).toBe(false)
    expect(isValidCpf('111.111.111-11')).toBe(false)
    expect(isValidPhone('(85) 99999-9999')).toBe(true)
    expect(isValidPhone('telefone85999999999')).toBe(false)
    expect(isValidCep('60744-390')).toBe(true)
    expect(isValidCep('cep60744390')).toBe(false)
    expect(isValidDate('31/02/2026')).toBe(false)
  })

  it('impede dados do aluno que seriam recusados pelas regras da API', () => {
    const data = structuredClone(studentDefaultValues)
    Object.assign(data, {
      name: 'Aluno Teste', activityId: '00000000-0000-4000-8000-000000000001',
      birthDate: '01/01/2010', guardianPhone: '(85) 99999-9999',
    })
    data.guardian.name = 'Responsável Teste'
    expect(studentSchema.safeParse(data).success).toBe(true)
    data.birthDate = '01/01/2999'
    data.startDate = '01/01/2999'
    data.nis = 'letras'
    data.nationalHealthCard = '1'.repeat(21)
    data.guardian.occupationId = 'fora-do-catálogo'
    const result = studentSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(expect.arrayContaining([
      'birthDate', 'startDate', 'nis', 'nationalHealthCard', 'guardian.occupationId',
    ]))
  })

  it('impede quantidades fracionárias, renda negativa e datas impossíveis no levantamento', () => {
    const data = populationDefaultValues()
    data.responsible.name = 'Responsável Teste'
    data.housing.residentCount = '1.5'
    data.responsible.age = '-1'
    data.declaration.date = '31/02/2026'
    data.members = [{ ...memberDefaultValues, name: 'Responsável Teste', isResponsible: true, income: '-1' }]
    const result = populationSchema.safeParse(data)
    expect(result.success).toBe(false)
    if (result.success) return
    expect(result.error.issues.map((issue) => issue.path.join('.'))).toEqual(expect.arrayContaining([
      'housing.residentCount', 'responsible.age', 'declaration.date', 'members.0.income',
    ]))
  })
})

describe('erros de campos retornados pela API', () => {
  it.each([
    [false, false, ['guardian']],
    [true, false, ['father', 'guardian']],
    [false, true, ['mother', 'guardian']],
    [true, true, ['father', 'mother', 'guardian']],
  ] as const)('considera familiares opcionais: pai %s, mãe %s', (father, mother, people) => {
    const data = structuredClone(studentDefaultValues)
    if (father) data.father.name = 'Pai'
    if (mother) data.mother.name = 'Mãe'
    const fields = Object.fromEntries(people.map((person, index) => [`relatives[${index}].cpf`, `CPF de ${person}`]))
    const expected = Object.fromEntries(people.map((person) => [`${person}.cpf`, `CPF de ${person}`]))
    expect(mapStudentErrors(fields, data)).toEqual(expected)
  })

  it('não associa mensagens a caminhos inexistentes e preserva erros da composição familiar', () => {
    const data = populationDefaultValues()
    expect(mapApiFormErrors({ members: 'Inclua o responsável.', 'members[99].name': 'Índice inválido', '__proto__.polluted': 'Inválido' }, data)).toEqual({ members: 'Inclua o responsável.' })
  })
})
