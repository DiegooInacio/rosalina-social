import { z } from 'zod'
import { brDateToIso } from '../../lib/dates'
import { blankToUndefined, optional, phoneField } from '../../lib/forms'
import { optionalCatalogId } from '../../lib/form-fields'
import { isValidCpf, isPastDate } from '../../lib/validators'
import { normalizeKinship } from './kinship'

// Regras de UMA pessoa da família (pai, mãe ou responsável)
export const relativeSchema = z.object({
  kinship: z.string().trim().max(100, 'Informe no máximo 100 caracteres.'),
  name: z.string().trim().max(150, 'O nome pode ter no máximo 150 caracteres.'),
  birthDate: optional(isPastDate, 'Informe uma data de nascimento válida e anterior a hoje.'),
  occupationId: optionalCatalogId,
  literate: z.boolean().nullable(),
  educationId: optionalCatalogId,
  phone: phoneField(),
  rg: z.string().trim().max(30, 'Informe no máximo 30 caracteres.'),
  cpf: optional(isValidCpf, 'Informe um CPF válido.'),
  voterRegistration: z.string().trim().max(30, 'Informe no máximo 30 caracteres.'),
})

export type RelativeFormData = z.infer<typeof relativeSchema>
export type RelativeType = 'PAI' | 'MAE' | 'RESPONSAVEL'

export const relativeDefaultValues: RelativeFormData = {
  kinship: '',
  name: '',
  birthDate: '',
  occupationId: '',
  literate: null,
  educationId: '',
  phone: '',
  rg: '',
  cpf: '',
  voterRegistration: '',
}

// Diz se a pessoa teve ALGUM campo preenchido (usado para pai e mãe, que são opcionais)
export function hasRelativeData(data: RelativeFormData) {
  return (
    data.literate !== null ||
    Object.values(data).some((value) => typeof value === 'string' && value.trim() !== '')
  )
}

// Transforma uma pessoa no formato que a API espera
export function toRelativeRequest(type: RelativeType, data: RelativeFormData) {
  return {
    type,
    kinship: type === 'RESPONSAVEL' ? blankToUndefined(normalizeKinship(data.kinship)) : undefined,
    name: data.name,
    birthDate: data.birthDate ? brDateToIso(data.birthDate) : undefined,
    occupationId: blankToUndefined(data.occupationId),
    literate: data.literate,
    educationId: blankToUndefined(data.educationId),
    phone: blankToUndefined(data.phone),
    rg: blankToUndefined(data.rg),
    cpf: blankToUndefined(data.cpf),
    voterRegistration: blankToUndefined(data.voterRegistration),
  }
}


export const familyOrder = ['mother', 'father', 'guardian'] as const
export const relativeTypes = { mother: 'MAE', father: 'PAI', guardian: 'RESPONSAVEL' } as const

export function primaryRelative(data: Record<typeof familyOrder[number], RelativeFormData>) {
  return familyOrder.find((person) => data[person].name.trim() !== '')
}

export function providedRelatives(data: Record<typeof familyOrder[number], RelativeFormData>) {
  return familyOrder.filter((person) => hasRelativeData(data[person]))
}
