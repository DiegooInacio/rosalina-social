import { onlyDigits } from './masks'

export function isValidCpf(value: string) {
  const digits = onlyDigits(value)

  if (digits.length !== 11) return false
  if (/^(\d)\1{10}$/.test(digits)) return false // rejeita 111.111.111-11 etc.

  function checkDigit(length: number) {
    let sum = 0
    for (let i = 0; i < length; i++) {
      sum += Number(digits[i]) * (length + 1 - i)
    }
    const rest = (sum * 10) % 11
    return rest === 10 ? 0 : rest
  }

  return checkDigit(9) === Number(digits[9]) && checkDigit(10) === Number(digits[10])
}

export function isValidDate(value: string) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value)
  if (!match) return false

  const day = Number(match[1])
  const month = Number(match[2])
  const year = Number(match[3])
  if (year < 1900) return false

  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

export function isValidPhone(value: string) {
  const digits = onlyDigits(value)

  if (digits.length !== 10 && digits.length !== 11) return false
  if (Number(digits.slice(0, 2)) < 11) return false // DDD válido começa em 11
  if (digits.length === 11 && digits[2] !== '9') return false // celular começa com 9

  return true
}

export function isValidCep(value: string) {
  return onlyDigits(value).length === 8
}

export function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}