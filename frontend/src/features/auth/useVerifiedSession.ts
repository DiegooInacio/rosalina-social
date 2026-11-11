import { useCallback, useEffect, useState } from 'react'
import { tokenSubject } from '../../lib/auth'
import { verifySession } from '../../lib/api'
import { useSessionToken } from './useSessionToken'

const checks = new Map<string, Promise<string | null>>()
function check(token: string) {
  const pending = checks.get(token)
  if (pending) return pending
  const operation = verifySession(token)
  checks.set(token, operation)
  void operation.finally(() => { if (checks.get(token) === operation) checks.delete(token) }).catch(() => {})
  return operation
}

export function useVerifiedSession() {
  const token = useSessionToken()
  const [attempt, setAttempt] = useState(0)
  const [result, setResult] = useState<{ token: string; valid: boolean; error: boolean } | null>(null)
  const retry = useCallback(() => setAttempt(value => value + 1), [])
  useEffect(() => {
    if (!token) return
    let cancelled = false
    check(token).then(verified => {
      if (!cancelled) setResult({ token: verified ?? token, valid: Boolean(verified), error: false })
    }).catch(() => {
      if (!cancelled) setResult(previous => previous?.valid && tokenSubject(previous.token) === tokenSubject(token) ? { ...previous, error: true } : { token, valid: false, error: true })
    })
    return () => { cancelled = true }
  }, [token, attempt])
  useEffect(() => {
    const visible = () => { if (document.visibilityState === 'visible') retry() }
    window.addEventListener('focus', retry)
    document.addEventListener('visibilitychange', visible)
    const timer = window.setInterval(retry, 60000)
    return () => { window.removeEventListener('focus', retry); document.removeEventListener('visibilitychange', visible); window.clearInterval(timer) }
  }, [retry])
  return {
    hasVerifiedAccount: Boolean(token && result?.valid && tokenSubject(result.token) === tokenSubject(token)),
    status: !token ? 'anonymous' : result?.token !== token ? 'checking' : result.error ? 'error' : result.valid ? 'authenticated' : 'anonymous',
    retry,
  }
}
