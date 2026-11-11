const RESET_KEY = 'rosalina.localFormDataReset'
const prefixes = ['rosalina.pendingDraft.', 'rosalina.recordEdit.']
let revision = 0

export function localFormDataRevision() {
  try { return `${revision}:${localStorage.getItem(RESET_KEY) ?? ''}` }
  catch { return String(revision) }
}

function clearLocalCopies() {
  revision++
  try {
    for (let index = sessionStorage.length - 1; index >= 0; index--) {
      const key = sessionStorage.key(index)
      if (key && prefixes.some(prefix => key.startsWith(prefix))) sessionStorage.removeItem(key)
    }
  } catch { /* O navegador pode bloquear o armazenamento. */ }
}

// O marcador não contém dados pessoais e invalida callbacks de formulários antigos.
export function discardLocalFormData() {
  clearLocalCopies()
  try { localStorage.setItem(RESET_KEY, crypto.randomUUID()) }
  catch { /* A limpeza da aba atual continua válida. */ }
}

export function observeLocalFormDataReset() {
  const listener = (event: StorageEvent) => {
    if (event.key === RESET_KEY && event.storageArea === localStorage) clearLocalCopies()
  }
  window.addEventListener('storage', listener)
  return () => window.removeEventListener('storage', listener)
}
