export type ThemePreference = 'light' | 'dark' | 'system'
export const themeStorageKey = 'rosalina.theme'
const listeners = new Set<() => void>()
let preference: ThemePreference = readPreference()
let media: MediaQueryList | undefined

function readPreference(): ThemePreference {
  try {
    const saved = localStorage.getItem(themeStorageKey)
    if (saved === 'light' || saved === 'dark') return saved
  } catch { /* A troca de tema continua disponível sem armazenamento. */ }
  return 'system'
}
function applyTheme() {
  const dark = preference === 'dark' || (preference === 'system' && (media?.matches ?? window.matchMedia?.('(prefers-color-scheme: dark)').matches))
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}
function notify() { listeners.forEach((listener) => listener()) }
export const getThemePreference = () => preference
export function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
export function setThemePreference(value: ThemePreference) {
  preference = value
  try { localStorage.setItem(themeStorageKey, value) } catch { /* Preferência mantida nesta página. */ }
  applyTheme()
  notify()
}
export function initializeTheme() {
  preference = readPreference()
  media = window.matchMedia?.('(prefers-color-scheme: dark)')
  applyTheme()
  const onSystemChange = () => { if (preference === 'system') applyTheme() }
  const onStorage = (event: StorageEvent) => {
    if (event.key === themeStorageKey || event.key === null) {
      preference = readPreference(); applyTheme(); notify()
    }
  }
  media?.addEventListener('change', onSystemChange)
  window.addEventListener('storage', onStorage)
  notify()
  return () => {
    media?.removeEventListener('change', onSystemChange)
    window.removeEventListener('storage', onStorage)
  }
}
