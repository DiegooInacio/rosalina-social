import { z } from 'zod'
import { brDateToIso } from '../../lib/dates'
import { blankToUndefined, optional } from '../../lib/forms'
import { optionalCatalogId, optionalInteger, optionalMoney, toOptionalBoolean, toOptionalNumber, yesNoSchema } from '../../lib/form-fields'
import { isValidCep, isValidCpf, isValidDate, isValidEmail, isValidPhone } from '../../lib/validators'

export const states = ['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'] as const
export function todayInFortaleza() {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('day')}/${part('month')}/${part('year')}`
}
const text = (max: number) => z.string().trim().max(max, `Informe no máximo ${max} caracteres.`)
const date = optional(isValidDate, 'Informe uma data válida (dd/mm/aaaa).')
const phone = optional(isValidPhone, 'Informe um telefone válido com DDD.')
export const memberSchema = z.object({
  name: text(150).min(1, 'Informe o nome do integrante.'),
  documentType: z.enum(['', 'CPF', 'CIN']),
  documentNumber: text(30),
  age: optionalInteger,
  birthDate: date,
  kinship: text(100),
  income: optionalMoney,
  isResponsible: z.boolean(),
})
export type MemberFormData = z.infer<typeof memberSchema>
export const memberDefaultValues: MemberFormData = {
  name: '', documentType: '', documentNumber: '', age: '', birthDate: '', kinship: '', income: '', isResponsible: false,
}
function ageAt(birth: string, reference: string) {
  return Number(reference.slice(0, 4)) - Number(birth.slice(0, 4)) - (reference.slice(5) < birth.slice(5) ? 1 : 0)
}

export const populationSchema = z.object({
  referenceDate: z.string().refine(isValidDate, 'Informe uma data válida (dd/mm/aaaa).'),
  responsible: z.object({
    name: text(150).min(1, 'Informe o nome do responsável.'), age: optionalInteger, socialName: text(150),
    birthSexId: optionalCatalogId, racialIdentityId: optionalCatalogId, birthDate: date,
    genderIdentityId: optionalCatalogId, sexualOrientationId: optionalCatalogId, maritalStatusId: optionalCatalogId,
    documentType: z.enum(['', 'RG', 'CIN']), documentNumber: text(30),
    cpf: optional(isValidCpf, 'Informe um CPF válido.'), phone, birthplace: text(150), nationality: text(100),
    nis: z.string().trim().refine((value) => value === '' || /^\d{1,20}$/.test(value), 'Informe até 20 dígitos para o NIS.'),
    educationId: optionalCatalogId, schoolTypeId: optionalCatalogId,
    email: text(254).refine((value) => value === '' || isValidEmail(value), 'Informe um e-mail válido.'), voterRegistration: text(30),
  }),
  address: z.object({
    street: text(255), number: text(30), zipCode: optional(isValidCep, 'Informe um CEP válido.'),
    city: text(120), state: z.enum(['', ...states]), neighborhood: text(120), complement: text(255),
  }),
  housing: z.object({
    type: z.enum(['', 'PROPRIA', 'ALUGADA', 'CEDIDA', 'FINANCIADA']), roomCount: optionalInteger,
    landlordName: text(150), landlordPhone: phone, monthsInCommunity: optionalInteger, monthsAtAddress: optionalInteger,
    pipedWater: yesNoSchema, electricity: yesNoSchema, sewage: yesNoSchema, residentCount: optionalInteger,
  }),
  workAndBenefits: z.object({
    works: yesNoSchema,
    occupation: text(255),
    receivesBenefit: yesNoSchema,
    benefit: text(255),
    minhaCasaMinhaVidaRegistered: yesNoSchema,
  }),
  health: z.object({
    hasDisability: yesNoSchema,
    disabilityDescription: text(2000),
    continuousMedication: yesNoSchema,
    medications: text(2000),
    medicalCertificatePresented: yesNoSchema,
    allergies: text(2000),
  }),
  members: z.array(memberSchema),
  authorizations: z.object({ imageAndSound: yesNoSchema, personalData: yesNoSchema }),
  declaration: z.object({
    location: text(150), date,
    responsibleSignatureName: text(150), registrarSignatureName: text(150),
  }),
}).superRefine((data, ctx) => {
  if (data.declaration.date && isValidDate(data.declaration.date) && brDateToIso(data.declaration.date) > brDateToIso(todayInFortaleza())) {
    ctx.addIssue({ code: 'custom', path: ['declaration', 'date'], message: 'A data da declaração não pode estar no futuro.' })
  }
  if (data.members.length && data.members.filter((member) => member.isResponsible).length !== 1) {
    ctx.addIssue({ code: 'custom', path: ['members'], message: 'A composição familiar deve incluir o responsável exatamente uma vez.' })
  }
  const documents = new Set<string>()
  const reference = isValidDate(data.referenceDate) ? brDateToIso(data.referenceDate) : undefined
  const r = data.responsible
  const responsibleAge = r.birthDate && isValidDate(r.birthDate) && reference
    ? ageAt(brDateToIso(r.birthDate), reference) : toOptionalNumber(r.age)
  data.members.forEach((member, index) => {
    const issue = (field: string, message: string) => ctx.addIssue({ code: 'custom', path: ['members', index, field], message })
    const number = member.documentType === 'CPF' ? member.documentNumber.replace(/\D/g, '') : member.documentNumber
    if (member.documentNumber && !member.documentType) issue('documentType', 'Selecione CPF ou CIN para informar o documento.')
    if (member.documentType === 'CPF' && member.documentNumber && (!/^[0-9.\- /]+$/.test(member.documentNumber) || !isValidCpf(member.documentNumber))) issue('documentNumber', 'Informe um CPF válido.')
    if (member.documentType && number) {
      const key = `${member.documentType}:${number}`
      if (documents.has(key)) issue('documentNumber', 'Documento repetido na composição familiar.')
      documents.add(key)
    }
    let memberAge = toOptionalNumber(member.age)
    if (member.birthDate && isValidDate(member.birthDate) && reference) {
      const birth = brDateToIso(member.birthDate)
      if (birth > reference) issue('birthDate', 'O nascimento não pode ser posterior à data de referência.')
      else {
        memberAge = ageAt(birth, reference)
        if (member.age !== '' && Number(member.age) !== memberAge) issue('age', 'A idade deve corresponder ao nascimento na data de referência.')
      }
    }
    const expectedDocument = member.documentType === 'CPF' ? r.cpf.replace(/\D/g, '') : r.documentType === member.documentType ? r.documentNumber : ''
    if (member.isResponsible) {
      if (member.name !== r.name) issue('name', 'O nome deve corresponder ao responsável familiar.')
      if (member.birthDate && r.birthDate && member.birthDate !== r.birthDate) issue('birthDate', 'O nascimento deve corresponder ao responsável familiar.')
      if (memberAge !== undefined && responsibleAge !== undefined && memberAge !== responsibleAge) issue('age', 'A idade deve corresponder ao responsável familiar.')
      if (number && expectedDocument && number !== expectedDocument) issue('documentNumber', 'O documento deve corresponder ao responsável familiar.')
    } else if (number && expectedDocument && number === expectedDocument) {
      issue('isResponsible', 'O responsável deve aparecer uma única vez.')
    }
  })
  for (const [condition, detail] of [['works', 'occupation'], ['receivesBenefit', 'benefit']] as const) {
    if (data.workAndBenefits[condition] !== 'true' && data.workAndBenefits[detail]) {
      ctx.addIssue({ code: 'custom', path: ['workAndBenefits', detail], message: 'Informe este detalhe somente quando a resposta for Sim.' })
    }
  }
  for (const [condition, detail] of [['hasDisability', 'disabilityDescription'], ['continuousMedication', 'medications']] as const) {
    if (data.health[condition] !== 'true' && data.health[detail]) {
      ctx.addIssue({ code: 'custom', path: ['health', detail], message: 'Informe este detalhe somente quando a resposta for Sim.' })
    }
  }
  if (isValidDate(data.referenceDate)) {
    const reference = brDateToIso(data.referenceDate)
    if (reference > brDateToIso(todayInFortaleza())) ctx.addIssue({ code: 'custom', path: ['referenceDate'], message: 'A data de referência não pode estar no futuro.' })
    if (data.responsible.birthDate && isValidDate(data.responsible.birthDate)) {
      const birth = brDateToIso(data.responsible.birthDate)
      const age = Number(reference.slice(0, 4)) - Number(birth.slice(0, 4)) - (reference.slice(5) < birth.slice(5) ? 1 : 0)
      if (birth > reference) ctx.addIssue({ code: 'custom', path: ['responsible', 'birthDate'], message: 'O nascimento não pode ser posterior à data de referência.' })
      else if (data.responsible.age !== '' && Number(data.responsible.age) !== age) ctx.addIssue({ code: 'custom', path: ['responsible', 'age'], message: 'A idade deve corresponder ao nascimento na data de referência. Deixe vazia para calcular automaticamente.' })
    }
  }
  if (data.responsible.documentNumber && !data.responsible.documentType) ctx.addIssue({ code: 'custom', path: ['responsible', 'documentType'], message: 'Selecione RG ou CIN para informar o documento.' })
  if (data.housing.type !== 'ALUGADA') {
    for (const field of ['landlordName', 'landlordPhone'] as const) {
      if (data.housing[field]) ctx.addIssue({ code: 'custom', path: ['housing', field], message: 'Informe o proprietário somente para moradia alugada.' })
    }
  }
})
export type PopulationFormData = z.infer<typeof populationSchema>
export function populationDefaultValues(): PopulationFormData {
  return {
    referenceDate: todayInFortaleza(),
    responsible: { name: '', age: '', socialName: '', birthSexId: '', racialIdentityId: '', birthDate: '', genderIdentityId: '', sexualOrientationId: '', maritalStatusId: '', documentType: '', documentNumber: '', cpf: '', phone: '', birthplace: '', nationality: '', nis: '', educationId: '', schoolTypeId: '', email: '', voterRegistration: '' },
    address: { street: '', number: '', zipCode: '', city: '', state: '', neighborhood: '', complement: '' },
    housing: { type: '', roomCount: '', landlordName: '', landlordPhone: '', monthsInCommunity: '', monthsAtAddress: '', pipedWater: '', electricity: '', sewage: '', residentCount: '' },
    workAndBenefits: { works: '', occupation: '', receivesBenefit: '', benefit: '', minhaCasaMinhaVidaRegistered: '' },
    health: { hasDisability: '', disabilityDescription: '', continuousMedication: '', medications: '', medicalCertificatePresented: '', allergies: '' },
    members: [],
    authorizations: { imageAndSound: '', personalData: '' },
    declaration: { location: '', date: '', responsibleSignatureName: '', registrarSignatureName: '' },
  }
}
export function toPopulationRequest(data: PopulationFormData) {
  const r = data.responsible
  const h = data.housing
  const w = data.workAndBenefits
  const health = data.health
  return {
    referenceDate: brDateToIso(data.referenceDate),
    responsible: {
      name: r.name, age: toOptionalNumber(r.age), socialName: blankToUndefined(r.socialName),
      birthSexId: r.birthSexId || undefined, racialIdentityId: r.racialIdentityId || undefined,
      birthDate: r.birthDate ? brDateToIso(r.birthDate) : undefined,
      genderIdentityId: r.genderIdentityId || undefined, sexualOrientationId: r.sexualOrientationId || undefined,
      maritalStatusId: r.maritalStatusId || undefined, documentType: r.documentType || undefined,
      documentNumber: blankToUndefined(r.documentNumber), cpf: blankToUndefined(r.cpf), phone: blankToUndefined(r.phone),
      birthplace: blankToUndefined(r.birthplace), nationality: blankToUndefined(r.nationality), nis: blankToUndefined(r.nis),
      educationId: r.educationId || undefined, schoolTypeId: r.schoolTypeId || undefined,
      email: blankToUndefined(r.email), voterRegistration: blankToUndefined(r.voterRegistration),
    },
    address: Object.values(data.address).every((value) => value === '') ? undefined : {
      street: blankToUndefined(data.address.street), number: blankToUndefined(data.address.number),
      zipCode: blankToUndefined(data.address.zipCode), city: blankToUndefined(data.address.city),
      state: data.address.state || undefined, neighborhood: blankToUndefined(data.address.neighborhood), complement: blankToUndefined(data.address.complement),
    },
    housing: Object.values(h).every((value) => value === '') ? undefined : {
      type: h.type || undefined, roomCount: toOptionalNumber(h.roomCount),
      landlordName: h.type === 'ALUGADA' ? blankToUndefined(h.landlordName) : undefined,
      landlordPhone: h.type === 'ALUGADA' ? blankToUndefined(h.landlordPhone) : undefined,
      monthsInCommunity: toOptionalNumber(h.monthsInCommunity), monthsAtAddress: toOptionalNumber(h.monthsAtAddress),
      pipedWater: toOptionalBoolean(h.pipedWater), electricity: toOptionalBoolean(h.electricity), sewage: toOptionalBoolean(h.sewage), residentCount: toOptionalNumber(h.residentCount),
    },
    workAndBenefits: Object.values(w).every((value) => value === '') ? undefined : {
      works: toOptionalBoolean(w.works),
      occupation: w.works === 'true' ? blankToUndefined(w.occupation) : undefined,
      receivesBenefit: toOptionalBoolean(w.receivesBenefit),
      benefit: w.receivesBenefit === 'true' ? blankToUndefined(w.benefit) : undefined,
      minhaCasaMinhaVidaRegistered: toOptionalBoolean(w.minhaCasaMinhaVidaRegistered),
    },
    health: Object.values(health).every((value) => value === '') ? undefined : {
      hasDisability: toOptionalBoolean(health.hasDisability),
      disabilityDescription: health.hasDisability === 'true' ? blankToUndefined(health.disabilityDescription) : undefined,
      continuousMedication: toOptionalBoolean(health.continuousMedication),
      medications: health.continuousMedication === 'true' ? blankToUndefined(health.medications) : undefined,
      medicalCertificatePresented: toOptionalBoolean(health.medicalCertificatePresented),
      allergies: blankToUndefined(health.allergies),
    },
    members: data.members.map((member) => ({
      name: member.name,
      documentType: member.documentType || undefined,
      documentNumber: blankToUndefined(member.documentNumber),
      age: toOptionalNumber(member.age),
      birthDate: member.birthDate ? brDateToIso(member.birthDate) : undefined,
      kinship: blankToUndefined(member.kinship),
      income: toOptionalNumber(member.income),
      isResponsible: member.isResponsible,
    })),
    authorizations: Object.values(data.authorizations).every((value) => value === '') ? undefined : {
      imageAndSound: toOptionalBoolean(data.authorizations.imageAndSound),
      personalData: toOptionalBoolean(data.authorizations.personalData),
    },
    declaration: Object.values(data.declaration).every((value) => value === '') ? undefined : {
      location: blankToUndefined(data.declaration.location),
      date: data.declaration.date ? brDateToIso(data.declaration.date) : undefined,
      responsibleSignatureName: blankToUndefined(data.declaration.responsibleSignatureName),
      registrarSignatureName: blankToUndefined(data.declaration.registrarSignatureName),
    },
  }
}
