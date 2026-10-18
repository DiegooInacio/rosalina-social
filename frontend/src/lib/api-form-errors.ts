// Converte os índices da API (members[0].name) em caminhos do React Hook Form.
// Só associa mensagens a campos que existem no formulário enviado.
export function mapApiFormErrors(fields: Record<string, string>, values: object) {
  const mapped: Record<string, string> = {}
  for (const [field, message] of Object.entries(fields)) {
    const path = field.replace(/\[(\d+)\]/g, '.$1')
    let value: unknown = values
    let exists = true
    for (const key of path.split('.')) {
      if (value === null || typeof value !== 'object' || !Object.hasOwn(value, key)) {
        exists = false
        break
      }
      value = (value as Record<string, unknown>)[key]
    }
    if (exists) mapped[path] = message
  }
  return mapped
}
