import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
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
    formState: { isSubmitting },
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
        error instanceof ApiError && error.status === 400
          ? `O servidor recusou os dados: ${error.message}`
          : 'Não foi possível salvar o cadastro. Tente novamente.'
      setSubmitMessage({ type: 'error', text })
    }
  }

  return (
    <FormProvider {...methods}>
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
      </form>
    </FormProvider>
  )
}
