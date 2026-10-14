import { useFormContext } from 'react-hook-form'
import { Checkbox } from '../../../components/ui/Checkbox'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import { Select, type SelectOption } from '../../../components/ui/Select'
import type { CatalogItem } from '../../catalogs/catalog.api'
import { useCatalog } from '../../catalogs/useCatalog'
import type { StudentFormData } from '../student.schema'

type Person = 'father' | 'mother' | 'guardian'

type PersonFieldsProps = {
  person: Person
  title: string
  showKinship?: boolean
  occupationOptions: SelectOption[]
  educationOptions: SelectOption[]
  isLoading: boolean
}

// Os campos de UMA pessoa. Usado três vezes: pai, mãe e responsável.
function PersonFields({
  person,
  title,
  showKinship = false,
  occupationOptions,
  educationOptions,
  isLoading,
}: PersonFieldsProps) {
  const {
    formState: { errors },
    register,
  } = useFormContext<StudentFormData>()
  const fieldErrors = errors[person]

  return (
    <div className="border-t border-slate-200 pt-6 first:border-t-0 first:pt-0">
      <h3 className="mb-4 text-base font-semibold text-slate-900">{title}</h3>
      <div className="grid gap-4 sm:grid-cols-2">
        {showKinship && (
          <div className="sm:col-span-2">
            <Input
              id={`${person}-kinship`}
              label="Grau de parentesco"
              placeholder="Ex.: avó, tio, irmã"
              error={fieldErrors?.kinship?.message}
              {...register(`${person}.kinship`)}
            />
          </div>
        )}

        <div className="sm:col-span-2">
          <Input
            id={`${person}-name`}
            label="Nome"
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
          placeholder={isLoading ? 'Carregando...' : 'Selecione a ocupação'}
          error={fieldErrors?.occupationId?.message}
          {...register(`${person}.occupationId`)}
        />
        <Select
          id={`${person}-educationId`}
          label="Escolaridade"
          options={educationOptions}
          placeholder={isLoading ? 'Carregando...' : 'Selecione a escolaridade'}
          error={fieldErrors?.educationId?.message}
          {...register(`${person}.educationId`)}
        />

        <div className="sm:col-span-2">
          <Checkbox
            id={`${person}-literate`}
            label="Sabe ler e escrever"
            {...register(`${person}.literate`)}
          />
        </div>

        <Input
          id={`${person}-rg`}
          label="RG"
          error={fieldErrors?.rg?.message}
          {...register(`${person}.rg`)}
        />
        <MaskedInput
          id={`${person}-cpf`}
          label="CPF"
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
    </div>
  )
}

function toOptions(items: CatalogItem[]): SelectOption[] {
  return items.map((item) => ({ value: item.id, label: item.name }))
}

export function FamilySection() {
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
      description="O responsável é obrigatório. Pai e mãe são opcionais."
    >
      {hasError && (
        <p role="alert" className="mb-4 text-sm text-red-600">
          Não foi possível carregar as listas de ocupação e escolaridade.
        </p>
      )}
      <div className="space-y-6">
        <PersonFields
          person="guardian"
          title="Responsável"
          showKinship
          occupationOptions={occupationOptions}
          educationOptions={educationOptions}
          isLoading={isLoading}
        />
        <PersonFields
          person="father"
          title="Pai"
          occupationOptions={occupationOptions}
          educationOptions={educationOptions}
          isLoading={isLoading}
        />
        <PersonFields
          person="mother"
          title="Mãe"
          occupationOptions={occupationOptions}
          educationOptions={educationOptions}
          isLoading={isLoading}
        />
      </div>
    </FormSection>
  )
}