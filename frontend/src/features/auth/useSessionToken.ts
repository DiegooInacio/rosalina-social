import { useSyncExternalStore } from 'react'
import { getAccessToken } from '../../lib/auth'

function subscribe(listener: () => void) {
  window.addEventListener('rosalina:session', listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener('rosalina:session', listener)
    window.removeEventListener('storage', listener)
  }
}
export function useSessionToken() {
  return useSyncExternalStore(subscribe, getAccessToken)
}
