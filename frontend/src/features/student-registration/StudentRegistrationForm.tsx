import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
import { ApiError } from '../../lib/api'
import { IdentificationSection } from './sections/IdentificationSection'
import { FamilySection } from './sections/FamilySection'
import { ParentsRelationshipSection } from './sections/ParentsRelationshipSection'
import { SocioeconomicSection } from './sections/SocioeconomicSection'
import { createStudent } from './student.api'
import { mapStudentErrors } from './student-errors'
import {
  studentDefaultValues,
  studentSchema,
  toStudentRequest,
  type StudentFormData,
} from './student.schema'

export function StudentRegistrationForm() {
  const [submitMessage, setSubmitMessage] = useState<FormMessage | null>(null)

  const methods = useForm<StudentFormData>({
    resolver: zodResolver(studentSchema),
    defaultValues: studentDefaultValues,
  })
  const {
    formState: { isSubmitting, errors },
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
        for (const [field, message] of Object.entries(mapStudentErrors(error.fields, data))) {
          methods.setError(field as Parameters<typeof methods.setError>[0], { type: 'server', message })
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
      <form className="mt-8 space-y-5" onSubmit={handleSubmit(onSubmit, () => {
        setSubmitMessage({ type: 'error', text: 'O cadastro não foi salvo. Revise os campos destacados e tente novamente.' })
      })} noValidate>
        <FormFeedback message={submitMessage} hasErrors={Object.keys(errors).length > 0} />
        <IdentificationSection />
        <FamilySection />
        <ParentsRelationshipSection />
        <SocioeconomicSection />

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando...' : 'Salvar cadastro'}
        </Button>
      </form>
    </FormProvider>
  )
}
