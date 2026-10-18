import { apiRequest } from '../../lib/api'

export type CatalogCategory =
  | 'ATIVIDADE'
  | 'OCUPACAO'
  | 'ESCOLARIDADE'
  | 'TIPO_MORADIA'
  | 'FORMA_AQUISICAO'
  | 'TIPO_VEDACAO'
  | 'TIPO_PISO'
  | 'AGUA'
  | 'ESGOTO'
  | 'COLETA_LIXO'
  | 'SEXO_NASCIMENTO'
  | 'IDENTIFICACAO_RACIAL'
  | 'GENERO'
  | 'ORIENTACAO_SEXUAL'
  | 'ESTADO_CIVIL'
  | 'TIPO_ESCOLA'

export type CatalogItem = {
  id: string
  category: CatalogCategory
  name: string
  active: boolean
}

// Busca as opções de uma categoria e descarta as desativadas
export async function fetchCatalog(category: CatalogCategory) {
  const items = await listCatalog(category)
  return items.filter((item) => item.active)
}

export function listCatalog(category: CatalogCategory) {
  return apiRequest<CatalogItem[]>(`/api/v1/catalogs?category=${category}`)
}

export function createActivity(name: string) {
  return apiRequest<CatalogItem>('/api/v1/catalogs', {
    method: 'POST', body: JSON.stringify({ category: 'ATIVIDADE', name }),
  })
}

export function renameActivity(id: string, name: string) {
  return apiRequest<CatalogItem>(`/api/v1/catalogs/${id}`, {
    method: 'PUT', body: JSON.stringify({ category: 'ATIVIDADE', name }),
  })
}

export function setActivityStatus(id: string, active: boolean) {
  return apiRequest<CatalogItem>(`/api/v1/catalogs/${id}`, {
    method: 'PATCH', body: JSON.stringify({ active }),
  })
}
