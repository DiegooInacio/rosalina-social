import { useFormContext } from 'react-hook-form'
import { Checkbox } from '../../../components/ui/Checkbox'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { MaskedInput } from '../../../components/ui/MaskedInput'
import { Select } from '../../../components/ui/Select'
import { useCatalog } from '../../catalogs/useCatalog'
import type { StudentFormData } from '../student.schema'

const statusOptions = [
  { value: 'ATIVO', label: 'Ativo' },
  { value: 'INATIVO', label: 'Inativo' },
]

export function IdentificationSection() {
  const {
    formState: { errors },
    register,
  } = useFormContext<StudentFormData>()
  const activities = useCatalog('ATIVIDADE')

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
        <Select
          id="activityId"
          label="Atividade matriculada"
          options={activityOptions}
          placeholder={activities.isLoading ? 'Carregando...' : 'Selecione a atividade'}
          error={activityError}
          {...register('activityId')}
        />

        <div className="sm:col-span-2">
          <Input id="name" label="Nome" error={errors.name?.message} {...register('name')} />
        </div>

        <MaskedInput
          id="birthDate"
          label="Data de nascimento"
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
          label="Telefone do responsável"
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