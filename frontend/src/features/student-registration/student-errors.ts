import { mapApiFormErrors } from '../../lib/api-form-errors'
import { providedRelatives } from './relative.schema'
import type { StudentFormData } from './student.schema'

export function mapStudentErrors(fields: Record<string, string>, data: StudentFormData) {
  // Segue a mesma ordem e omissão de pessoas vazias usadas no envio.
  const sentPeople = providedRelatives(data)
  const renamed: Record<string, string> = {}
  for (const [field, message] of Object.entries(fields)) {
    if (field === 'relatives') {
      renamed['guardian.name'] = message
      continue
    }
    const match = /^relatives\[(\d+)\](?:\.(.+))?$/.exec(field)
    if (match) {
      const person = sentPeople[Number(match[1])]
      if (person) renamed[`${person}.${match[2] ?? 'name'}`] = message
    } else {
      renamed[field] = message
    }
  }
  return mapApiFormErrors(renamed, data)
}
