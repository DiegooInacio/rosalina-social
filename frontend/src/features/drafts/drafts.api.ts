import { apiRequest } from '../../lib/api'

export type FormType = 'STUDENT' | 'POPULATION_SURVEY'
export type DraftSummary = {
  id: string; formType: FormType; title?: string; version: number; createdAt: string; updatedAt: string
}
export type FormDraft = DraftSummary & {
  status: 'DRAFT' | 'COMPLETED'; data: Record<string, unknown>; recordId?: string
}
export type DraftCompletion = { draftId: string; formType: FormType; recordId: string }

export function listDrafts(formType: FormType) {
  return apiRequest<{ content: DraftSummary[] }>('/api/v1/form-drafts?' + new URLSearchParams({ formType, size: '100' }))
}
export const getDraft = (id: string) => apiRequest<FormDraft>(`/api/v1/form-drafts/${id}`)
export function createDraft(formType: FormType, data: object, title: string) {
  return apiRequest<FormDraft>('/api/v1/form-drafts', { method: 'POST', body: JSON.stringify({ formType, data, title }) })
}
export function updateDraft(draft: FormDraft, data: object, title: string) {
  return apiRequest<FormDraft>(`/api/v1/form-drafts/${draft.id}`, { method: 'PUT', body: JSON.stringify({ version: draft.version, data, title }) })
}
export function discardDraft(draft: FormDraft) {
  return apiRequest<void>(`/api/v1/form-drafts/${draft.id}?version=${draft.version}`, { method: 'DELETE' })
}
export function completeDraft(draft: FormDraft, submission: object) {
  return apiRequest<DraftCompletion>(`/api/v1/form-drafts/${draft.id}/complete`, { method: 'POST', body: JSON.stringify({ version: draft.version, submission }) })
}
