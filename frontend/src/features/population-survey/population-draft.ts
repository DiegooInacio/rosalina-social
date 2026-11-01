import { restoreDraftValues } from '../drafts/draft-storage'
import { isValidCpf } from '../../lib/validators'
import { memberDefaultValues, populationDefaultValues } from './population.schema'

export function restorePopulationDraft(data: Record<string, unknown>) {
  const values = restoreDraftValues(populationDefaultValues(), data, { members: memberDefaultValues })
  const r = values.responsible
  if (r.documentType === 'CIN') {
    // Não apaga números divergentes: o formulário permite conferir o rascunho.
    const sameCpf = isValidCpf(r.cpf) && isValidCpf(r.documentNumber)
      && r.cpf.replace(/\D/g, '') === r.documentNumber.replace(/\D/g, '')
    if (!r.cpf.trim() || !r.documentNumber.trim() || sameCpf) {
      if (!r.cpf.trim()) r.cpf = r.documentNumber
      r.documentType = ''
      r.documentNumber = ''
    }
  }
  for (const member of values.members) {
    if (member.documentType === 'CIN') member.documentType = 'CPF'
  }
  return values
}
