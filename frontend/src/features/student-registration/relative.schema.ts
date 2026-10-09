import { z } from 'zod'
import { brDateToIso } from '../../lib/dates'
import { blankToUndefined, optional } from '../../lib/forms'
import { isValidCpf, isValidDate, isValidPhone } from '../../lib/validators'

// Regras de UMA pessoa da família (pai, mãe ou responsável)
export const relativeSchema = z.object({
  kinship: z.string(),
  name: z.string().trim().max(150, 'O nome pode ter no máximo 150 caracteres.'),
  birthDate: optional(isValidDate, 'Informe uma data válida (dd/mm/aaaa).'),
  occupationId: z.string(),
  literate: z.boolean(),
  educationId: z.string(),
  phone: optional(isValidPhone, 'Informe um telefone válido com DDD.'),
  rg: z.string(),
  cpf: optional(isValidCpf, 'Informe um CPF válido.'),
  voterRegistration: z.string(),
})

export type RelativeFormData = z.infer<typeof relativeSchema>
export type RelativeType = 'PAI' | 'MAE' | 'RESPONSAVEL'

export const relativeDefaultValues: RelativeFormData = {
  kinship: '',
  name: '',
  birthDate: '',
  occupationId: '',
  literate: false,
  educationId: '',
  phone: '',
  rg: '',
  cpf: '',
  voterRegistration: '',
}

// Diz se a pessoa teve ALGUM campo preenchido (usado para pai e mãe, que são opcionais)
export function hasRelativeData(data: RelativeFormData) {
  return (
    data.literate ||
    Object.values(data).some((value) => typeof value === 'string' && value.trim() !== '')
  )
}

// Transforma uma pessoa no formato que a API espera
export function toRelativeRequest(type: RelativeType, data: RelativeFormData) {
  return {
    type,
    kinship: type === 'RESPONSAVEL' ? blankToUndefined(data.kinship) : undefined,
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