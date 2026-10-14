import { useFormContext } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { Select } from '../../../components/ui/Select'
import type { PopulationFormData } from '../population.schema'

const options = [{ value: 'true', label: 'Autorizo' }, { value: 'false', label: 'Não autorizo' }]
export function AuthorizationsSection() {
  const { register, formState: { errors } } = useFormContext<PopulationFormData>()
  return (
    <FormSection title="Autorizações" description="As decisões são independentes. Não é necessário autorizar para salvar o levantamento.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id="imageAndSound" label="Uso de imagem e som" placeholder="Não informado" options={options} error={errors.authorizations?.imageAndSound?.message} {...register('authorizations.imageAndSound')} />
        <Select id="personalData" label="Tratamento de dados pessoais" placeholder="Não informado" options={options} error={errors.authorizations?.personalData?.message} {...register('authorizations.personalData')} />
      </div>
    </FormSection>
  )
}
