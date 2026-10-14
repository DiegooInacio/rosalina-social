import { apiRequest } from '../../lib/api'
import type { toPopulationRequest } from './population.schema'
import type { FinancialSummary } from './financial-summary'

export function createPopulationSurvey(body: ReturnType<typeof toPopulationRequest>) {
  return apiRequest<{ id: string; financialSummary: FinancialSummary }>('/api/v1/population-surveys', { method: 'POST', body: JSON.stringify(body) })
}
