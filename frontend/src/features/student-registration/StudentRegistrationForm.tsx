import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { FormProvider, useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { FormSection } from '../../components/ui/FormSection'
import { ApiError } from '../../lib/api'
import { IdentificationSection } from './sections/IdentificationSection'
import { FamilySection } from './sections/FamilySection'
import { createStudent } from './student.api'
import {
  studentDefaultValues,
  studentSchema,
  toStudentRequest,
  type StudentFormData,
} from './student.schema'

// Seções que ainda vão ser construídas
const pendingSections = [
  ['Situação dos pais', 'Situação familiar informada no cadastro.'],
  ['Situação socioeconômica', 'Moradia, saneamento, despesas, renda e benefícios.'],
] as const

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
        {pendingSections.map(([title, description]) => (
          <FormSection key={title} title={title} description={description} />
        ))}

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