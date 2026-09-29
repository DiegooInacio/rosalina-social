import { StudentRegistrationForm } from './StudentRegistrationForm'

export function StudentRegistrationPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-950">Cadastro de aluno</h1>
      <p className="mt-2 text-slate-600">
        Preencha os dados de identificação, família e situação socioeconômica.
      </p>
      <StudentRegistrationForm />
    </div>
  )
}
