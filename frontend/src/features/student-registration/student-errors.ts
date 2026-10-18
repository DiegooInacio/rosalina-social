import { mapApiFormErrors } from '../../lib/api-form-errors'
import { hasRelativeData } from './relative.schema'
import type { StudentFormData } from './student.schema'

export function mapStudentErrors(fields: Record<string, string>, data: StudentFormData) {
  // A API recebe uma lista sem os familiares opcionais vazios. A posição do
  // responsável muda conforme pai e mãe tenham sido incluídos no envio.
  const people = (['father', 'mother'] as const).filter((person) => hasRelativeData(data[person]))
  const sentPeople = [...people, 'guardian'] as const
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
