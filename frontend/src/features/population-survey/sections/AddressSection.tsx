import { useFormContext } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import { Select } from '../../../components/ui/Select'
import { states, type PopulationFormData } from '../population.schema'

const fields = [['street', 'Rua'], ['number', 'Número'], ['city', 'Cidade'], ['neighborhood', 'Bairro'], ['complement', 'Complemento']] as const
export function AddressSection() {
  const { register, formState: { errors } } = useFormContext<PopulationFormData>()
  return (
    <FormSection title="Endereço" description="Endereço residencial da família. Campos opcionais.">
      <div className="grid gap-4 sm:grid-cols-2">
        <MaskedInput id="address-zipCode" label="CEP" mask="cep" error={errors.address?.zipCode?.message} {...register('address.zipCode')} />
        {fields.map(([field, label]) => (
          <Input key={field} id={`address-${field}`} label={label} error={errors.address?.[field]?.message} {...register(`address.${field}`)} />
        ))}
        <Select id="address-state" label="UF" placeholder="Não informado" options={states.map((state) => ({ value: state, label: state }))} error={errors.address?.state?.message} {...register('address.state')} />
      </div>
    </FormSection>
  )
}
