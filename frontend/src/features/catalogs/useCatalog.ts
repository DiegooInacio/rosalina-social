import { useCallback, useContext, useEffect, useState } from 'react'
import { PreservedCatalogs } from './PreservedCatalogs'
import { listCatalog, type CatalogCategory, type CatalogItem } from './catalog.api'

// Um "hook" é uma função que cuida de um assunto para o componente.
// Este busca as opções da API e informa se está carregando ou se deu erro.
export function useCatalog(category: CatalogCategory) {
  const retained = useContext(PreservedCatalogs)
  const [items, setItems] = useState<CatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)
  const [revision, setRevision] = useState(0)
  const reload = useCallback(() => {
    setIsLoading(true)
    setHasError(false)
    setRevision((value) => value + 1)
  }, [])

  useEffect(() => {
    let cancelled = false

    listCatalog(category)
      .then((data) => {
        if (!cancelled) {
          setItems(data.filter((item) => item.active || retained.has(item.id)).map((item) => item.active ? item : { ...item, name: `${item.name} (inativa)` }))
          setHasError(false)
        }
      })
      .catch(() => {
        if (!cancelled) setHasError(true)
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false)
      })

    // Se a tela fechar antes da resposta chegar, ignoramos o resultado
    return () => {
      cancelled = true
    }
  }, [category, revision, retained])

  return { items, isLoading, hasError, reload }
}
