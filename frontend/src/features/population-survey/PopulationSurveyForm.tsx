import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
import { ApiError } from '../../lib/api'
import { mapApiFormErrors } from '../../lib/api-form-errors'
import { createPopulationSurvey } from './population.api'
import { populationDefaultValues, populationSchema, toPopulationRequest, type PopulationFormData } from './population.schema'
import { ResponsibleSection } from './sections/ResponsibleSection'
import { AddressSection } from './sections/AddressSection'
import { HousingSection } from './sections/HousingSection'
import { WorkAndBenefitsSection } from './sections/WorkAndBenefitsSection'
import { HealthSection } from './sections/HealthSection'
import { MembersSection } from './sections/MembersSection'
import { FinancialSummarySection } from './sections/FinancialSummarySection'
import { AuthorizationsSection } from './sections/AuthorizationsSection'
import { DeclarationSection } from './sections/DeclarationSection'
import type { FinancialSummary } from './financial-summary'

export function PopulationSurveyForm() {
  const [message, setMessage] = useState<FormMessage | null>(null)
  const [savedSummary, setSavedSummary] = useState<FinancialSummary | null>(null)
  const methods = useForm<PopulationFormData>({ resolver: zodResolver(populationSchema), defaultValues: populationDefaultValues() })
  async function onSubmit(data: PopulationFormData) {
    setMessage(null)
    setSavedSummary(null)
    try {
      const saved = await createPopulationSurvey(toPopulationRequest(data))
      setSavedSummary(saved.financialSummary)
      methods.reset(populationDefaultValues())
      setMessage({ type: 'success', text: 'Levantamento cadastrado com sucesso.' })
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, text] of Object.entries(mapApiFormErrors(error.fields, data))) {
          methods.setError(field as Parameters<typeof methods.setError>[0], { type: 'server', message: text })
        }
      }
      setMessage({ type: 'error', text: error instanceof ApiError ? error.message : 'Não foi possível salvar o levantamento. Tente novamente.' })
    }
  }
  return (
    <FormProvider {...methods}>
      <form className="mt-8 space-y-5" onSubmit={methods.handleSubmit(onSubmit, () => {
        setMessage({ type: 'error', text: 'O levantamento não foi salvo. Revise os campos destacados e tente novamente.' })
        setSavedSummary(null)
      })} noValidate>
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
        <Button type="submit" disabled={methods.formState.isSubmitting}>{methods.formState.isSubmitting ? 'Salvando...' : 'Salvar levantamento'}</Button>
      </form>
    </FormProvider>
  )
}
