import { forwardRef, type SelectHTMLAttributes } from 'react'
import type { CatalogCategory } from '../../features/catalogs/catalog.api'
import { useCatalog } from '../../features/catalogs/useCatalog'
import { Select } from './Select'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  category: CatalogCategory
  label: string
  error?: string
}

export const CatalogSelect = forwardRef<HTMLSelectElement, Props>(function CatalogSelect(
  { category, error, ...props }, ref,
) {
  const catalog = useCatalog(category)
  return (
    <Select
      {...props}
      ref={ref}
      options={catalog.items.map((item) => ({ value: item.id, label: item.name }))}
      placeholder={catalog.isLoading ? 'Carregando...' : catalog.hasError ? 'Falha ao carregar opções' : catalog.items.length === 0 ? 'Nenhuma opção cadastrada' : 'Não informado'}
      disabled={props.disabled || catalog.isLoading || catalog.hasError}
      error={error ?? (catalog.hasError ? 'Não foi possível carregar as opções.' : undefined)}
    />
  )
})
