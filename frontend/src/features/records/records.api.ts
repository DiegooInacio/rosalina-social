export type RecordKind = 'students' | 'population-surveys'
export type RecordSummary = {
  id: string; name?: string; responsibleName?: string; status?: string; cpf?: string;
  activity?: string; birthDate?: string; referenceDate?: string; updatedAt?: string
}
export type RecordPage = { content: RecordSummary[]; totalElements: number; totalPages: number; number: number }
export type RecordData = Record<string, unknown>
export const recordPath = (kind: RecordKind, id?: string) => `/api/v1/${kind}${id ? `/${encodeURIComponent(id)}` : ''}`
