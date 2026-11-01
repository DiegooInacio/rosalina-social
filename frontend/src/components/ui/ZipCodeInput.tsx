import { useEffect, useRef, useState } from 'react'
import { useController, useFormContext, useWatch } from 'react-hook-form'
import { lookupCep, type CepAddress, type CepResult } from '../../lib/cep'
import { onlyDigits } from '../../lib/masks'
import { isValidCep } from '../../lib/validators'
import { Button } from './Button'
import { MaskedInput } from './MaskedInput'

type Props = { id: string; name: string; addressFields: Partial<Record<keyof CepAddress, string>> }

export function ZipCodeInput({ id, name, addressFields }: Props) {
  const { control, getValues, getFieldState, setValue, setError, clearErrors } = useFormContext()
  const { field, fieldState } = useController({ control, name })
  const value = String(field.value ?? '')
  const [result, setResult] = useState<(CepResult & { key: string }) | null>(null)
  const [attempt, setAttempt] = useState(0)
  const autofilled = useRef<Record<string, string>>({})
  const key = `${value}:${attempt}`
  const status = !isValidCep(value) ? 'idle' : result?.key === key ? result.status : 'loading'
  const paths = Object.values(addressFields)
  const addressValues = useWatch({ control, name: paths })
  const foundAddress = status === 'found' && result?.status === 'found' ? result.address : null
  const comparable = (value: string) => value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('pt-BR')
  const hasDifference = foundAddress && Object.entries(addressFields).some(([key, path]) => {
    const current = String(addressValues[paths.indexOf(path)] ?? '')
    const next = foundAddress[key as keyof CepAddress]
    return current.trim() && next.trim() && comparable(current) !== comparable(next)
  })

  useEffect(() => {
    let active = true
    if (getFieldState(name).error?.type === 'cep') clearErrors(name)
    if (!isValidCep(value)) return
    const before = Object.fromEntries(Object.values(addressFields).map((path) => [path, getValues(path)]))
    const timer = setTimeout(async () => {
      const result = await lookupCep(value)
      if (!active || onlyDigits(String(getValues(name))) !== onlyDigits(value)) return
      setResult({ ...result, key })
      if (result.status === 'not-found') {
        setError(name, { type: 'cep', message: 'CEP não encontrado. Confira os 8 dígitos informados.' })
      } else if (result.status === 'found') {
        for (const [key, path] of Object.entries(addressFields)) {
          const current = getValues(path)
          const next = result.address[key as keyof CepAddress]
          // Preserva edições manuais e valores de rascunhos. Uma resposta antiga
          // nunca substitui um endereço digitado enquanto a consulta estava aberta.
          if (next && current === before[path] && (!current || current === autofilled.current[path])) {
            autofilled.current[path] = next
            setValue(path, next, { shouldDirty: true, shouldValidate: true })
          }
        }
      }
    }, 350)
    return () => { active = false; clearTimeout(timer) }
  }, [value, name, addressFields, key, getValues, getFieldState, setValue, setError, clearErrors])

  const hint = {
    idle: 'Informe os 8 dígitos para buscar o endereço automaticamente.',
    loading: 'Consultando CEP...',
    found: 'CEP encontrado. Confira o endereço e complete os dados que faltarem.',
    'not-found': 'Confira o CEP antes de salvar.',
    unavailable: 'Não foi possível consultar o CEP agora. Você pode preencher o endereço manualmente.',
  }[status]
  return <div>
    <MaskedInput {...field} value={value} id={id} label="CEP" mask="cep" autoComplete="postal-code"
      hint={hint} error={fieldState.error?.message} aria-busy={status === 'loading'} />
    {hasDifference && foundAddress && <div className="mt-2 rounded-lg border border-warning-line bg-warning-soft p-3 text-sm text-warning">
      <p aria-live="polite">O endereço encontrado para este CEP é diferente do preenchido.</p>
      <p className="mt-1">Encontrado: {Object.keys(addressFields).map((key) => foundAddress[key as keyof CepAddress]).filter(Boolean).join(' · ')}</p>
      <Button type="button" variant="secondary" className="mt-2" onClick={() => {
        for (const [key, path] of Object.entries(addressFields)) {
          const next = foundAddress[key as keyof CepAddress]
          if (!next.trim()) continue
          autofilled.current[path] = next
          setValue(path, next, { shouldDirty: true, shouldValidate: true, shouldTouch: true })
        }
      }}>Usar endereço do CEP</Button>
    </div>}
    {status === 'unavailable' && <Button type="button" variant="secondary" className="mt-2" onClick={() => setAttempt((previous) => previous + 1)}>Tentar consultar CEP novamente</Button>}
  </div>
}
