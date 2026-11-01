import { cpfHint, rgHint } from '../../../lib/document-hints'
import { useEffect, useRef } from 'react'
import { Controller, useFormContext, useWatch } from 'react-hook-form'
import { NullableBooleanSelect } from '../../../components/ui/NullableBooleanSelect'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import { Select, type SelectOption } from '../../../components/ui/Select'
import type { CatalogItem } from '../../catalogs/catalog.api'
import { useCatalog } from '../../catalogs/useCatalog'
import { primaryRelative } from '../relative.schema'
import { KinshipSelect } from '../../../components/ui/KinshipSelect'
import type { StudentFormData } from '../student.schema'

type Person = 'father' | 'mother' | 'guardian'

type PersonFieldsProps = {
  person: Person
  title: string
  showKinship?: boolean
  required?: boolean
  occupationOptions: SelectOption[]
  educationOptions: SelectOption[]
  isLoading: boolean
}

// Os campos de UMA pessoa. Usado três vezes: pai, mãe e responsável.
function PersonFields({
  person,
  title,
  showKinship = false,
  required = false,
  occupationOptions,
  educationOptions,
  isLoading,
}: PersonFieldsProps) {
  const {
    formState: { errors },
    register,
    control,
  } = useFormContext<StudentFormData>()
  const [occupationId, educationId] = useWatch({ control, name: [`${person}.occupationId`, `${person}.educationId`] })
  const fieldErrors = errors[person]
  const details = useRef<HTMLDetailsElement>(null)
  useEffect(() => {
    if (fieldErrors && details.current) details.current.open = true
  }, [fieldErrors])

  return (
    <details ref={details} open={person === 'mother'} className="group rounded-lg border border-line p-4">
      <summary className="min-h-11 cursor-pointer rounded-md px-2 py-2 text-base font-semibold text-foreground transition-colors hover:bg-canvas">
        {title}<span className="ml-3 text-sm font-normal text-muted group-open:hidden">Mostrar dados</span><span className="ml-3 hidden text-sm font-normal text-muted group-open:inline">Esconder dados</span>
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {showKinship && (
          <div className="sm:col-span-2">
            <Controller control={control} name={`${person}.kinship`} render={({ field }) => (
              <KinshipSelect {...field} id={`${person}-kinship`} label="Grau de parentesco" error={fieldErrors?.kinship?.message} />
            )} />
          </div>
        )}

        <div className="sm:col-span-2">
          <Input
            id={`${person}-name`}
              label={person === 'guardian' ? required ? 'Nome do responsável (obrigatório)' : 'Nome do responsável' : person === 'mother' ? 'Nome da mãe' : 'Nome do pai'}
            aria-required={required}
            error={fieldErrors?.name?.message}
            {...register(`${person}.name`)}
          />
        </div>

        <MaskedInput
          id={`${person}-birthDate`}
          label="Data de nascimento"
          mask="date"
          placeholder="dd/mm/aaaa"
          error={fieldErrors?.birthDate?.message}
          {...register(`${person}.birthDate`)}
        />
        <MaskedInput
          id={`${person}-phone`}
          label="Telefone"
          mask="phone"
          type="tel"
          error={fieldErrors?.phone?.message}
          {...register(`${person}.phone`)}
        />

        <Select
          id={`${person}-occupationId`}
          label="Ocupação"
          options={occupationOptions}
          value={occupationId}
          placeholder={isLoading ? 'Carregando...' : 'Selecione a ocupação'}
          error={fieldErrors?.occupationId?.message}
          {...register(`${person}.occupationId`)}
        />
        <Select
          id={`${person}-educationId`}
          label="Escolaridade"
          options={educationOptions}
          value={educationId}
          placeholder={isLoading ? 'Carregando...' : 'Selecione a escolaridade'}
          error={fieldErrors?.educationId?.message}
          {...register(`${person}.educationId`)}
        />

        <div className="sm:col-span-2">
          <Controller control={control} name={`${person}.literate`} render={({ field }) => (
            <NullableBooleanSelect {...field} id={`${person}-literate`} label="Sabe ler e escrever" />
          )} />
        </div>

        <Input
          id={`${person}-rg`}
          label="RG antigo (opcional)" hint={rgHint}
          error={fieldErrors?.rg?.message}
          {...register(`${person}.rg`)}
        />
        <MaskedInput
          id={`${person}-cpf`}
          label="CPF" hint={cpfHint}
          mask="cpf"
          error={fieldErrors?.cpf?.message}
          {...register(`${person}.cpf`)}
        />
        <Input
          id={`${person}-voterRegistration`}
          label="Título de eleitor"
          error={fieldErrors?.voterRegistration?.message}
          {...register(`${person}.voterRegistration`)}
        />
      </div>
    </details>
  )
}

function toOptions(items: CatalogItem[]): SelectOption[] {
  return items.map((item) => ({ value: item.id, label: item.name }))
}

export function FamilySection() {
  const { control } = useFormContext<StudentFormData>()
  const [mother, father, guardian] = useWatch({ control, name: ['mother', 'father', 'guardian'] })
  const primary = primaryRelative({ mother, father, guardian })
  const guardianRequired = !mother.name.trim() && !father.name.trim()
  // Busca as listas uma vez só e repassa para as três pessoas
  const occupations = useCatalog('OCUPACAO')
  const education = useCatalog('ESCOLARIDADE')

  const occupationOptions = toOptions(occupations.items)
  const educationOptions = toOptions(education.items)
  const isLoading = occupations.isLoading || education.isLoading
  const hasError = occupations.hasError || education.hasError

  return (
    <FormSection
      title="Informações familiares"
      description="Preencha primeiro a mãe. Se ela não for informada, preencha o pai. Sem mãe nem pai, informe outro responsável. Esconder uma seção mantém os dados preenchidos."
    >
      {hasError && (
        <p role="alert" className="mb-4 text-sm text-danger">
          Não foi possível carregar as listas de ocupação e escolaridade.
        </p>
      )}
      {primary && <p className="mb-4 text-sm text-secondary" aria-live="polite">Referência familiar: {primary === 'mother' ? 'mãe' : primary === 'father' ? 'pai' : 'responsável'}.</p>}
      <div className="space-y-4">
        {([['mother', 'Mãe'], ['father', 'Pai'], ['guardian', 'Responsável']] as const).map(([person, title]) => (
          <PersonFields key={person} person={person} title={title} showKinship={person === 'guardian'}
            required={person === 'guardian' && guardianRequired}
            occupationOptions={occupationOptions} educationOptions={educationOptions} isLoading={isLoading} />
        ))}
      </div>
    </FormSection>
  )
}
