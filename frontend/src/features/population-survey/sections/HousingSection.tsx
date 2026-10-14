import { useFormContext, useWatch } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import { Select } from '../../../components/ui/Select'
import { yesNoOptions } from '../../../lib/form-fields'
import type { PopulationFormData } from '../population.schema'

const types = [{ value: 'PROPRIA', label: 'Própria' }, { value: 'ALUGADA', label: 'Alugada' }, { value: 'CEDIDA', label: 'Cedida' }, { value: 'FINANCIADA', label: 'Financiada' }]
const quantities = [['roomCount', 'Quantidade de compartimentos'], ['monthsInCommunity', 'Tempo na comunidade (meses)'], ['monthsAtAddress', 'Tempo no endereço (meses)'], ['residentCount', 'Quantidade de pessoas residentes']] as const
const infrastructure = [['pipedWater', 'Água encanada / CAGECE'], ['electricity', 'Energia elétrica'], ['sewage', 'Esgoto']] as const
export function HousingSection() {
  const { register, control, setValue, formState: { errors } } = useFormContext<PopulationFormData>()
  const type = useWatch({ control, name: 'housing.type' })
  const typeRegistration = register('housing.type')
  const e = errors.housing
  return (
    <FormSection title="Moradia" description="Características e infraestrutura da residência. Tempos de residência em meses inteiros. Campos opcionais.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Select id="housing-type" label="Tipo de moradia" placeholder="Não informado" options={types} error={e?.type?.message} {...typeRegistration} onChange={(event) => {
          void typeRegistration.onChange(event)
          if (event.target.value !== 'ALUGADA') {
            setValue('housing.landlordName', '', { shouldValidate: true })
            setValue('housing.landlordPhone', '', { shouldValidate: true })
          }
        }} />
        {type === 'ALUGADA' && <>
          <Input id="landlordName" label="Nome do proprietário" error={e?.landlordName?.message} {...register('housing.landlordName')} />
          <MaskedInput id="landlordPhone" label="Telefone do proprietário" mask="phone" type="tel" error={e?.landlordPhone?.message} {...register('housing.landlordPhone')} />
        </>}
        {quantities.map(([field, label]) => (
          <Input key={field} id={field} label={label} inputMode="numeric" error={e?.[field]?.message} {...register(`housing.${field}`)} />
        ))}
        {infrastructure.map(([field, label]) => (
          <Select key={field} id={field} label={label} placeholder="Não informado" options={yesNoOptions} error={e?.[field]?.message} {...register(`housing.${field}`)} />
        ))}
      </div>
    </FormSection>
  )
}
