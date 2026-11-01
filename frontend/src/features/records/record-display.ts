import { isoToBrDate } from '../../lib/dates'
import { formatCep, formatCpf, formatPhone } from '../../lib/masks'
import type { CatalogItem } from '../catalogs/catalog.api'

export type Field = readonly [key: string, label: string, format?: 'date' | 'time' | 'money' | 'cpf' | 'phone' | 'cep' | 'catalog' | 'authorization']
export const object = (value: unknown): Record<string, unknown> => value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
export const objects = (value: unknown) => Array.isArray(value) ? value.map(object) : []
export function displayDate(value: unknown) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) ? isoToBrDate(value) : 'Não informado'
}
export function displayDateTime(value: unknown) {
  if (typeof value !== 'string' || Number.isNaN(Date.parse(value))) return 'Não informado'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'America/Fortaleza' }).format(new Date(value))
}
const labels: Record<string, string> = {
  ATIVO: 'Ativo', INATIVO: 'Inativo', COMPLETED: 'Concluído', DRAFT: 'Rascunho',
  CASADOS: 'Casados', SOLTEIROS: 'Solteiros', DIVORCIADOS: 'Divorciados', UNIAO_ESTAVEL: 'União estável',
  MAE_VIUVA: 'Mãe viúva', PAI_VIUVO: 'Pai viúvo', FALECIDOS: 'Falecidos',
  PROPRIA: 'Própria', ALUGADA: 'Alugada', CEDIDA: 'Cedida', FINANCIADA: 'Financiada',
  MAE: 'Mãe', PAI: 'Pai', RESPONSAVEL: 'Responsável',
}
export function displayValue(value: unknown, format?: Field[2], catalogs: CatalogItem[] = []): string {
  if (value === null || value === undefined || value === '') return 'Não informado'
  if (format === 'authorization') return value === true ? 'Autorizado' : value === false ? 'Não autorizado' : 'Não informado'
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não'
  if (format === 'date') return displayDate(value)
  if (format === 'time') return displayDateTime(value)
  if (format === 'catalog') return catalogs.find((item) => item.id === value)?.name ?? 'Opção não localizada'
  if (format === 'money') {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Não informado'
  }
  if (typeof value === 'object') return typeof object(value).name === 'string' ? String(object(value).name) : 'Não informado'
  const text = String(value)
  if (format === 'cpf' && /^\d{11}$/.test(text)) return formatCpf(text)
  if (format === 'phone' && /^\d{10,11}$/.test(text)) return formatPhone(text)
  if (format === 'cep' && /^\d{8}$/.test(text)) return formatCep(text)
  return Object.hasOwn(labels, text) ? labels[text] : text
}
