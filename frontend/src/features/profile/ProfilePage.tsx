import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../components/ui/Button'
import { FormFeedback, type FormMessage } from '../../components/ui/FormFeedback'
import { FormSection } from '../../components/ui/FormSection'
import { Input } from '../../components/ui/Input'
import { ApiError } from '../../lib/api'
import { getUserRole, getUserSubject } from '../../lib/auth'
import { changePassword, getProfile, updateProfile, type UserProfile } from './profile.api'

function requestError(error: unknown) {
  if (error instanceof ApiError && (error.status === 404 || error.status === 501)) {
    return 'Esta alteração ainda não está disponível. Tente novamente mais tarde.'
  }
  return error instanceof ApiError ? error.message : 'Não foi possível salvar. Verifique sua conexão e tente novamente.'
}

function NameForm({ profile, onSaved }: { profile: UserProfile; onSaved: (profile: UserProfile) => void }) {
  const [message, setMessage] = useState<FormMessage | null>(null)
  const { register, handleSubmit, reset, setError, formState: { errors, isSubmitting, isDirty } } = useForm({ defaultValues: { name: profile.name } })

  const submit = handleSubmit(async ({ name }) => {
    setMessage(null)
    try {
      const saved = await updateProfile(name.trim())
      reset({ name: saved.name })
      onSaved(saved)
      setMessage({ type: 'success', text: 'Nome atualizado com sucesso.' })
    } catch (error) {
      if (error instanceof ApiError && error.fields.name) setError('name', { message: error.fields.name })
      setMessage({ type: 'error', text: requestError(error) })
    }
  }, () => setMessage(null))

  return <form aria-label="Editar nome" onSubmit={submit} noValidate className="space-y-4">
    <fieldset disabled={isSubmitting} className="space-y-4 disabled:opacity-60">
      <Input id="profile-name" label="Nome (obrigatório)" autoComplete="name" maxLength={150} error={errors.name?.message}
        {...register('name', { validate: (value) => value.trim().length > 0 || 'Informe seu nome.', maxLength: { value: 150, message: 'Use até 150 caracteres.' } })} />
      <Button type="submit" disabled={!isDirty}>{isSubmitting ? 'Salvando…' : 'Salvar nome'}</Button>
    </fieldset>
    <FormFeedback message={message} hasErrors={Boolean(errors.name)} />
  </form>
}

type PasswordValues = { currentPassword: string; newPassword: string; confirmation: string }

function PasswordForm({ available }: { available: boolean }) {
  const [visible, setVisible] = useState(false)
  const [message, setMessage] = useState<FormMessage | null>(null)
  const { register, handleSubmit, getValues, reset, setError, formState: { errors, isSubmitting } } = useForm<PasswordValues>({
    defaultValues: { currentPassword: '', newPassword: '', confirmation: '' },
  })
  const submit = handleSubmit(async ({ currentPassword, newPassword }) => {
    if (!available) return
    setMessage(null)
    try {
      await changePassword({ currentPassword, newPassword })
      reset()
      setVisible(false)
      setMessage({ type: 'success', text: 'Senha alterada com sucesso.' })
    } catch (error) {
      if (error instanceof ApiError) {
        for (const field of ['currentPassword', 'newPassword'] as const) {
          if (error.fields[field]) setError(field, { message: error.fields[field] })
        }
      }
      setMessage({ type: 'error', text: requestError(error) })
    }
  }, () => setMessage(null))

  return <form aria-label="Alterar senha" onSubmit={submit} noValidate className="space-y-4">
    <fieldset disabled={!available || isSubmitting} className="space-y-4 disabled:opacity-60">
      <Input id="current-password" label="Senha atual (obrigatória)" type={visible ? 'text' : 'password'} autoComplete="current-password"
        error={errors.currentPassword?.message} {...register('currentPassword', { required: 'Informe sua senha atual.' })} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input id="new-password" label="Nova senha (obrigatória)" type={visible ? 'text' : 'password'} autoComplete="new-password" maxLength={100}
          error={errors.newPassword?.message} {...register('newPassword', {
            required: 'Informe a nova senha.', minLength: { value: 8, message: 'Use pelo menos 8 caracteres.' },
            maxLength: { value: 100, message: 'Use até 100 caracteres.' },
            validate: (value) => value !== getValues('currentPassword') || 'Escolha uma senha diferente da atual.',
          })} />
        <Input id="confirm-password" label="Confirmar nova senha (obrigatório)" type={visible ? 'text' : 'password'} autoComplete="new-password" maxLength={100}
          error={errors.confirmation?.message} {...register('confirmation', {
            required: 'Confirme a nova senha.', validate: (value) => value === getValues('newPassword') || 'As senhas não coincidem.',
          })} />
      </div>
      <label className="flex min-h-11 items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" checked={visible} onChange={(event) => setVisible(event.target.checked)} className="h-4 w-4 accent-brand-600" />
        Mostrar senhas
      </label>
      <Button type="submit">{isSubmitting ? 'Alterando…' : 'Alterar senha'}</Button>
    </fieldset>
    <FormFeedback message={message} hasErrors={Object.keys(errors).length > 0} />
  </form>
}

export function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [attempt, setAttempt] = useState(0)
  useEffect(() => {
    const controller = new AbortController()
    getProfile(controller.signal).then((data) => {
      if (!controller.signal.aborted) setProfile(data)
    }).catch((reason: unknown) => {
      if (controller.signal.aborted) return
      setError(reason instanceof ApiError && (reason.status === 404 || reason.status === 501)
        ? 'A edição do perfil ainda não está disponível. Por enquanto, você pode consultar os dados da sua sessão.'
        : 'Não foi possível carregar seu perfil. Verifique sua conexão e tente novamente.')
    }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [attempt])
  const role = profile?.role ?? getUserRole()
  const email = profile?.email ?? getUserSubject() ?? 'Indisponível'

  return <div className="mx-auto max-w-3xl space-y-6">
    <div>
      <p className="text-sm font-semibold text-brand-700">Minha conta</p>
      <h1 className="mt-1 text-2xl font-bold text-slate-900">Meu perfil</h1>
      <p className="mt-2 text-sm text-slate-600">Consulte seus dados e mantenha sua conta atualizada.</p>
    </div>
    {loading && <p role="status" className="text-sm text-slate-600">Carregando perfil…</p>}
    {error && <div role="alert" className="space-y-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
      <p>{error}</p>
      <Button variant="secondary" onClick={() => {
        setLoading(true)
        setError(null)
        setAttempt((value) => value + 1)
      }}>Tentar novamente</Button>
    </div>}
    <FormSection title="Dados da conta" description="O e-mail e o tipo de acesso são definidos pela administração.">
      <dl className="grid gap-4 sm:grid-cols-2">
        <div><dt className="text-sm font-medium text-slate-500">E-mail</dt><dd className="mt-1 break-all text-slate-900">{email}</dd></div>
        <div><dt className="text-sm font-medium text-slate-500">Tipo de acesso</dt><dd className="mt-1 text-slate-900">{role === 'ADMIN' ? 'Administrador' : role === 'OPERADOR' ? 'Operador' : 'Indisponível'}</dd></div>
      </dl>
    </FormSection>
    <FormSection title="Informações pessoais" description="Este é o nome usado para identificar sua conta.">
      {profile ? <NameForm profile={profile} onSaved={setProfile} /> : <Input id="profile-name" label="Nome" disabled placeholder={loading ? 'Carregando…' : 'Indisponível no momento'} />}
    </FormSection>
    <FormSection title="Segurança" description="Para alterar sua senha, informe a atual e escolha uma nova com 8 a 100 caracteres.">
      <PasswordForm available={Boolean(profile) && !loading} />
    </FormSection>
  </div>
}
