import { useEffect } from 'react'
import type { FieldValues, UseFormReturn } from 'react-hook-form'

export type RecordEditor<T> = {
  initialValues: T
  originalValues: T
  storageKey: string
  uncertain?: boolean
  hasBackup: boolean
  save: (data: T) => Promise<void>
  cancel: () => void
}
export function useEditBackup<T extends FieldValues>(methods: UseFormReturn<T>, editor?: RecordEditor<T>) {
  useEffect(() => {
    if (!editor) return
    const original = JSON.stringify(editor.originalValues)
    const persist = () => {
      const data = methods.getValues()
      try {
        const stored = JSON.parse(sessionStorage.getItem(editor.storageKey) ?? 'null')
        if (JSON.stringify(data) === original && !stored?.submission) sessionStorage.removeItem(editor.storageKey)
        else sessionStorage.setItem(editor.storageKey, JSON.stringify({ original: stored?.submission ? stored.original : original, data, submission: stored?.submission }))
      } catch { /* O aviso de saída continua disponível. */ }
    }
    const subscription = methods.watch(persist)
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (editor.uncertain || JSON.stringify(methods.getValues()) !== original) { persist(); event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', beforeUnload)
    return () => { subscription.unsubscribe(); window.removeEventListener('beforeunload', beforeUnload) }
  }, [methods, editor])
}
