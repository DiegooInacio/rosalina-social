import type { MemberFormData } from './population.schema'

export type FinancialSummary = {
  memberCount: number
  incomeComplete: boolean
  totalIncome: number | null
  perCapitaIncome: number | null
}

export function calculateFinancialPreview(members: MemberFormData[]) {
  const memberCount = members.length
  if (!memberCount || members.some((member) => !/^\d{1,10}([.,]\d{1,2})?$/.test(member.income))) {
    return { memberCount, incomeComplete: false, totalCents: null, perCapitaCents: null }
  }
  const totalCents = members.reduce((total, member) => {
    const [whole, fraction = ''] = member.income.replace(',', '.').split('.')
    return total + BigInt(whole) * 100n + BigInt(fraction.padEnd(2, '0'))
  }, 0n)
  const count = BigInt(memberCount)
  const perCapitaCents = totalCents / count + ((totalCents % count) * 2n >= count ? 1n : 0n)
  return { memberCount, incomeComplete: true, totalCents, perCapitaCents }
}

export function formatCents(cents: bigint | null) {
  if (cents === null) return 'Não informado'
  return `R$ ${new Intl.NumberFormat('pt-BR').format(cents / 100n)},${String(cents % 100n).padStart(2, '0')}`
}
