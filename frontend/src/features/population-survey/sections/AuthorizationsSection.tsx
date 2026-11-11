import { useFormContext } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { RadioGroup } from '../../../components/ui/RadioGroup'
import type { PopulationFormData } from '../population.schema'

const options = [{ value: 'true', label: 'Autorizo' }, { value: 'false', label: 'Não autorizo' }]
export function AuthorizationsSection() {
  const { register, watch, formState: { errors } } = useFormContext<PopulationFormData>()
  const personalData = watch('authorizations.personalData')
  return (
    <FormSection title="Autorizações" description="As respostas são independentes. Estas opções não substituem a informação sobre as finalidades e a base legal de cada uso dos dados.">
      <div className="grid gap-4 sm:grid-cols-2">
        <RadioGroup id="imageAndSound" label="Uso de imagem e som" options={options} error={errors.authorizations?.imageAndSound?.message} {...register('authorizations.imageAndSound')} />
        <RadioGroup id="personalData" label="Tratamento de dados pessoais" options={options} error={errors.authorizations?.personalData?.message} {...register('authorizations.personalData')} />
      </div>
      {personalData !== 'true' && <p role="note" className="mt-4 text-sm text-warning">
        {personalData === 'false' ? 'A recusa está registrada no preenchimento.' : 'Não há autorização informada para o tratamento de dados pessoais.'}
        {' '}O salvamento e os rascunhos continuam ativos. Usos que dependam de consentimento não podem ocorrer sem autorização válida.
        Confirme com a associação quais dados podem ser coletados e mantidos sob outra base legal.
      </p>}
    </FormSection>
  )
}
