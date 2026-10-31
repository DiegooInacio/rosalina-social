import { forwardRef, type SelectHTMLAttributes } from 'react'
import type { CatalogCategory } from '../../features/catalogs/catalog.api'
import { useFormContext, useWatch } from 'react-hook-form'
import { useCatalog } from '../../features/catalogs/useCatalog'
import { Select } from './Select'

type Props = SelectHTMLAttributes<HTMLSelectElement> & {
  name: string
  category: CatalogCategory
  label: string
  error?: string
}

export const CatalogSelect = forwardRef<HTMLSelectElement, Props>(function CatalogSelect(
  { category, error, ...props }, ref,
) {
  const { control } = useFormContext()
  const value = useWatch({ control, name: props.name })
  const catalog = useCatalog(category)
  return (
    <Select
      {...props}
      ref={ref}
      value={value ?? ''}
      options={catalog.items.map((item) => ({ value: item.id, label: item.name }))}
      placeholder={catalog.isLoading ? 'Carregando...' : catalog.hasError ? 'Falha ao carregar opções' : catalog.items.length === 0 ? 'Nenhuma opção cadastrada' : 'Não informado'}
      disabled={props.disabled || catalog.isLoading || catalog.hasError}
      error={error ?? (catalog.hasError ? 'Não foi possível carregar as opções.' : undefined)}
    />
  )
})
