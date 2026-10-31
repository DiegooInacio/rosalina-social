import { useState } from 'react'
import type { CatalogItem } from '../catalogs/catalog.api'
import type { RecordData, RecordKind } from './records.api'
import { displayValue, object, objects, type Field } from './record-display'
import * as fields from './record-fields'
import { useRecordResource } from './useRecordResource'

type Group = { title: string; local: RecordData; current: RecordData; fields: Field[] }

// Compara o estado bruto conhecido do formulário, inclusive valores incompletos.
// Não monta formulários nem executa preenchimento automático ou salvamento.
export function EditConflictComparison({ kind, local, current }: { kind: RecordKind; local: RecordData; current: RecordData }) {
  const [onlyDifferences, setOnlyDifferences] = useState(true)
  const catalogs = useRecordResource<CatalogItem[]>('/api/v1/catalogs')
  const options = Array.isArray(catalogs.data) ? catalogs.data : []
  const group = (title: string, key: string, descriptors: Field[]): Group => ({ title, local: object(local[key]), current: object(current[key]), fields: descriptors })
  const localMembers = objects(local.members)
  const currentMembers = objects(current.members)
  const memberKeys = new Set([...localMembers.map((member, index) => String(member.id || `local:${index}`)), ...currentMembers.map((member, index) => String(member.id || `current:${index}`))])
  const memberGroups = [...memberKeys].map((key, index) => ({ title: `Integrante ${index + 1}`, local: localMembers.find((member, position) => String(member.id || `local:${position}`) === key) ?? {}, current: currentMembers.find((member, position) => String(member.id || `current:${position}`) === key) ?? {}, fields: fields.memberFields }))
  const groups: Group[] = kind === 'students' ? [
    { title: 'Identificação', local, current, fields: fields.studentFields },
    { title: 'Endereço', local, current, fields: fields.studentAddress },
    { title: 'Contatos', local, current, fields: fields.studentContacts },
    group('Mãe', 'mother', fields.relativeFields), group('Pai', 'father', fields.relativeFields), group('Responsável', 'guardian', fields.relativeFields),
    group('Situação socioeconômica', 'socioeconomic', fields.socioeconomicFields),
  ] : [
    { title: 'Levantamento', local, current, fields: [['referenceDate', 'Data de referência', 'date']] },
    group('Responsável familiar', 'responsible', fields.responsibleFields), group('Endereço', 'address', fields.surveyAddress),
    group('Moradia', 'housing', fields.housingFields), group('Trabalho e benefícios', 'workAndBenefits', fields.workFields),
    group('Saúde', 'health', fields.healthFields),
    ...memberGroups,
    group('Autorizações', 'authorizations', fields.authorizationFields), group('Declaração', 'declaration', fields.declarationFields),
  ]
  function cell(data: RecordData, [key, , format]: Field) {
    const catalogKey = Object.hasOwn(data, key) ? key : `${key}Id`
    let value = data[catalogKey]
    if (value === 'true' || value === 'false') value = value === 'true'
    if (format === 'date') return typeof value === 'string' && value ? value : 'Não informado'
    if (format === 'money' && typeof value === 'string') {
      if (value && !/^\d{1,10}([.,]\d{1,2})?$/.test(value)) return value
      value = value ? Number(value.replace(',', '.')) : null
    }
    return displayValue(value, catalogKey.endsWith('Id') ? 'catalog' : format, options)
  }
  return <details className="mt-4 rounded-lg border border-line bg-surface p-4 text-foreground">
    <summary className="min-h-11 cursor-pointer font-semibold">Comparar minha cópia com os dados atuais</summary>
    <p className="mt-3 text-sm text-secondary">Sua cópia permanece guardada nesta aba. Você pode consultar e selecionar os valores abaixo para copiá-los antes de decidir o que manter.</p>
    <label className="my-4 flex min-h-11 cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={onlyDifferences} onChange={(event) => setOnlyDifferences(event.target.checked)} />Mostrar apenas diferenças</label>
    {catalogs.error && <p className="text-sm text-warning">Alguns nomes de opções estão indisponíveis. <button type="button" className="cursor-pointer underline" onClick={catalogs.retry}>Tentar carregar nomes</button></p>}
    {groups.map((section) => {
      const rows = section.fields.filter((field) => {
        if (!onlyDifferences) return true
        const key = Object.hasOwn(section.local, field[0]) ? field[0] : `${field[0]}Id`
        return key.endsWith('Id') ? section.local[key] !== section.current[key] : cell(section.local, field) !== cell(section.current, field)
      })
      if (!rows.length) return null
      return <section key={section.title} className="mt-4"><h2 className="font-semibold">{section.title}</h2><div className="overflow-x-auto"><table className="mt-2 w-full text-left text-sm">
        <caption className="sr-only">Comparação de {section.title}</caption>
        <thead><tr><th className="p-2" scope="col">Campo</th><th className="p-2" scope="col">Minha cópia</th><th className="p-2" scope="col">Dados atuais</th></tr></thead>
        <tbody>{rows.map((field) => <tr key={field[0]} className="border-t border-line"><th scope="row" className="p-2 font-medium">{field[1]}</th><td className="whitespace-pre-wrap break-words p-2">{cell(section.local, field)}</td><td className="whitespace-pre-wrap break-words p-2">{cell(section.current, field)}</td></tr>)}</tbody>
      </table></div></section>
    })}
  </details>
}
