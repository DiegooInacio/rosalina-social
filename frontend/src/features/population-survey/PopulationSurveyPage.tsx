import { PopulationSurveyForm } from './PopulationSurveyForm'

export function PopulationSurveyPage() {
  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground">Levantamento populacional</h1>
      <p className="mt-2 text-secondary">
        Registre as informações do responsável e da composição familiar.
      </p>
      <PopulationSurveyForm />
    </div>
  )
}
