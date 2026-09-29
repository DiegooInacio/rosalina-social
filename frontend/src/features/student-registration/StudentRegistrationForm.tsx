import { FormSection } from '../../components/ui/FormSection'

const sections = [
  ['Identificação do aluno', 'Dados pessoais, documentos, endereço e contato.'],
  ['Informações familiares', 'Dados do pai, da mãe e do responsável.'],
  ['Situação dos pais', 'Situação familiar informada no cadastro.'],
  ['Situação socioeconômica', 'Moradia, saneamento, despesas, renda e benefícios.'],
] as const

export function StudentRegistrationForm() {
  return (
    <div className="mt-8 space-y-5">
      {sections.map(([title, description]) => (
        <FormSection key={title} title={title} description={description} />
      ))}
    </div>
  )
}
