import { useFormContext } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import type { PopulationFormData } from '../population.schema'

export function DeclarationSection() {
  const { register, formState: { errors } } = useFormContext<PopulationFormData>()
  const e = errors.declaration
  return (
    <FormSection title="Declaração e assinaturas" description="Informe o local, a data e os nomes digitados para as assinaturas. Campos opcionais.">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="declaration-location" label="Local" error={e?.location?.message} {...register('declaration.location')} />
        <MaskedInput id="declaration-date" label="Data da declaração" mask="date" placeholder="dd/mm/aaaa" error={e?.date?.message} {...register('declaration.date')} />
        <Input id="responsibleSignatureName" label="Assinatura do responsável (nome digitado)" error={e?.responsibleSignatureName?.message} {...register('declaration.responsibleSignatureName')} />
        <Input id="registrarSignatureName" label="Assinatura de quem realizou o cadastro (nome digitado)" error={e?.registrarSignatureName?.message} {...register('declaration.registrarSignatureName')} />
      </div>
    </FormSection>
  )
}
