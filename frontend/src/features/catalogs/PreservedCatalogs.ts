import { createContext } from 'react'

// Identificadores já associados ao cadastro podem continuar selecionados na edição.
export const PreservedCatalogs = createContext<ReadonlySet<string>>(new Set())
export function catalogIds(data: unknown): Set<string> {
  const ids = new Set<string>()
  function visit(value: unknown) {
    if (!value || typeof value !== 'object') return
    for (const [key, child] of Object.entries(value)) {
      if (key.endsWith('Id') && typeof child === 'string' && child) ids.add(child)
      else visit(child)
    }
  }
  visit(data)
  return ids
}
