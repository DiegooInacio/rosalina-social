import { useEffect, useState } from 'react'
import { fetchCatalog, type CatalogCategory, type CatalogItem } from './catalog.api'

// Um "hook" é uma função que cuida de um assunto para o componente.
// Este busca as opções da API e informa se está carregando ou se deu erro.
export function useCatalog(category: CatalogCategory) {
  const [items, setItems] = useState<CatalogItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    let cancelled = false

    fetchCatalog(category)
      .then((data) => {
        if (!cancelled) setItems(data)
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
  }, [category])

  return { items, isLoading, hasError }
}