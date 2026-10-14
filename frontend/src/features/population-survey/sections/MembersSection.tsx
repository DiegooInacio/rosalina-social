import { useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import { Select } from '../../../components/ui/Select'
import { memberDefaultValues, type PopulationFormData } from '../population.schema'

export function MembersSection() {
  const { register, control, getValues, setValue, setError, formState: { errors } } = useFormContext<PopulationFormData>()
  const { fields, append, remove } = useFieldArray({ control, name: 'members' })
  const members = useWatch({ control, name: 'members' })
  function addResponsible() {
    const r = getValues('responsible')
    if (!r.name.trim()) {
      setError('responsible.name', { message: 'Informe o nome antes de adicionar o responsável à família.' }, { shouldFocus: true })
      return
    }
    const members = getValues('members')
    if (members.some((member) => member.isResponsible)) return
    const documentType = r.cpf ? 'CPF' : r.documentType === 'CIN' ? 'CIN' : ''
    append({ ...memberDefaultValues, name: r.name, age: r.age, birthDate: r.birthDate,
      documentType, documentNumber: documentType === 'CPF' ? r.cpf : documentType === 'CIN' ? r.documentNumber : '',
      kinship: 'Responsável', isResponsible: true })
  }
  return (
    <FormSection title="Integrantes da família" description="Adicione cada pessoa uma vez, incluindo o responsável. Informe renda zero quando não houver renda; deixe vazia quando desconhecida.">
      <div className="space-y-5">
        {(errors.members?.message || errors.members?.root?.message) && <p role="alert" className="text-sm text-red-600">{errors.members?.message ?? errors.members?.root?.message}</p>}
        {fields.length === 0 && <p className="text-sm text-slate-600">Nenhum integrante adicionado.</p>}
        {fields.map((field, index) => {
          const e = errors.members?.[index]
          const responsibleRegistration = register(`members.${index}.isResponsible`)
          return (
            <fieldset key={field.id} className="rounded-lg border border-slate-200 p-4">
              <legend className="px-2 font-semibold">Integrante {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id={`member-${field.id}-name`} label="Nome completo (obrigatório)" aria-required="true" error={e?.name?.message} {...register(`members.${index}.name`)} />
                <Input id={`member-${field.id}-kinship`} label="Parentesco" error={e?.kinship?.message} {...register(`members.${index}.kinship`)} />
                <Select id={`member-${field.id}-documentType`} label="Tipo de documento" placeholder="Não informado" options={[{ value: 'CPF', label: 'CPF' }, { value: 'CIN', label: 'CIN' }]} error={e?.documentType?.message} {...register(`members.${index}.documentType`)} />
                <Input id={`member-${field.id}-documentNumber`} label="Número do CPF ou CIN" error={e?.documentNumber?.message} {...register(`members.${index}.documentNumber`)} />
                <MaskedInput id={`member-${field.id}-birthDate`} label="Data de nascimento" mask="date" placeholder="dd/mm/aaaa" error={e?.birthDate?.message} {...register(`members.${index}.birthDate`)} />
                <Input id={`member-${field.id}-age`} label="Idade na data de referência" inputMode="numeric" placeholder="Calculada ao salvar se houver nascimento" error={e?.age?.message} {...register(`members.${index}.age`)} />
                <Input id={`member-${field.id}-income`} label="Renda mensal (R$)" inputMode="decimal" placeholder="Ex.: 150,50" error={e?.income?.message} {...register(`members.${index}.income`)} />
                <div>
                  <Checkbox id={`member-${field.id}-isResponsible`} label="É o responsável familiar" {...responsibleRegistration} onChange={(event) => {
                    void responsibleRegistration.onChange(event)
                    if (event.target.checked) getValues('members').forEach((_, otherIndex) => {
                      if (otherIndex !== index) setValue(`members.${otherIndex}.isResponsible`, false, { shouldDirty: true })
                    })
                  }} />
                  {e?.isResponsible?.message && <p role="alert" className="text-sm text-red-600">{e.isResponsible.message}</p>}
                </div>
              </div>
              <Button type="button" variant="secondary" className="mt-4" onClick={() => {
                if (window.confirm(`Remover o integrante ${index + 1} da família?`)) remove(index)
              }}>Remover integrante {index + 1}</Button>
            </fieldset>
          )
        })}
        <div className="flex flex-wrap gap-3">
          <Button type="button" variant="secondary" disabled={members.some((member) => member.isResponsible)} onClick={addResponsible}>Adicionar responsável à família</Button>
          <Button type="button" variant="secondary" onClick={() => append({ ...memberDefaultValues })}>Adicionar integrante</Button>
        </div>
      </div>
    </FormSection>
  )
}
