import { z } from 'zod'
import { brDateToIso } from '../../lib/dates'
import {
  isValidCep,
  isValidCpf,
  isValidDate,
  isValidEmail,
  isValidPhone,
} from '../../lib/validators'

// Campo opcional: aceita vazio, mas se preenchido precisa ser válido
function optional(check: (value: string) => boolean, message: string) {
  return z.string().refine((value) => value === '' || check(value), message)
}

const optionalEmail = z
  .string()
  .max(254, 'O e-mail pode ter no máximo 254 caracteres.')
  .refine((value) => value === '' || isValidEmail(value), 'Informe um e-mail válido.')

export const studentSchema = z.object({
  status: z.enum(['ATIVO', 'INATIVO']),
  name: z
    .string()
    .trim()
    .min(1, 'Informe o nome do aluno.')
    .max(150, 'O nome pode ter no máximo 150 caracteres.'),
  activityId: z.string().min(1, 'Selecione a atividade.'),
  birthDate: z
    .string()
    .min(1, 'Informe a data de nascimento.')
    .refine(isValidDate, 'Informe uma data válida (dd/mm/aaaa).'),
  rg: z.string(),
  cpf: optional(isValidCpf, 'Informe um CPF válido.'),
  cadunico: z.boolean(),
  nis: z.string(),
  nationalHealthCard: z.string(),
  address: z.string(),
  neighborhood: z.string(),
  referencePoint: z.string(),
  city: z.string(),
  zipCode: optional(isValidCep, 'Informe um CEP válido.'),
  startDate: optional(isValidDate, 'Informe uma data válida (dd/mm/aaaa).'),
  guardianPhone: z
    .string()
    .min(1, 'Informe o telefone do responsável.')
    .refine(isValidPhone, 'Informe um telefone válido com DDD.'),
  guardianEmail: optionalEmail,
  studentPhone: optional(isValidPhone, 'Informe um telefone válido com DDD.'),
  studentEmail: optionalEmail,
})

export type StudentFormData = z.infer<typeof studentSchema>

// Valores iniciais: todo campo de texto começa vazio
export const studentDefaultValues: StudentFormData = {
  status: 'ATIVO',
  name: '',
  activityId: '',
  birthDate: '',
  rg: '',
  cpf: '',
  cadunico: false,
  nis: '',
  nationalHealthCard: '',
  address: '',
  neighborhood: '',
  referencePoint: '',
  city: '',
  zipCode: '',
  startDate: '',
  guardianPhone: '',
  guardianEmail: '',
  studentPhone: '',
  studentEmail: '',
}

// Texto vazio vira undefined, e o campo some do JSON enviado à API
function blankToUndefined(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}

// Transforma os dados do formulário no formato que a API espera
export function toStudentRequest(data: StudentFormData) {
  return {
    status: data.status,
    name: data.name,
    activityId: data.activityId,
    birthDate: brDateToIso(data.birthDate),
    rg: blankToUndefined(data.rg),
    cpf: blankToUndefined(data.cpf),
    cadunico: data.cadunico,
    nis: blankToUndefined(data.nis),
    nationalHealthCard: blankToUndefined(data.nationalHealthCard),
    address: blankToUndefined(data.address),
    neighborhood: blankToUndefined(data.neighborhood),
    referencePoint: blankToUndefined(data.referencePoint),
    city: blankToUndefined(data.city),
    zipCode: blankToUndefined(data.zipCode),
    startDate: data.startDate ? brDateToIso(data.startDate) : undefined,
    guardianPhone: data.guardianPhone,
    guardianEmail: blankToUndefined(data.guardianEmail),
    studentPhone: blankToUndefined(data.studentPhone),
    studentEmail: blankToUndefined(data.studentEmail),
    relatives: [], // a seção "Informações familiares" vai preencher isso depois
  }
}