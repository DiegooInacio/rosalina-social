import { useSyncExternalStore } from 'react'
import { getUserRole } from '../../lib/auth'

function subscribe(listener: () => void) {
  window.addEventListener('rosalina:session', listener)
  window.addEventListener('rosalina:profile', listener)
  window.addEventListener('storage', listener)
  return () => {
    window.removeEventListener('rosalina:session', listener)
    window.removeEventListener('rosalina:profile', listener)
    window.removeEventListener('storage', listener)
  }
}
export function useUserRole() { return useSyncExternalStore(subscribe, getUserRole) }
