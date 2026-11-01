import { useId, useSyncExternalStore } from 'react'
import { getThemePreference, setThemePreference, subscribeTheme, type ThemePreference } from './theme'

export function ThemeSelector() {
  const id = useId()
  const preference = useSyncExternalStore(subscribeTheme, getThemePreference)
  return <div className="flex items-center gap-2">
    <label htmlFor={id} className="text-sm font-medium text-secondary">Tema</label>
    <select id={id} value={preference} onChange={(event) => setThemePreference(event.target.value as ThemePreference)}
      title="Automático acompanha o tema do dispositivo"
      className="min-h-11 w-32 rounded-lg border border-control bg-surface px-3 py-2 text-sm text-body">
      <option value="light">Claro</option>
      <option value="dark">Escuro</option>
      <option value="system">Automático</option>
    </select>
  </div>
}
