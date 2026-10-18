// Converte "25/12/2000" (tela) para "2000-12-25" (formato da API)
export function brDateToIso(value: string) {
  const [day, month, year] = value.split('/')
  return `${year}-${month}-${day}`
}

// Converte "2000-12-25" (API) para "25/12/2000" (tela)
export function isoToBrDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}/${month}/${year}`
}

export function todayInFortaleza() {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Fortaleza', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((item) => item.type === type)?.value
  return `${part('day')}/${part('month')}/${part('year')}`
}
