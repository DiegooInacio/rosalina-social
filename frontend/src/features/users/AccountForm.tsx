import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { Select } from '../../components/ui/Select'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
import { ApiError } from '../../lib/api'
import { getUserSubject } from '../../lib/auth'
import { createUser, updateUser, type ManagedUser, type UserRole } from './users.api'

const roles = [{ value: 'OPERADOR', label: 'Operador' }, { value: 'ADMIN', label: 'Administrador' }]
const passwordRule = (value: string) => value.trim().length > 0 && value.length >= 8 && value.length <= 100 && new TextEncoder().encode(value).length <= 72 || 'Use de 8 a 100 caracteres, com no máximo 72 bytes (acentos ocupam mais espaço).'
const errorText = (error: unknown) => error instanceof ApiError ? error.message : 'Não foi possível salvar. Tente novamente.'

type AccountValues = { name: string; email: string; role: UserRole; password: string; confirmation: string }
export function AccountForm({ user, onSaved, onCancel }: { user?: ManagedUser; onSaved: (user: ManagedUser) => void; onCancel?: () => void }) {
  const [message, setMessage] = useState<FormMessage | null>(null)
  const { register, handleSubmit, getValues, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm<AccountValues>({ defaultValues: { name: user?.name ?? '', email: user?.email ?? '', role: user?.role ?? 'OPERADOR', password: '', confirmation: '' } })
  const self = user?.email === getUserSubject()
  const submit = handleSubmit(async (values) => {
    setMessage(null)
    try {
      const data = { name: values.name.trim(), role: values.role }
      const saved = user ? await updateUser(user.id, data) : await createUser({ ...data, email: values.email.trim(), password: values.password })
      reset({ name: '', email: '', role: 'OPERADOR', password: '', confirmation: '' })
      onSaved(saved)
    } catch (error) {
      if (error instanceof ApiError) for (const [field, message] of Object.entries(error.fields)) {
        if (['name', 'email', 'role', 'password'].includes(field)) setError(field as keyof AccountValues, { message })
      }
      setMessage({ type: 'error', text: errorText(error) })
    }
  })
  return <form onSubmit={submit} aria-label={user ? `Editar ${user.name}` : 'Criar conta'} className="space-y-4" noValidate>
    <fieldset disabled={isSubmitting} className="grid min-w-0 gap-4 sm:grid-cols-2">
      <legend className="sr-only">Dados da conta</legend>
      <Input id={user ? 'edit-user-name' : 'new-user-name'} label="Nome (obrigatório)" autoComplete="off" maxLength={150} error={errors.name?.message} {...register('name', { validate: value => Boolean(value.trim()) || 'Informe o nome.', maxLength: { value: 150, message: 'Use até 150 caracteres.' } })} />
      <Input id={user ? 'edit-user-email' : 'new-user-email'} label="E-mail de acesso (obrigatório)" type="email" autoComplete="off" readOnly={Boolean(user)} maxLength={255} error={errors.email?.message} hint={user ? 'O e-mail identifica a conta e não pode ser alterado nesta tela.' : undefined} {...register('email', { validate: value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()) || 'Informe um e-mail válido.', maxLength: { value: 255, message: 'Use até 255 caracteres.' } })} />
      <Select id={user ? 'edit-user-role' : 'new-user-role'} label="Cargo (obrigatório)" required options={roles} disabled={self} error={errors.role?.message} {...register('role', { required: 'Selecione o cargo.' })} />
      {self && <p className="text-sm text-secondary">Seu cargo de administrador está protegido. Para sua senha, use <Link to="/app/perfil" className="text-link underline">Meu perfil</Link>.</p>}
      {!user && <>
        <Input id="new-user-password" label="Senha inicial (obrigatória)" type="password" autoComplete="new-password" error={errors.password?.message} hint="A pessoa pode alterar a senha em Meu perfil após entrar." {...register('password', { validate: passwordRule })} />
        <Input id="new-user-confirmation" label="Confirmar senha (obrigatório)" type="password" autoComplete="new-password" error={errors.confirmation?.message} {...register('confirmation', { validate: value => value === getValues('password') || 'As senhas não coincidem.' })} />
      </>}
      <div className="flex flex-wrap gap-2 sm:col-span-2">
        <Button type="submit" loading={isSubmitting}>{user ? 'Salvar alterações' : 'Criar conta'}</Button>
        {onCancel && <Button type="button" variant="secondary" onClick={() => {
          if (isDirty && !window.confirm(user ? 'Descartar as alterações e voltar à lista de usuários?' : 'Descartar o preenchimento e voltar à lista de usuários?')) return
          onCancel()
        }}>{user ? 'Cancelar edição' : 'Cancelar'}</Button>}
      </div>
    </fieldset>
    <FormFeedback message={message} hasErrors={Object.keys(errors).length > 0} />
  </form>
}

