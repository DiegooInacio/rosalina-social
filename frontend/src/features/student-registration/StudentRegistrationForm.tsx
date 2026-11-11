import { Link } from 'react-router'
import { CollectionNotice } from '../../components/ui/CollectionNotice'
import { EditorActions } from '../records/EditorActions'
import { useEditBackup, type RecordEditor } from '../records/edit-session'
import { studentAddressFields } from '../../lib/cep-fields'
import { validateCep } from '../../lib/validate-cep'
import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { FormActions } from '../../components/ui/FormActions'
import { ClearFormButton } from '../../components/ui/ClearFormButton'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
import { ApiError } from '../../lib/api'
import { IdentificationSection } from './sections/IdentificationSection'
import { FamilySection } from './sections/FamilySection'
import { ParentsRelationshipSection } from './sections/ParentsRelationshipSection'
import { SocioeconomicSection } from './sections/SocioeconomicSection'
import { DraftPanel } from '../drafts/DraftPanel'
import { useFormDraft } from '../drafts/useFormDraft'
import { restoreDraftValues } from '../drafts/draft-storage'
import { mapStudentErrors } from './student-errors'
import {
  studentDefaultValues,
  studentSchema,
  toStudentRequest,
  type StudentFormData,
} from './student.schema'

const getDefaults = () => structuredClone(studentDefaultValues)
const restore = (data: Record<string, unknown>) => restoreDraftValues(getDefaults(), data)

export function StudentRegistrationForm({ editor }: { editor?: RecordEditor<StudentFormData> } = {}) {
  const [savedRecordId, setSavedRecordId] = useState<string | null>(null)
  const [submitMessage, setSubmitMessage] = useState<FormMessage | null>(null)

  const methods = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: editor?.initialValues ?? studentDefaultValues,
    mode: 'onTouched',
  })
  const {
    formState: { isSubmitting, isDirty, errors },
    handleSubmit,
  } = methods
  const draft = useFormDraft('STUDENT', methods, getDefaults, restore, !editor)
  useEditBackup(methods, editor)
  const hasData = isDirty || draft.hasDraft || ['pending', 'saving', 'error', 'conflict'].includes(draft.saveState)
  async function clearForm() {
    const cleared = await draft.discard()
    if (cleared) { setSubmitMessage(null); setSavedRecordId(null) }
    return cleared
  }

  async function verifyCompletion() {
    setSubmitMessage(null)
    try {
      const completion = await draft.retryCompletion()
      setSavedRecordId(completion.recordId)
      setSubmitMessage({ type: 'success', text: 'Aluno cadastrado com sucesso.' })
    } catch (error) {
      setSubmitMessage({ type: 'error', text: error instanceof Error ? error.message : 'Não foi possível conferir a conclusão. Tente novamente.' })
    }
  }

  async function onSubmit(data: StudentFormData) {
    setSavedRecordId(null)
    setSubmitMessage(null)

    try {
      if (!await validateCep(methods, 'zipCode', studentAddressFields)) {
        setSubmitMessage({ type: 'error', text: 'O cadastro não foi salvo. Confira o CEP informado.' })
        return
      }
      data = studentSchema.parse(methods.getValues())
      if (editor) { await editor.save(data); return }
      const completion = await draft.complete(toStudentRequest(data))
      setSavedRecordId(completion.recordId)
      setSubmitMessage({ type: 'success', text: 'Aluno cadastrado com sucesso.' })
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(mapStudentErrors(error.fields, data))) {
          methods.setError(field as Parameters<typeof methods.setError>[0], { type: 'server', message })
        }
      }
      const text =
        error instanceof ApiError
          ? `Não foi possível salvar o cadastro: ${error.message}`
          : 'Não foi possível salvar o cadastro. Tente novamente.'
      setSubmitMessage({ type: 'error', text })
    }
  }

  return (
    <FormProvider {...methods}>
      {!editor && <CollectionNotice />}
      {!editor && <DraftPanel draft={draft} onRetryComplete={() => void verifyCompletion()} />}
      <form className="mt-8" onSubmit={handleSubmit(onSubmit, () => {
        setSubmitMessage({ type: 'error', text: 'O cadastro não foi salvo. Revise os campos destacados e tente novamente.' })
      })} noValidate aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting || !draft.canEdit || Boolean(editor?.uncertain)} className="min-w-0 space-y-5">
          <legend className="sr-only">Cadastro de aluno</legend>
          {!editor && <div className="flex justify-end" role="group" aria-label="Ações no início do formulário">
            <ClearFormButton hasData={hasData} disabled={isSubmitting || !draft.canEdit}
              accessibleLabel="Limpar formulário pelo topo" onClear={clearForm} />
          </div>}
          <FormFeedback message={submitMessage} hasErrors={Object.keys(errors).length > 0} />
          {savedRecordId && <Link className="inline-flex min-h-11 items-center rounded-lg font-semibold text-link underline underline-offset-4" to={`/app/alunos/${savedRecordId}`}>Ver ficha do cadastro salvo</Link>}
          <IdentificationSection />
          <FamilySection />
          <ParentsRelationshipSection />
          <SocioeconomicSection />

          {!editor && <FormActions isDirty={hasData} isSubmitting={isSubmitting} disabled={!draft.canEdit} saveDisabled={!draft.canSubmit} onSaveDraft={draft.flush} submitLabel="Salvar cadastro" onClear={clearForm} />}
          {editor && <EditorActions busy={isSubmitting} dirty={isDirty || editor.hasBackup} cancel={editor.cancel} />}
        </fieldset>
      </form>
    </FormProvider>
  )
}
