import { useFormContext, useWatch } from 'react-hook-form'
import { FormSection } from '../../../components/ui/FormSection'
import { Input } from '../../../components/ui/Input'
import { RadioGroup } from '../../../components/ui/RadioGroup'
import { yesNoOptions } from '../../../lib/form-fields'
import type { PopulationFormData } from '../population.schema'

const fields = [
  ['works', 'Trabalha', 'occupation', 'Em que trabalha'],
  ['receivesBenefit', 'Recebe algum benefício', 'benefit', 'Qual benefício recebe'],
] as const

export function WorkAndBenefitsSection() {
  const { register, control, setValue, formState: { errors } } = useFormContext<PopulationFormData>()
  const [works, receivesBenefit] = useWatch({ control, name: ['workAndBenefits.works', 'workAndBenefits.receivesBenefit'] })
  const answers = { works, receivesBenefit }
  const e = errors.workAndBenefits
  return (
    <FormSection title="Trabalho e benefícios" description="Situação profissional, benefícios e cadastro habitacional. Campos opcionais.">
      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map(([condition, label, detail, detailLabel]) => {
          const registration = register(`workAndBenefits.${condition}`)
          return (
            <div key={condition} className="space-y-4">
              <RadioGroup id={`work-${condition}`} label={label} options={yesNoOptions} error={e?.[condition]?.message} {...registration} onChange={(event) => {
                void registration.onChange(event)
                if (event.target.value !== 'true') setValue(`workAndBenefits.${detail}`, '', { shouldValidate: true, shouldDirty: true })
              }} />
              {answers[condition] === 'true' && <Input id={`work-${detail}`} label={detailLabel} error={e?.[detail]?.message} {...register(`workAndBenefits.${detail}`)} />}
            </div>
          )
        })}
        <RadioGroup id="minhaCasaMinhaVidaRegistered" label="Cadastro no Minha Casa, Minha Vida" options={yesNoOptions} error={e?.minhaCasaMinhaVidaRegistered?.message} {...register('workAndBenefits.minhaCasaMinhaVidaRegistered')} />
      </div>
    </FormSection>
  )
}
