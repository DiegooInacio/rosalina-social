import { z } from 'zod'
import { phoneValidationMessage } from './validators'

export function phoneField(requiredMessage?: string) {
  return z.string().trim().superRefine((value, ctx) => {
    const message = value === '' ? requiredMessage : phoneValidationMessage(value)
    if (message) ctx.addIssue({ code: 'custom', message })
  })
}

// Campo opcional: aceita vazio, mas se preenchido precisa ser válido
export function optional(check: (value: string) => boolean, message: string) {
  return z.string().refine((value) => value === '' || check(value), message)
}

// Texto vazio vira undefined, e o campo some do JSON enviado à API
export function blankToUndefined(value: string) {
  const trimmed = value.trim()
  return trimmed === '' ? undefined : trimmed
}
