import { populationAddressFields } from '../../../lib/cep-fields'
import { useFormContext } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { ZipCodeInput } from '../../../components/ui/ZipCodeInput'
import { Select } from '../../../components/ui/Select'
import { states, type PopulationFormData } from '../population.schema'

const fields = [['street', 'Rua'], ['number', 'Número'], ['city', 'Cidade'], ['neighborhood', 'Bairro'], ['complement', 'Complemento']] as const
export function AddressSection() {
  const { register, formState: { errors } } = useFormContext<PopulationFormData>()
  return (
    <FormSection title="Endereço" description="Endereço residencial da família. Campos opcionais.">
      <div className="grid gap-4 sm:grid-cols-2">
        <ZipCodeInput id="address-zipCode" name="address.zipCode" addressFields={populationAddressFields} />
        {fields.map(([field, label]) => (
          <Input key={field} id={`address-${field}`} label={label} error={errors.address?.[field]?.message} {...register(`address.${field}`)} />
        ))}
        <Select id="address-state" label="UF" placeholder="Não informado" options={states.map((state) => ({ value: state, label: state }))} error={errors.address?.state?.message} {...register('address.state')} />
      </div>
    </FormSection>
  )
}
