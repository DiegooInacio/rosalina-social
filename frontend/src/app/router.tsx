import { lazy, Suspense } from 'react'
import { Route, Routes } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { ActivitiesPage } from '../features/activities/ActivitiesPage'
import { RecordListPage } from '../features/records/RecordListPage'
import { RecordDetailsPage } from '../features/records/RecordDetailsPage'
import { AuthLayout } from '../layouts/AuthLayout'
import { PrivateLayout } from '../layouts/PrivateLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { LandingPage } from '../pages/landing/LandingPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'

const RecordEditPage = lazy(() => import('../features/records/RecordEditPage').then((module) => ({ default: module.RecordEditPage })))
const PopulationSurveyPage = lazy(() => import('../features/population-survey/PopulationSurveyPage').then((module) => ({ default: module.PopulationSurveyPage })))
const StudentRegistrationPage = lazy(() => import('../features/student-registration/StudentRegistrationPage').then((module) => ({ default: module.StudentRegistrationPage })))
export function AppRoutes() {
  return (
    <Suspense fallback={<p role="status" className="p-5 text-secondary">Carregando página...</p>}><Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>

      <Route path="app" element={<PrivateLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="alunos" element={<RecordListPage kind="students" />} />
        <Route path="alunos/:id/editar" element={<Suspense fallback={<p role="status">Carregando edição...</p>}><RecordEditPage kind="students" /></Suspense>} />
        <Route path="levantamentos/:id/editar" element={<Suspense fallback={<p role="status">Carregando edição...</p>}><RecordEditPage kind="population-surveys" /></Suspense>} />
        <Route path="alunos/:id" element={<RecordDetailsPage kind="students" />} />
        <Route path="levantamentos" element={<RecordListPage kind="population-surveys" />} />
        <Route path="levantamentos/:id" element={<RecordDetailsPage kind="population-surveys" />} />
        <Route path="alunos/novo" element={<StudentRegistrationPage />} />
        <Route path="levantamentos/novo" element={<PopulationSurveyPage />} />
        <Route path="atividades" element={<ActivitiesPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes></Suspense>
  )
}
