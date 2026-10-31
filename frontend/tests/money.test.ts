import { expect, it } from 'vitest'
import { formatMoney, moneyFromDigits, moneyFromPaste } from '../src/lib/money'

it('formata valores e mantém rascunhos incompletos para correção', () => {
  expect(formatMoney('')).toBe('')
  expect(formatMoney('1234.56')).toBe('R$ 1.234,56')
  expect(formatMoney('1234,56')).toBe('R$ 1.234,56')
  expect(formatMoney('0')).toBe('R$ 0,00')
  expect(formatMoney('120,')).toBe('120,')
  expect(formatMoney('-10')).toBe('-10')
})
it('digita centavos e respeita o limite de dez dígitos inteiros', () => {
  expect(moneyFromDigits('1')).toBe('0.01')
  expect(moneyFromDigits('R$ 1.234,56')).toBe('1234.56')
  expect(moneyFromDigits('')).toBe('')
  expect(moneyFromDigits('999999999999')).toBe('9999999999.99')
  expect(moneyFromDigits('1000000000000')).toBeNull()
})
it('cola reais com ou sem máscara sem multiplicar ou dividir por cem', () => {
  for (const value of ['R$ 1.234,56', '1.234,56', '1234,56', '1234.56']) expect(moneyFromPaste(value)).toBe('1234.56')
  expect(moneyFromPaste('1234')).toBe('1234.00')
  expect(moneyFromPaste('1.234')).toBe('1234.00')
  expect(moneyFromPaste('-123')).toBeNull()
  expect(moneyFromPaste('abc123')).toBeNull()
})
