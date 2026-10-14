import { useFormContext, useWatch } from 'react-hook-form'
import { CatalogSelect } from '../../../components/ui/CatalogSelect'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { Select } from '../../../components/ui/Select'
import { yesNoOptions } from '../../../lib/form-fields'
import type { StudentFormData } from '../student.schema'

const catalogs = [
  ['housingTypeId', 'Tipo de moradia', 'TIPO_MORADIA'],
  ['acquisitionTypeId', 'Forma de aquisição', 'FORMA_AQUISICAO'],
  ['wallTypeId', 'Tipo de vedação', 'TIPO_VEDACAO'],
  ['floorTypeId', 'Tipo de piso', 'TIPO_PISO'],
  ['waterSupplyId', 'Água', 'AGUA'],
  ['sewageId', 'Esgoto', 'ESGOTO'],
  ['garbageCollectionId', 'Coleta de lixo', 'COLETA_LIXO'],
] as const
const expenses = [
  ['waterExpense', 'Gasto mensal com água (R$)'],
  ['electricityExpense', 'Gasto mensal com luz (R$)'],
  ['phoneExpense', 'Gasto mensal com telefone (R$)'],
  ['rentOrFinancingExpense', 'Aluguel ou financiamento mensal (R$)'],
  ['foodExpense', 'Gasto mensal com alimentação (R$)'],
  ['householdIncome', 'Renda familiar mensal (R$)'],
] as const
const benefits = [
  ['receivesBolsaFamilia', 'Recebe Bolsa Família'],
  ['receivesBpc', 'Recebe Benefício de Prestação Continuada (BPC)'],
  ['receivesRetirement', 'Recebe aposentadoria ou equivalente'],
] as const

export function SocioeconomicSection() {
  const { register, control, setValue, formState: { errors } } = useFormContext<StudentFormData>()
  const assets = useWatch({ control, name: 'socioeconomic.hasOtherAssets' })
  const fieldErrors = errors.socioeconomic
  const assetRegistration = register('socioeconomic.hasOtherAssets')
  return (
    <FormSection title="Situação socioeconômica" description="Moradia, saneamento, despesas, renda, patrimônio e benefícios. Campos opcionais.">
      <div className="grid gap-4 sm:grid-cols-2">
        {catalogs.map(([field, label, category]) => (
          <CatalogSelect key={field} id={field} label={label} category={category} error={fieldErrors?.[field]?.message} {...register(`socioeconomic.${field}`)} />
        ))}
        <Select id="hasElectricity" label="Possui energia elétrica" placeholder="Não informado" options={yesNoOptions} error={fieldErrors?.hasElectricity?.message} {...register('socioeconomic.hasElectricity')} />
        {expenses.map(([field, label]) => (
          <Input key={field} id={field} label={label} inputMode="decimal" placeholder="Ex.: 150,50" error={fieldErrors?.[field]?.message} {...register(`socioeconomic.${field}`)} />
        ))}
        <Select id="hasOtherAssets" label="Possui outros bens patrimoniais" placeholder="Não informado" options={yesNoOptions} error={fieldErrors?.hasOtherAssets?.message} {...assetRegistration} onChange={(event) => {
          void assetRegistration.onChange(event)
          if (event.target.value !== 'true') {
            setValue('socioeconomic.hasOtherProperty', '', { shouldValidate: true })
            setValue('socioeconomic.hasVehicle', '', { shouldValidate: true })
          }
        }} />
        {assets === 'true' && (['hasOtherProperty', 'hasVehicle'] as const).map((field) => (
          <Select key={field} id={field} label={field === 'hasVehicle' ? 'Possui veículo' : 'Possui outro imóvel'} placeholder="Não informado" options={yesNoOptions} error={fieldErrors?.[field]?.message} {...register(`socioeconomic.${field}`)} />
        ))}
        {benefits.map(([field, label]) => (
          <Select key={field} id={field} label={label} placeholder="Não informado" options={yesNoOptions} error={fieldErrors?.[field]?.message} {...register(`socioeconomic.${field}`)} />
        ))}
      </div>
    </FormSection>
  )
}
