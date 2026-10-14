import { useFormContext, useWatch } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { Select } from '../../../components/ui/Select'
import { Textarea } from '../../../components/ui/Textarea'
import { yesNoOptions } from '../../../lib/form-fields'
import type { PopulationFormData } from '../population.schema'

const fields = [
  ['hasDisability', 'Possui deficiência ou necessidade especial', 'disabilityDescription', 'Qual deficiência ou necessidade especial'],
  ['continuousMedication', 'Faz uso contínuo de medicamentos', 'medications', 'Quais medicamentos utiliza'],
] as const

export function HealthSection() {
  const { register, control, setValue, formState: { errors } } = useFormContext<PopulationFormData>()
  const [hasDisability, continuousMedication] = useWatch({ control, name: ['health.hasDisability', 'health.continuousMedication'] })
  const answers = { hasDisability, continuousMedication }
  const e = errors.health
  return (
    <FormSection title="Saúde" description="Necessidades especiais, medicamentos, atestado e alergias. Campos opcionais.">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([condition, label, detail, detailLabel]) => {
          const registration = register(`health.${condition}`)
          return (
            <div key={condition} className="space-y-4">
              <Select id={`health-${condition}`} label={label} placeholder="Não informado" options={yesNoOptions} error={e?.[condition]?.message} {...registration} onChange={(event) => {
                void registration.onChange(event)
                if (event.target.value !== 'true') setValue(`health.${detail}`, '', { shouldValidate: true, shouldDirty: true })
              }} />
              {answers[condition] === 'true' && <Textarea id={`health-${detail}`} label={detailLabel} error={e?.[detail]?.message} {...register(`health.${detail}`)} />}
            </div>
          )
        })}
        <Select id="medicalCertificatePresented" label="Apresentou atestado médico" placeholder="Não informado" options={yesNoOptions} error={e?.medicalCertificatePresented?.message} {...register('health.medicalCertificatePresented')} />
        <Textarea id="allergies" label="Alergias" placeholder="Informe as alergias, se houver." error={e?.allergies?.message} {...register('health.allergies')} />
      </div>
    </FormSection>
  )
}
