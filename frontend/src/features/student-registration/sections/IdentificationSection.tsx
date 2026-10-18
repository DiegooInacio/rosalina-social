import { useEffect } from 'react'
import { Link } from 'react-router'
import { useFormContext, useWatch } from 'react-hook-form'
import { Checkbox } from '../../../components/ui/Checkbox'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import { Select } from '../../../components/ui/Select'
import { useCatalog } from '../../catalogs/useCatalog'
import { getUserRole } from '../../../lib/auth'
import type { StudentFormData } from '../student.schema'

const statusOptions = [
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'INATIVO', label: 'Inativo' },
]

export function IdentificationSection() {
  const {
    formState: { errors, isSubmitted },
    register,
    control,
    setValue,
  } = useFormContext<StudentFormData>()
  const activities = useCatalog('ATIVIDADE')
  const activityId = useWatch({ control, name: 'activityId' })
  useEffect(() => {
    if (!activities.isLoading && !activities.hasError && activityId && !activities.items.some((item) => item.id === activityId)) {
      setValue('activityId', '', { shouldDirty: true, shouldValidate: isSubmitted })
    }
  }, [activities.isLoading, activities.hasError, activities.items, activityId, setValue, isSubmitted])

  const activityOptions = activities.items.map((item) => ({
    value: item.id,
    label: item.name,
  }))

  const activityError =
    errors.activityId?.message ??
    (activities.hasError ? 'Não foi possível carregar as atividades.' : undefined)

  return (
    <FormSection
      title="Identificação do aluno"
      description="Dados pessoais, documentos, endereço e contato."
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Select
          id="status"
          label="Status"
          options={statusOptions}
          placeholder="Selecione o status"
          error={errors.status?.message}
          {...register('status')}
        />
        <div>
          <Select
            id="activityId"
            label="Atividade matriculada (obrigatória)"
            aria-required="true"
            options={activityOptions}
            placeholder={activities.isLoading ? 'Carregando...' : activities.hasError ? 'Falha ao carregar atividades' : activities.items.length === 0 ? 'Nenhuma atividade disponível' : 'Selecione a atividade'}
            disabled={activities.isLoading || activities.hasError}
            error={activityError}
            {...register('activityId')}
          />
          <div className="mt-1 flex flex-wrap items-center gap-x-4">
            <button type="button" disabled={activities.isLoading} onClick={activities.reload} className="min-h-11 text-sm font-medium text-brand-700 underline underline-offset-4 disabled:opacity-60">
              {activities.isLoading ? 'Atualizando...' : 'Atualizar atividades'}
            </button>
            {getUserRole() === 'ADMIN' && <Link to="/app/atividades" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center text-sm font-medium text-brand-700 underline underline-offset-4">
              Gerenciar atividades <span className="sr-only">(abre em nova aba)</span>
            </Link>}
          </div>
          {!activities.isLoading && !activities.hasError && activities.items.length === 0 && <p className="text-sm text-slate-600">{getUserRole() === 'ADMIN' ? 'Cadastre uma atividade e atualize a lista para selecioná-la.' : 'Peça a um administrador para cadastrar uma atividade.'}</p>}
        </div>

        <div className="sm:col-span-2">
          <Input id="name" label="Nome (obrigatório)" aria-required="true" error={errors.name?.message} {...register('name')} />
        </div>

        <MaskedInput
          id="birthDate"
          label="Data de nascimento (obrigatória)"
          aria-required="true"
          mask="date"
          placeholder="dd/mm/aaaa"
          error={errors.birthDate?.message}
          {...register('birthDate')}
        />
        <MaskedInput
          id="startDate"
          label="Data de início"
          mask="date"
          placeholder="dd/mm/aaaa"
          error={errors.startDate?.message}
          {...register('startDate')}
        />

        <Input id="rg" label="RG" error={errors.rg?.message} {...register('rg')} />
        <MaskedInput
          id="cpf"
          label="CPF"
          mask="cpf"
          error={errors.cpf?.message}
          {...register('cpf')}
        />
        <Input id="nis" label="NIS" error={errors.nis?.message} {...register('nis')} />
        <Input
          id="nationalHealthCard"
          label="Cartão Nacional de Saúde"
          error={errors.nationalHealthCard?.message}
          {...register('nationalHealthCard')}
        />

        <div className="sm:col-span-2">
          <Checkbox id="cadunico" label="Possui Cadastro Único (CadÚnico)" {...register('cadunico')} />
        </div>

        <div className="sm:col-span-2">
          <Input
            id="address"
            label="Endereço"
            error={errors.address?.message}
            {...register('address')}
          />
        </div>
        <Input
          id="neighborhood"
          label="Bairro"
          error={errors.neighborhood?.message}
          {...register('neighborhood')}
        />
        <Input
          id="referencePoint"
          label="Ponto de referência"
          error={errors.referencePoint?.message}
          {...register('referencePoint')}
        />
        <Input id="city" label="Cidade" error={errors.city?.message} {...register('city')} />
        <MaskedInput
          id="zipCode"
          label="CEP"
          mask="cep"
          error={errors.zipCode?.message}
          {...register('zipCode')}
        />

        <MaskedInput
          id="guardianPhone"
          label="Telefone do responsável (obrigatório)"
          aria-required="true"
          mask="phone"
          type="tel"
          error={errors.guardianPhone?.message}
          {...register('guardianPhone')}
        />
        <Input
          id="guardianEmail"
          label="E-mail do responsável"
          type="email"
          error={errors.guardianEmail?.message}
          {...register('guardianEmail')}
        />
        <MaskedInput
          id="studentPhone"
          label="Telefone do aluno"
          mask="phone"
          type="tel"
          error={errors.studentPhone?.message}
          {...register('studentPhone')}
        />
        <Input
          id="studentEmail"
          label="E-mail do aluno"
          type="email"
          error={errors.studentEmail?.message}
          {...register('studentEmail')}
        />
      </div>
    </FormSection>
  )
}
