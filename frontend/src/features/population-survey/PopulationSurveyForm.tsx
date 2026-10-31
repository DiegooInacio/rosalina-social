import { Link } from 'react-router'
import { EditorActions } from '../records/EditorActions'
import { useEditBackup, type RecordEditor } from '../records/edit-session'
import { populationAddressFields } from '../../lib/cep-fields'
import { validateCep } from '../../lib/validate-cep'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { FormActions } from '../../components/ui/FormActions'
import { ClearFormButton } from '../../components/ui/ClearFormButton'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
import { ApiError } from '../../lib/api'
import { mapApiFormErrors } from '../../lib/api-form-errors'
import { DraftPanel } from '../drafts/DraftPanel'
import { useFormDraft } from '../drafts/useFormDraft'
import { restorePopulationDraft } from './population-draft'
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
import { calculateFinancialPreview, type FinancialSummary } from './financial-summary'

export function PopulationSurveyForm({ editor }: { editor?: RecordEditor<PopulationFormData> } = {}) {
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
  const [message, setMessage] = useState<FormMessage | null>(null)
  const [savedSummary, setSavedSummary] = useState<FinancialSummary | null>(null)
  const methods = useForm<PopulationFormData>({ resolver: zodResolver(populationSchema), defaultValues: editor?.initialValues ?? populationDefaultValues(), mode: 'onTouched' })
  const draft = useFormDraft('POPULATION_SURVEY', methods, populationDefaultValues, restorePopulationDraft, !editor)
  useEditBackup(methods, editor)
  const hasData = methods.formState.isDirty || draft.hasDraft || ['pending', 'saving', 'error', 'conflict'].includes(draft.saveState)
  async function clearForm() {
    const cleared = await draft.discard()
    if (cleared) { setMessage(null); setSavedSummary(null); setSavedRecordId(null) }
    return cleared
  }
  async function verifyCompletion() {
    setMessage(null)
    setSavedSummary(null)
    try {
      const completion = await draft.retryCompletion()
      setSavedRecordId(completion.recordId)
      setMessage({ type: 'success', text: 'Levantamento cadastrado com sucesso.' })
    } catch (error) {
      setMessage({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível conferir a conclusão. Tente novamente.' })
    }
  }

  async function onSubmit(data: PopulationFormData) {
    setSavedRecordId(null)
    setMessage(null)
    setSavedSummary(null)
    try {
      if (!await validateCep(methods, 'address.zipCode', populationAddressFields)) {
        setMessage({ type: 'error', text: 'O levantamento não foi salvo. Confira o CEP informado.' })
        return
      }
      data = populationSchema.parse(methods.getValues())
      if (editor) { await editor.save(data); return }
      const completion = await draft.complete(toPopulationRequest(data))
      setSavedRecordId(completion.recordId)
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
      {!editor && <DraftPanel draft={draft} onRetryComplete={() => void verifyCompletion()} />}
      <form className="mt-8" onSubmit={methods.handleSubmit(onSubmit, () => {
        setMessage({ type: 'error', text: 'O levantamento não foi salvo. Revise os campos destacados e tente novamente.' })
        setSavedSummary(null)
      })} noValidate aria-busy={methods.formState.isSubmitting}>
        <fieldset disabled={methods.formState.isSubmitting || !draft.canEdit || Boolean(editor?.uncertain)} className="min-w-0 space-y-5">
          <legend className="sr-only">Levantamento populacional</legend>
          {!editor && <div className="flex justify-end" role="group" aria-label="Ações no início do formulário">
            <ClearFormButton hasData={hasData} disabled={methods.formState.isSubmitting || !draft.canEdit}
              accessibleLabel="Limpar formulário pelo topo" onClear={clearForm} />
          </div>}
          <FormFeedback message={message} hasErrors={Object.keys(methods.formState.errors).length > 0} />
          {savedRecordId && <Link className="inline-flex min-h-11 items-center rounded-lg font-semibold text-link underline underline-offset-4" to={`/app/levantamentos/${savedRecordId}`}>Ver ficha do cadastro salvo</Link>}
          <ResponsibleSection />
          <AddressSection />
          <HousingSection />
          <WorkAndBenefitsSection />
          <HealthSection />
          <MembersSection />
          <FinancialSummarySection />
          <AuthorizationsSection />
          <DeclarationSection />
          {savedSummary && <div className="rounded-lg bg-success-soft p-4 text-sm text-link">
            <p className="font-semibold">Resumo financeiro do levantamento salvo</p>
            <p>Integrantes: {savedSummary.memberCount}</p>
            <p>Total: {savedSummary.totalIncome === null ? 'Não informado' : savedSummary.totalIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
            <p>Renda per capita: {savedSummary.perCapitaIncome === null ? 'Não informado' : savedSummary.perCapitaIncome.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</p>
          </div>}
          {!editor && <FormActions isDirty={hasData} isSubmitting={methods.formState.isSubmitting} disabled={!draft.canEdit} saveDisabled={!draft.canSubmit} onSaveDraft={draft.flush} submitLabel="Salvar levantamento" onClear={clearForm} />}
          {editor && <EditorActions busy={methods.formState.isSubmitting} dirty={methods.formState.isDirty || editor.hasBackup} cancel={editor.cancel} />}
        </fieldset>
      </form>
    </FormProvider>
  )
}
