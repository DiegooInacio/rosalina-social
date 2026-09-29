import { PopulationSurveyForm } from './PopulationSurveyForm'

export function PopulationSurveyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-slate-950">Levantamento populacional</h1>
      <p className="mt-2 text-slate-600">
        Registre as informações do responsável e da composição familiar.
      </p>
      <PopulationSurveyForm />
    </div>
  )
}
