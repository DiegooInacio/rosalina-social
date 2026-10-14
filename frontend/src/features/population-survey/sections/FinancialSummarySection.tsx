import { useFormContext, useWatch } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { calculateFinancialPreview, formatCents } from '../financial-summary'
import type { PopulationFormData } from '../population.schema'

export function FinancialSummarySection() {
  const { control } = useFormContext<PopulationFormData>()
  const members = useWatch({ control, name: 'members' })
  const summary = calculateFinancialPreview(members)
  return (
    <FormSection title="Resumo financeiro familiar" description="Prévia das rendas dos integrantes cadastrados. O valor final é calculado ao salvar. A quantidade de moradores da residência não altera esta divisão.">
      <dl className="grid gap-4 sm:grid-cols-3" aria-live="polite">
        <div><dt className="text-sm text-slate-600">Número de integrantes</dt><dd className="mt-1 font-semibold">{summary.memberCount}</dd></div>
        <div><dt className="text-sm text-slate-600">Total da renda mensal</dt><dd className="mt-1 font-semibold">{formatCents(summary.totalCents)}</dd></div>
        <div><dt className="text-sm text-slate-600">Renda per capita mensal</dt><dd className="mt-1 font-semibold">{formatCents(summary.perCapitaCents)}</dd></div>
      </dl>
      {!summary.incomeComplete && <p className="mt-4 text-sm text-slate-600">Adicione os integrantes e informe todas as rendas válidas para calcular o resumo.</p>}
    </FormSection>
  )
}
