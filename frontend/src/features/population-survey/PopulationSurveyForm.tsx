import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { FormActions } from '../../components/ui/FormActions'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
import { ApiError } from '../../lib/api'
import { mapApiFormErrors } from '../../lib/api-form-errors'
import { DraftPanel } from '../drafts/DraftPanel'
import { useFormDraft } from '../drafts/useFormDraft'
import { restoreDraftValues } from '../drafts/draft-storage'
import { memberDefaultValues, populationDefaultValues, populationSchema, toPopulationRequest, type PopulationFormData } from './population.schema'
import { ResponsibleSection } from './sections/ResponsibleSection'
import { AddressSection } from './sections/AddressSection'
import { HousingSection } from './sections/HousingSection'
import { WorkAndBenefitsSection } from './sections/WorkAndBenefitsSection'
import { HealthSection } from './sections/HealthSection'
import { MembersSection } from './sections/MembersSection'
import { FinancialSummarySection } from './sections/FinancialSummarySection'
import { AuthorizationsSection } from './sections/AuthorizationsSection'
import { DeclarationSection } from './sections/DeclarationSection'
import { calculateFinancialPreview, type FinancialSummary } from './financial-summary'

const restore = (data: Record<string, unknown>) => restoreDraftValues(populationDefaultValues(), data, { members: memberDefaultValues })

export function PopulationSurveyForm() {
  const [message, setMessage] = useState<FormMessage | null>(null)
  const [savedSummary, setSavedSummary] = useState<FinancialSummary | null>(null)
  const methods = useForm<PopulationFormData>({ resolver: zodResolver(populationSchema), defaultValues: populationDefaultValues() })
  const draft = useFormDraft('POPULATION_SURVEY', methods, populationDefaultValues, restore)
  async function onSubmit(data: PopulationFormData) {
    setMessage(null)
    setSavedSummary(null)
    try {
      await draft.complete(toPopulationRequest(data))
      const preview = calculateFinancialPreview(data.members)
      setSavedSummary({ memberCount: preview.memberCount, incomeComplete: preview.incomeComplete,
        totalIncome: preview.totalCents === null ? null : Number(preview.totalCents) / 100,
        perCapitaIncome: preview.perCapitaCents === null ? null : Number(preview.perCapitaCents) / 100 })
      setMessage({ type: 'success', text: 'Levantamento cadastrado com sucesso.' })
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, text] of Object.entries(mapApiFormErrors(error.fields, data))) {
          methods.setError(field as Parameters<typeof methods.setError>[0], { type: 'server', message: text })
        }
      }
      setMessage({ type: 'error', text: error instanceof ApiError ? `Não foi possível salvar o levantamento: ${error.message}` : 'Não foi possível salvar o levantamento. Tente novamente.' })
    }
  }
  return (
    <FormProvider {...methods}>
      <DraftPanel draft={draft} onRetryComplete={() => void methods.handleSubmit(onSubmit)()} />
      <form className="mt-8" onSubmit={methods.handleSubmit(onSubmit, () => {
        setMessage({ type: 'error', text: 'O levantamento não foi salvo. Revise os campos destacados e tente novamente.' })
        setSavedSummary(null)
      })} noValidate aria-busy={methods.formState.isSubmitting}>
        <fieldset disabled={methods.formState.isSubmitting || !draft.canEdit} className="min-w-0 space-y-5">
          <legend className="sr-only">Levantamento populacional</legend>
          <FormFeedback message={message} hasErrors={Object.keys(methods.formState.errors).length > 0} />
          <ResponsibleSection />
          <AddressSection />
          <HousingSection />
          <WorkAndBenefitsSection />
          <HealthSection />
          <MembersSection />
          <FinancialSummarySection />
          <AuthorizationsSection />
          <DeclarationSection />
          {savedSummary && <div className="rounded-lg bg-brand-50 p-4 text-sm text-brand-700">
            <p className="font-semibold">Resumo financeiro do levantamento salvo</p>
            <p>Integrantes: {savedSummary.memberCount}</p>
            <p>Total: {savedSummary.totalIncome === null ? 'Não informado' : savedSummary.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p>Renda per capita: {savedSummary.perCapitaIncome === null ? 'Não informado' : savedSummary.perCapitaIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>}
          <FormActions isDirty={methods.formState.isDirty || draft.hasDraft} isSubmitting={methods.formState.isSubmitting} disabled={!draft.canEdit} saveDisabled={!draft.canSubmit} onSaveDraft={draft.flush} submitLabel="Salvar levantamento" onClear={async () => {
            const cleared = await draft.discard()
            if (cleared) { setMessage(null); setSavedSummary(null) }
            return cleared
          }} />
        </fieldset>
      </form>
    </FormProvider>
  )
}
