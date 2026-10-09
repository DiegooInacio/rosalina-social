import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { ApiError } from '../../lib/api'
import { setTokens } from '../../lib/auth'
import { login } from './auth.api'
import { loginSchema, type LoginFormData } from './auth.schema'

export function LoginForm() {
  const navigate = useNavigate()
  const {
    formState: { errors, isSubmitting },
    handleSubmit,
    register,
    setError,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  async function handleLogin(data: LoginFormData) {
    try {
      const tokens = await login(data.email, data.password)
      setTokens(tokens.accessToken, tokens.refreshToken)
      navigate('/app')
    } catch (error) {
      if (error instanceof ApiError && (error.status === 401 || error.status === 403)) {
        setError('root', { message: 'E-mail ou senha incorretos.' })
      } else {
        setError('root', {
          message: 'Não foi possível conectar ao servidor. Tente novamente.',
        })
      }
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit(handleLogin)} noValidate>
      <Input
        id="email"
        type="email"
        autoComplete="email"
        label="E-mail"
        error={errors.email?.message}
        {...register('email')}
      />
      <Input
        id="password"
        type="password"
        autoComplete="current-password"
        label="Senha"
        error={errors.password?.message}
        {...register('password')}
      />
      {errors.root && (
        <p role="alert" className="text-sm text-red-600">
          {errors.root.message}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={isSubmitting}>
        {isSubmitting ? 'Entrando...' : 'Entrar'}
      </Button>
    </form>
  )
}