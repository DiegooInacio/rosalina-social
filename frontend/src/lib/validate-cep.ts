import type { FieldPath, FieldPathValue, FieldValues, UseFormReturn } from 'react-hook-form'
import { lookupCep, type CepAddress } from './cep'

// O resolver verifica o formato. A consulta confirma a existência antes de
// concluir, pois um erro manual do campo pode ser limpo pelo resolver no submit.
export async function validateCep<T extends FieldValues>(methods: UseFormReturn<T>, path: FieldPath<T>, addressFields: Partial<Record<keyof CepAddress, FieldPath<T>>>) {
  const value = String(methods.getValues(path) ?? '')
  if (!value) return true
  const result = await lookupCep(value)
  if (result.status === 'found') {
    for (const key of Object.keys(addressFields) as (keyof CepAddress)[]) {
      const field = addressFields[key]
      if (field && !methods.getValues(field) && result.address[key]) {
        methods.setValue(field, result.address[key] as FieldPathValue<T, FieldPath<T>>, { shouldDirty: true })
      }
    }
  }
  if (result.status !== 'not-found') return true
  methods.setError(path, { type: 'cep', message: 'CEP não encontrado. Confira os 8 dígitos informados.' }, { shouldFocus: true })
  return false
}
