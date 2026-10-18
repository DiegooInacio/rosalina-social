import { getUserSubject } from '../../lib/auth'
import type { FormType } from './drafts.api'

export type PendingDraft = {
  id?: string; version?: number; data: Record<string, unknown>; updatedAt: string
  // Uma conclusão cuja resposta se perdeu deve repetir o mesmo pedido.
  submission?: Record<string, unknown>
}

export function draftStorageKey(formType: FormType) {
  const user = getUserSubject()
  return user ? `rosalina.pendingDraft.${encodeURIComponent(user)}.${formType}` : null
}

export function readPending(key: string | null): PendingDraft | null {
  try {
    const value = key ? JSON.parse(sessionStorage.getItem(key) ?? 'null') : null
    if (!value || !value.data || typeof value.data !== 'object' || Array.isArray(value.data)) return null
    if (value.id !== undefined && (typeof value.id !== 'string' || !Number.isInteger(value.version) || value.version < 0)) return null
    return value
  } catch { return null }
}

export function writePending(key: string | null, value: PendingDraft | null) {
  try {
    if (key) {
      if (value) sessionStorage.setItem(key, JSON.stringify(value))
      else sessionStorage.removeItem(key)
    }
  } catch { /* O aviso de saída e o salvamento no servidor continuam ativos. */ }
}

// Migra o estado salvo para os campos atuais sem exigir CPF/data completos.
// Tipos inesperados e propriedades desconhecidas não entram nos controles.
export function restoreDraftValues<T>(defaults: T, data: Record<string, unknown>, arrayTemplates: Record<string, unknown> = {}): T {
  function merge(template: unknown, value: unknown, path: string): unknown {
    if (Array.isArray(template)) {
      const item = arrayTemplates[path]
      return Array.isArray(value) && item ? value.filter((entry) => entry && typeof entry === 'object' && !Array.isArray(entry)).map((entry) => merge(item, entry, path)) : []
    }
    if (template && typeof template === 'object') {
      const source = value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
      return Object.fromEntries(Object.entries(template).map(([key, child]) => [key, merge(child, Object.hasOwn(source, key) ? source[key] : undefined, path ? `${path}.${key}` : key)]))
    }
    return typeof value === typeof template ? value : template
  }
  return merge(defaults, data, '') as T
}
