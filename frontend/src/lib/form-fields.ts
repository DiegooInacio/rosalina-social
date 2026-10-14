import { z } from 'zod'

export const optionalCatalogId = z.union([z.literal(''), z.uuid('Selecione uma opção válida.')])
export const yesNoSchema = z.enum(['', 'true', 'false'])
export const yesNoOptions = [{ value: 'true', label: 'Sim' }, { value: 'false', label: 'Não' }]
export const toOptionalBoolean = (value: string) => value === '' ? undefined : value === 'true'

export const optionalInteger = z.string().refine(
  (value) => value === '' || (/^\d+$/.test(value) && Number(value) <= 2147483647),
  'Informe um número inteiro não negativo (até 2147483647).',
)
export const toOptionalNumber = (value: string) => value === '' ? undefined : Number(value.replace(',', '.'))
export const optionalMoney = z.string().refine(
  (value) => value === '' || /^\d{1,10}([.,]\d{1,2})?$/.test(value),
  'Informe um valor não negativo, até 9999999999,99 e com no máximo duas casas decimais.',
)
