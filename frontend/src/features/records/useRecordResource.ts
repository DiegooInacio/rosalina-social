import { useEffect, useState } from 'react'
import { apiRequest } from '../../lib/api'

export function useRecordResource<T>(path: string) {
  const [revision, setRevision] = useState(0)
  const key = `${path}:${revision}`
  const [result, setResult] = useState<{ key: string; data?: T; error?: Error } | null>(null)
  useEffect(() => {
    let active = true
    apiRequest<T>(path).then((data) => {
      if (active) setResult({ key, data })
    }).catch((error: unknown) => {
      if (active) setResult({ key, error: error instanceof Error ? error : new Error('Não foi possível carregar os dados.') })
    })
    return () => { active = false }
  }, [path, key])
  const current = result?.key === key ? result : null
  return { data: current?.data, error: current?.error, loading: !current, retry: () => setRevision((value) => value + 1) }
}
