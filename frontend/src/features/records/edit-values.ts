import { isoToBrDate } from '../../lib/dates'
import { studentDefaultValues, type StudentFormData } from '../student-registration/student.schema'
import { memberDefaultValues, populationDefaultValues, type PopulationFormData } from '../population-survey/population.schema'
import { object, objects } from './record-display'
import type { RecordData } from './records.api'

// Reconstrói somente campos conhecidos, distinguindo falso/zero de ausência.
function hydrate(template: RecordData, source: RecordData): RecordData {
  return Object.fromEntries(Object.entries(template).map(([key, fallback]) => {
    const value = source[key]
    if (fallback === null) return [key, typeof value === 'boolean' ? value : null]
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback)) return [key, hydrate(object(fallback), object(value))]
    if (typeof fallback === 'boolean') return [key, typeof value === 'boolean' ? value : fallback]
    if (typeof fallback !== 'string') return [key, fallback]
    if (value === null || value === undefined) return [key, fallback]
    if (typeof value === 'boolean') return [key, String(value)]
    if (['birthDate', 'startDate', 'referenceDate', 'date'].includes(key) && typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) return [key, isoToBrDate(value)]
    return [key, typeof value === 'number' || typeof value === 'string' ? String(value) : fallback]
  }))
}
export function studentEditValues(record: RecordData): StudentFormData {
  const source: RecordData = { ...record, activityId: object(record.activity).id }
  const profile = { ...object(record.socioeconomic) }
  for (const key of ['housingType', 'acquisitionType', 'wallType', 'floorType', 'waterSupply', 'sewage', 'garbageCollection']) profile[`${key}Id`] = object(profile[key]).id
  source.socioeconomic = profile
  const relatives = objects(record.relatives)
  for (const [key, type] of [['mother', 'MAE'], ['father', 'PAI'], ['guardian', 'RESPONSAVEL']]) {
    const relative = relatives.find((item) => item.type === type) ?? {}
    Object.assign(source, { [key]: { ...relative, occupationId: object(relative.occupation).id, educationId: object(relative.education).id } })
  }
  return hydrate(structuredClone(studentDefaultValues) as unknown as RecordData, source) as unknown as StudentFormData
}
export function populationEditValues(record: RecordData): PopulationFormData {
  const result = hydrate(populationDefaultValues() as unknown as RecordData, record)
  result.members = objects(record.members).map((member) => hydrate(memberDefaultValues as unknown as RecordData, member))
  return result as unknown as PopulationFormData
}
