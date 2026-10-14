import { useFormContext } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { Select } from '../../../components/ui/Select'
import { parentsRelationshipStatuses, type StudentFormData } from '../student.schema'

const labels: Record<(typeof parentsRelationshipStatuses)[number], string> = {
  CASADOS: 'Casados',
  SOLTEIROS: 'Solteiros',
  DIVORCIADOS: 'Divorciados',
  UNIAO_ESTAVEL: 'União estável',
  MAE_VIUVA: 'Mãe viúva',
  PAI_VIUVO: 'Pai viúvo',
  FALECIDOS: 'Falecidos',
}

const options = parentsRelationshipStatuses.map((value) => ({
  value,
  label: labels[value],
}))

export function ParentsRelationshipSection() {
  const {
    formState: { errors },
    register,
  } = useFormContext<StudentFormData>()

  return (
    <FormSection
      title="Situação dos pais"
      description="Informe a situação familiar dos pais do aluno, se conhecida."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="parentsRelationshipStatus"
          label="Situação dos pais (opcional)"
          placeholder="Não informado"
          options={options}
          error={errors.parentsRelationshipStatus?.message}
          {...register('parentsRelationshipStatus')}
        />
      </div>
    </FormSection>
  )
}
