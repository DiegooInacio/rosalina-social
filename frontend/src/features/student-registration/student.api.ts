import { apiRequest } from '../../lib/api'
import type { toStudentRequest } from './student.schema'

export function createStudent(body: ReturnType<typeof toStudentRequest>) {
  return apiRequest<unknown>('/api/v1/students', {
    method: 'POST',
    body: JSON.stringify(body),
  })
}