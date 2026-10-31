import { useEffect } from 'react'
import { MoneyInput } from '../../../components/ui/MoneyInput'
import { KinshipSelect } from '../../../components/ui/KinshipSelect'
import { cpfHint } from '../../../lib/document-hints'
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form'
import { Button } from '../../../components/ui/Button'
import { Checkbox } from '../../../components/ui/Checkbox'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import { memberDefaultValues, type PopulationFormData } from '../population.schema'

export function MembersSection() {
  const { register, control, getValues, setValue, setError, formState: { errors } } = useFormContext<PopulationFormData>()
  const { fields, append, remove } = useFieldArray({ control, name: 'members' })
  const members = useWatch({ control, name: 'members' })
  const responsible = useWatch({ control, name: 'responsible' })
  useEffect(() => {
    members.forEach((member, index) => {
      if (!member.isResponsible) return
      // Uma fonte vazia não elimina informações existentes somente no integrante.
      const linked: Partial<typeof member> = {}
      if (responsible.name) linked.name = responsible.name
      if (responsible.birthDate) {
        linked.birthDate = responsible.birthDate
        if (member.birthDate !== responsible.birthDate && !responsible.age) linked.age = ''
      }
      if (responsible.age) linked.age = responsible.age
      if (responsible.cpf) {
        linked.documentType = 'CPF'; linked.documentNumber = responsible.cpf
      } else if (responsible.documentType === 'CIN' && responsible.documentNumber) {
        linked.documentType = 'CIN'; linked.documentNumber = responsible.documentNumber
      }
      for (const key of ['name', 'birthDate', 'age', 'documentType', 'documentNumber'] as const) {
        const value = linked[key]
        if (value !== undefined && member[key] !== value) setValue(`members.${index}.${key}`, value, { shouldDirty: true })
      }
    })
  }, [members, responsible.name, responsible.birthDate, responsible.age, responsible.cpf, responsible.documentType, responsible.documentNumber, setValue])
  function addResponsible() {
    const r = getValues('responsible')
    if (!r.name.trim()) {
      setError('responsible.name', { message: 'Informe o nome antes de adicionar o responsável à família.' }, { shouldFocus: true })
      return
    }
    const members = getValues('members')
    if (members.some((member) => member.isResponsible)) return
    const documentType = r.cpf ? 'CPF' : ''
    append({ ...memberDefaultValues, name: r.name, age: r.age, birthDate: r.birthDate,
      documentType, documentNumber: r.cpf,
      kinship: 'Responsável', isResponsible: true })
  }
  return (
    <FormSection title="Integrantes da família" description="Adicione cada pessoa uma vez, incluindo o responsável. A identificação do responsável acompanha os dados preenchidos no início do formulário. Informações existentes somente no integrante são mantidas e podem ser editadas aqui. Informe renda zero quando não houver renda; deixe vazia quando desconhecida.">
      <div className="space-y-5">
        {(errors.members?.message || errors.members?.root?.message) && <p role="alert" data-form-error tabIndex={-1} className="text-sm text-danger">{errors.members?.message ?? errors.members?.root?.message}</p>}
        {fields.length === 0 && <p className="text-sm text-secondary">Nenhum integrante adicionado.</p>}
        {fields.map((field, index) => {
          const e = errors.members?.[index]
          const responsibleRegistration = register(`members.${index}.isResponsible`)
          return (
            <fieldset key={field.id} className="rounded-lg border border-line p-4">
              <legend className="px-2 font-semibold">Integrante {index + 1}</legend>
              <div className="grid gap-4 sm:grid-cols-2">
                <Input id={`member-${field.id}-name`} label="Nome completo (obrigatório)" aria-required="true" readOnly={members[index]?.isResponsible && Boolean(responsible.name)} error={e?.name?.message} {...register(`members.${index}.name`)} />
                <Controller control={control} name={`members.${index}.kinship`} render={({ field: input }) => <KinshipSelect {...input} id={`member-${field.id}-kinship`} label="Parentesco" error={e?.kinship?.message} />} />
                <Controller control={control} name={`members.${index}.documentNumber`} render={({ field: document }) => (
                  <MaskedInput {...document} id={`member-${field.id}-documentNumber`} label="CPF" hint={members[index]?.isResponsible && (responsible.cpf || responsible.documentType === 'CIN' && responsible.documentNumber) ? 'Atualizado pelos dados do responsável familiar.' : cpfHint} mask="cpf" readOnly={members[index]?.isResponsible && Boolean(responsible.cpf || responsible.documentType === 'CIN' && responsible.documentNumber)}
                    error={e?.documentNumber?.message ?? e?.documentType?.message}
                    onChange={(event) => {
                      document.onChange(event)
                      setValue(`members.${index}.documentType`, event.target.value ? members[index]?.documentType === 'CIN' ? 'CIN' : 'CPF' : '', { shouldDirty: true })
                    }} />
                )} />
                <MaskedInput id={`member-${field.id}-birthDate`} label="Data de nascimento" mask="date" readOnly={members[index]?.isResponsible && Boolean(responsible.birthDate)} placeholder="dd/mm/aaaa" error={e?.birthDate?.message} {...register(`members.${index}.birthDate`)} />
                <Input id={`member-${field.id}-age`} label="Idade na data de referência" readOnly={members[index]?.isResponsible && Boolean(responsible.age || responsible.birthDate)} inputMode="numeric" placeholder="Calculada ao salvar se houver nascimento" error={e?.age?.message} {...register(`members.${index}.age`)} />
                <Controller control={control} name={`members.${index}.income`} render={({ field: input }) => <MoneyInput id={`member-${field.id}-income`} label="Renda mensal (R$)" name={input.name} ref={input.ref} value={input.value} onValueChange={input.onChange} onBlur={input.onBlur} error={e?.income?.message} />} />
                <div>
                  <Checkbox id={`member-${field.id}-isResponsible`} label="É o responsável familiar" aria-invalid={Boolean(e?.isResponsible)} aria-describedby={e?.isResponsible ? `member-${field.id}-isResponsible-error` : undefined} {...responsibleRegistration} onChange={(event) => {
                    if (event.target.checked && !responsible.name.trim()) {
                      event.target.checked = false
                      setError('responsible.name', { message: 'Informe o nome do responsável familiar primeiro.' }, { shouldFocus: true })
                      return
                    }
                    if (event.target.checked && members[index].name && members[index].name !== responsible.name && !window.confirm('Usar os dados do responsável familiar neste integrante? Nome, nascimento, idade e CPF serão substituídos.')) {
                      event.target.checked = false
                      return
                    }
                    void responsibleRegistration.onChange(event)
                    if (event.target.checked) getValues('members').forEach((_, otherIndex) => {
                      if (otherIndex !== index) setValue(`members.${otherIndex}.isResponsible`, false, { shouldDirty: true })
                    })
                  }} />
                  {e?.isResponsible?.message && <p id={`member-${field.id}-isResponsible-error`} role="alert" className="text-sm text-danger">{e.isResponsible.message}</p>}
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
