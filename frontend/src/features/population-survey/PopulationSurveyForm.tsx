import { FormSection } from '../../components/ui/FormSection'

const sections = [
  ['Responsável familiar', 'Identificação, documentos, escolaridade e contato.'],
  ['Endereço', 'Localização da residência da família.'],
  ['Moradia', 'Características e infraestrutura da residência.'],
  ['Trabalho e benefícios', 'Situação profissional e benefícios recebidos.'],
  ['Saúde', 'Necessidades especiais, medicamentos e alergias.'],
  ['Integrantes da família', 'Composição familiar, parentesco e renda.'],
  ['Resumo financeiro', 'Total da renda e renda per capita mensal.'],
  ['Autorizações e declaração', 'Consentimentos e dados da declaração final.'],
] as const

export function PopulationSurveyForm() {
  return (
    <div className="mt-8 space-y-5">
      {sections.map(([title, description]) => (
        <FormSection key={title} title={title} description={description} />
      ))}
    </div>
  )
}
