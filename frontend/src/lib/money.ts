// Valores do formulário continuam sem símbolo/separador de milhar.
// Assim os rascunhos e a validação existente mantêm o mesmo formato.
export function formatMoney(value: string) {
  if (!value) return ''
  if (!/^\d{1,10}(?:[.,]\d{1,2})?$/.test(value)) return value
  return `R$ ${Number(value.replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

export function moneyFromDigits(value: string): string | null {
  if (value.includes('-')) return null
  const digits = value.replace(/\D/g, '').replace(/^0+(?=\d)/, '')
  if (!digits) return ''
  if (digits.length > 12) return null
  const padded = digits.padStart(3, '0')
  return `${padded.slice(0, -2)}.${padded.slice(-2)}`
}

export function moneyFromPaste(value: string): string | null {
  let text = value.trim().replace(/^R\$\s*/, '')
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d{1,2})?$/.test(text)) text = text.replace(/\./g, '')
  if (!/^\d{1,10}(?:[.,]\d{1,2})?$/.test(text)) return null
  const [integer, decimal = ''] = text.replace(',', '.').split('.')
  return `${integer.replace(/^0+(?=\d)/, '')}.${decimal.padEnd(2, '0')}`
}
