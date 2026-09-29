import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { loginSchema, type LoginFormData } from './auth.schema'

export function LoginForm() {
  const {
    formState: { errors },
    handleSubmit,
    register,
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  })

  function handleLogin(_data: LoginFormData) {
    window.alert('A integração com a autenticação ainda será implementada.')
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
      <Button type="submit" className="w-full">
        Entrar
      </Button>
    </form>
  )
}
