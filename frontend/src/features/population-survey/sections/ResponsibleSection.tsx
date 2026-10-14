import { useFormContext } from 'react-hook-form'
import { CatalogSelect } from '../../../components/ui/CatalogSelect'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import { Select } from '../../../components/ui/Select'
import type { PopulationFormData } from '../population.schema'

const catalogs = [
  ['birthSexId', 'Sexo atribuído ao nascimento', 'SEXO_NASCIMENTO'],
  ['racialIdentityId', 'Identificação racial', 'IDENTIFICACAO_RACIAL'],
  ['genderIdentityId', 'Identificação de gênero', 'GENERO'],
  ['sexualOrientationId', 'Orientação sexual', 'ORIENTACAO_SEXUAL'],
  ['maritalStatusId', 'Estado civil', 'ESTADO_CIVIL'],
  ['educationId', 'Escolaridade', 'ESCOLARIDADE'],
  ['schoolTypeId', 'Tipo de escola', 'TIPO_ESCOLA'],
] as const

export function ResponsibleSection() {
  const { register, formState: { errors } } = useFormContext<PopulationFormData>()
  const e = errors.responsible
  return (
    <FormSection title="Responsável familiar" description="O nome é obrigatório. Os demais dados são opcionais. As opções de seleção são fornecidas pela organização.">
      <div className="grid gap-4 sm:grid-cols-2">
        <MaskedInput id="referenceDate" label="Data de referência (obrigatória)" mask="date" placeholder="dd/mm/aaaa" aria-required="true" error={errors.referenceDate?.message} {...register('referenceDate')} />
        <Input id="responsible-name" label="Nome (obrigatório)" aria-required="true" error={e?.name?.message} {...register('responsible.name')} />
        <Input id="socialName" label="Nome social" error={e?.socialName?.message} {...register('responsible.socialName')} />
        <MaskedInput id="responsible-birthDate" label="Data de nascimento" mask="date" placeholder="dd/mm/aaaa" error={e?.birthDate?.message} {...register('responsible.birthDate')} />
        <Input id="age" label="Idade na data de referência" inputMode="numeric" placeholder="Calculada ao salvar se houver nascimento" error={e?.age?.message} {...register('responsible.age')} />
        {catalogs.map(([field, label, category]) => (
          <CatalogSelect key={field} id={field} label={label} category={category} error={e?.[field]?.message} {...register(`responsible.${field}`)} />
        ))}
        <Select id="documentType" label="Tipo de documento" placeholder="Não informado" options={[{ value: 'RG', label: 'RG' }, { value: 'CIN', label: 'CIN' }]} error={e?.documentType?.message} {...register('responsible.documentType')} />
        <Input id="documentNumber" label="Número do RG ou CIN" error={e?.documentNumber?.message} {...register('responsible.documentNumber')} />
        <MaskedInput id="responsible-cpf" label="CPF" mask="cpf" error={e?.cpf?.message} {...register('responsible.cpf')} />
        <MaskedInput id="responsible-phone" label="Telefone" mask="phone" type="tel" error={e?.phone?.message} {...register('responsible.phone')} />
        <Input id="birthplace" label="Naturalidade" error={e?.birthplace?.message} {...register('responsible.birthplace')} />
        <Input id="nationality" label="Nacionalidade" error={e?.nationality?.message} {...register('responsible.nationality')} />
        <Input id="responsible-nis" label="NIS" inputMode="numeric" error={e?.nis?.message} {...register('responsible.nis')} />
        <Input id="responsible-email" label="E-mail" type="email" error={e?.email?.message} {...register('responsible.email')} />
        <Input id="responsible-voterRegistration" label="Título eleitoral" error={e?.voterRegistration?.message} {...register('responsible.voterRegistration')} />
      </div>
    </FormSection>
  )
}
