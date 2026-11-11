import { cpfHint, rgHint } from '../../../lib/document-hints'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { CatalogSelect } from '../../../components/ui/CatalogSelect'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import type { PopulationFormData } from '../population.schema'

const catalogs = [
  ['birthSexId', 'Sexo atribuído ao nascimento', 'SEXO_NASCIMENTO'],
  ['racialIdentityId', 'Identificação racial', 'IDENTIFICACAO_RACIAL'],
  ['genderIdentityId', 'Identificação de gênero', 'GENERO'],
  ['sexualOrientationId', 'Orientação sexual', 'ORIENTACAO_SEXUAL'],
  ['maritalStatusId', 'Estado civil / situação conjugal', 'ESTADO_CIVIL'],
  ['educationId', 'Escolaridade', 'ESCOLARIDADE'],
  ['schoolTypeId', 'Tipo de escola', 'TIPO_ESCOLA'],
] as const

export function ResponsibleSection() {
  const { register, control, setValue, formState: { errors } } = useFormContext<PopulationFormData>()
  const documentType = useWatch({ control, name: 'responsible.documentType' })
  const e = errors.responsible
  return (
    <FormSection title="Responsável familiar" description="Preencha o nome e as seis classificações obrigatórias para concluir. Não informado é uma resposta válida. Rascunhos podem ficar incompletos; os demais dados são opcionais.">
      <div className="grid gap-4 sm:grid-cols-2">
        <MaskedInput id="referenceDate" label="Data de referência (obrigatória)" mask="date" placeholder="dd/mm/aaaa" aria-required="true" error={errors.referenceDate?.message} {...register('referenceDate')} />
        <Input id="responsible-name" label="Nome (obrigatório)" aria-required="true" error={e?.name?.message} {...register('responsible.name')} />
        <Input id="socialName" label="Nome social" error={e?.socialName?.message} {...register('responsible.socialName')} />
        <MaskedInput id="responsible-birthDate" label="Data de nascimento" mask="date" placeholder="dd/mm/aaaa" error={e?.birthDate?.message} {...register('responsible.birthDate')} />
        <Input id="age" label="Idade na data de referência" inputMode="numeric" placeholder="Calculada ao salvar se houver nascimento" error={e?.age?.message} {...register('responsible.age')} />
        {catalogs.map(([field, label, category]) => (
          <CatalogSelect key={field} id={field} label={field === 'educationId' ? label : `${label} (obrigatório)`} required={field !== 'educationId'} category={category} error={e?.[field]?.message} {...register(`responsible.${field}`)} />
        ))}
        <MaskedInput id="responsible-cpf" label="CPF" hint={cpfHint} mask="cpf" error={e?.cpf?.message} {...register('responsible.cpf')} />
        <Controller control={control} name="responsible.documentNumber" render={({ field }) => (
          <Input {...field} id="documentNumber"
            label={documentType === 'CIN' ? 'CIN informada no rascunho anterior' : 'RG antigo (opcional)'}
            hint={documentType === 'CIN' ? 'O rascunho contém uma CIN diferente do CPF informado. Confira os números e mantenha o correto no campo CPF; depois, apague este campo.' : rgHint}
            error={e?.documentNumber?.message ?? e?.documentType?.message}
            onChange={(event) => {
              field.onChange(event)
              setValue('responsible.documentType', event.target.value ? documentType === 'CIN' ? 'CIN' : 'RG' : '', { shouldDirty: true })
            }} />
        )} />
        <MaskedInput id="responsible-phone" label="Telefone" mask="phone" type="tel" error={e?.phone?.message} {...register('responsible.phone')} />
        <Input id="birthplace" label="Naturalidade" error={e?.birthplace?.message} {...register('responsible.birthplace')} />
        <Input id="nationality" label="Nacionalidade" error={e?.nationality?.message} {...register('responsible.nationality')} />
        <MaskedInput id="responsible-nis" label="NIS" mask="digits" maxLength={20} error={e?.nis?.message} {...register('responsible.nis')} />
        <Input id="responsible-email" label="E-mail" type="email" error={e?.email?.message} {...register('responsible.email')} />
        <Input id="responsible-voterRegistration" label="Título eleitoral" error={e?.voterRegistration?.message} {...register('responsible.voterRegistration')} />
      </div>
    </FormSection>
  )
}
