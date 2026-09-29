import { Route, Routes } from 'react-router'
import { LoginPage } from '../features/auth/LoginPage'
import { PopulationSurveyPage } from '../features/population-survey/PopulationSurveyPage'
import { StudentRegistrationPage } from '../features/student-registration/StudentRegistrationPage'
import { AuthLayout } from '../layouts/AuthLayout'
import { PrivateLayout } from '../layouts/PrivateLayout'
import { PublicLayout } from '../layouts/PublicLayout'
import { DashboardPage } from '../pages/dashboard/DashboardPage'
import { LandingPage } from '../pages/landing/LandingPage'
import { NotFoundPage } from '../pages/not-found/NotFoundPage'

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<LandingPage />} />
      </Route>

      <Route element={<AuthLayout />}>
        <Route path="login" element={<LoginPage />} />
      </Route>

      <Route path="app" element={<PrivateLayout />}>
        <Route index element={<DashboardPage />} />
        <Route path="alunos/novo" element={<StudentRegistrationPage />} />
        <Route path="levantamentos/novo" element={<PopulationSurveyPage />} />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
