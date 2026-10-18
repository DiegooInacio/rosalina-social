import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
<<<<<<< Updated upstream
import { Button } from '../../components/ui/Button'
=======
import { FormActions } from '../../components/ui/FormActions'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
>>>>>>> Stashed changes
import { ApiError } from '../../lib/api'
import { IdentificationSection } from './sections/IdentificationSection'
import { FamilySection } from './sections/FamilySection'
import { ParentsRelationshipSection } from './sections/ParentsRelationshipSection'
import { SocioeconomicSection } from './sections/SocioeconomicSection'
import { createStudent } from './student.api'
import {
  studentDefaultValues,
  studentSchema,
  toStudentRequest,
  type StudentFormData,
} from './student.schema'

type SubmitMessage = { type: 'success' | 'error'; text: string }

export function StudentRegistrationForm() {
  const [submitMessage, setSubmitMessage] = useState<SubmitMessage | null>(null)

  const methods = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: studentDefaultValues,
  })
  const {
<<<<<<< Updated upstream
    formState: { isSubmitting },
=======
    formState: { isSubmitting, isDirty, errors },
>>>>>>> Stashed changes
    handleSubmit,
    reset,
  } = methods

  async function onSubmit(data: StudentFormData) {
    setSubmitMessage(null)

    try {
      await createStudent(toStudentRequest(data))
      reset(studentDefaultValues)
      setSubmitMessage({ type: 'success', text: 'Aluno cadastrado com sucesso.' })
    } catch (error) {
      if (error instanceof ApiError) {
        for (const [field, message] of Object.entries(error.fields)) {
          if (field.startsWith('socioeconomic.') || field === 'parentsRelationshipStatus') {
            methods.setError(field as Parameters<typeof methods.setError>[0], { message })
          }
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
<<<<<<< Updated upstream
      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit)} noValidate>
        <IdentificationSection />
        <FamilySection />
        <ParentsRelationshipSection />
        <SocioeconomicSection />

        {submitMessage && (
          <p
            role="alert"
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              submitMessage.type === 'success'
                ? 'bg-brand-100 text-brand-700'
                : 'bg-red-50 text-red-700'
            }`}
          >
            {submitMessage.text}
          </p>
        )}

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar cadastro'}
        </Button>
=======
      <form className="mt-8" onSubmit={handleSubmit(onSubmit, () => {
        setSubmitMessage({ type: 'error', text: 'O cadastro não foi salvo. Revise os campos destacados e tente novamente.' })
      })} noValidate aria-busy={isSubmitting}>
        <fieldset disabled={isSubmitting} className="min-w-0 space-y-5">
          <legend className="sr-only">Cadastro de aluno</legend>
          <FormFeedback message={submitMessage} hasErrors={Object.keys(errors).length > 0} />
          <IdentificationSection />
          <FamilySection />
          <ParentsRelationshipSection />
          <SocioeconomicSection />

          <FormActions isDirty={isDirty} isSubmitting={isSubmitting} submitLabel="Salvar cadastro" onClear={() => {
            reset(studentDefaultValues)
            setSubmitMessage(null)
          }} />
        </fieldset>
>>>>>>> Stashed changes
      </form>
    </FormProvider>
  )
}
