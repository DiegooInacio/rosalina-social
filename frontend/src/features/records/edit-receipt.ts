import { toStudentRequest } from '../student-registration/student.schema'
import { toPopulationRequest } from '../population-survey/population.schema'
import { populationEditValues, studentEditValues } from './edit-values'
import type { RecordData, RecordKind } from './records.api'

export type EditReceipt = { revision: string; body: RecordData }

// Compare the submitted fields, ignoring transport formatting and generated member IDs.
function canonical(value: unknown, key = ''): unknown {
  if (value === undefined || value === null || value === '') return undefined
  if (Array.isArray(value)) return value.map((item) => canonical(item))
  if (typeof value === 'object') {
    const data = value as RecordData
    const entries = Object.keys(data).sort().map((field) => {
      let child = data[field]
      if (field === 'documentNumber' && ['CPF', 'CIN'].includes(String(data.documentType))) child = String(child ?? '').replace(/\D/g, '')
      return [field, canonical(child, field)] as const
    }).filter(([, child]) => child !== undefined)
    return entries.length ? Object.fromEntries(entries) : undefined
  }
  if (typeof value === 'string') {
    if (/phone|cpf|zipCode/i.test(key)) return value.replace(/\D/g, '') || undefined
    return value.trim() || undefined
  }
  return value
}

export function matchesReceipt(kind: RecordKind, record: RecordData, receipt: EditReceipt): boolean {
  const saved = kind === 'students' ? toStudentRequest(studentEditValues(record)) : toPopulationRequest(populationEditValues(record))
  const expected = structuredClone(receipt.body)
  if (kind === 'population-surveys') {
    const requested = expected.members as RecordData[] ?? []
    const actual = (saved as ReturnType<typeof toPopulationRequest>).members
    actual.forEach((member, index) => { if (!requested[index]?.id) member.id = undefined })
    for (const person of [expected.responsible, ...requested]) {
      if (!person || typeof person !== 'object') continue
      const data = person as RecordData
      if (data.age == null && typeof data.birthDate === 'string' && typeof expected.referenceDate === 'string') {
        const birth = data.birthDate
        const reference = expected.referenceDate
        data.age = Number(reference.slice(0, 4)) - Number(birth.slice(0, 4)) - (reference.slice(5) < birth.slice(5) ? 1 : 0)
      }
    }
  }
  return JSON.stringify(canonical(saved)) === JSON.stringify(canonical(expected))
}
