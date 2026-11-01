import { Link, useLocation, useParams, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { FormSection } from '../../components/ui/FormSection'
import { ApiError } from '../../lib/api'
import type { CatalogItem } from '../catalogs/catalog.api'
import { recordPath, type RecordData, type RecordKind } from './records.api'
import { displayValue, object, objects, type Field } from './record-display'
import * as fields from './record-fields'
import { useRecordResource } from './useRecordResource'

function DataSection({ title, data, fields, catalogs }: { title: string; data: RecordData; fields: Field[]; catalogs?: CatalogItem[] }) {
  const visible = fields.filter(([key]) => !['waterSupply', 'sewage', 'garbageCollection'].includes(key) || data[key] != null)
  const hasData = visible.some(([key]) => data[key] !== undefined && data[key] !== null && data[key] !== '')
  return <FormSection title={title}>
    {!hasData ? <p className="text-sm text-muted">Nenhuma informação registrada nesta seção.</p> : <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {visible.map(([key, label, format]) => <div key={key} className="min-w-0"><dt className="text-sm text-muted">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-medium text-foreground">{displayValue(data[key], format, catalogs)}</dd></div>)}
    </dl>}
  </FormSection>
}
function StudentContent({ data }: { data: RecordData }) {
  const priority: Record<string, number> = { MAE: 0, PAI: 1, RESPONSAVEL: 2 }
  const relatives = objects(data.relatives).sort((a, b) => (priority[String(a.type)] ?? 3) - (priority[String(b.type)] ?? 3))
  return <>
    <DataSection title="Identificação do aluno" data={data} fields={fields.studentFields} />
    <DataSection title="Endereço" data={data} fields={fields.studentAddress} />
    <DataSection title="Contatos" data={data} fields={fields.studentContacts} />
    {relatives.length ? relatives.map((relative, index) => <DataSection key={String(relative.type ?? index)} title={`${displayValue(relative.type)}${index === 0 ? ' · referência familiar' : ''}`} data={relative} fields={fields.relativeFields.filter(([key]) => key !== 'kinship' || relative.type === 'RESPONSAVEL')} />)
      : <FormSection title="Informações familiares"><p className="text-sm text-muted">Nenhum familiar registrado.</p></FormSection>}
    <DataSection title="Situação socioeconômica" data={object(data.socioeconomic)} fields={fields.socioeconomicFields} />
  </>
}
function SurveyContent({ data }: { data: RecordData }) {
  const catalogs = useRecordResource<CatalogItem[]>('/api/v1/catalogs')
  const members = objects(data.members)
  return <>
    {catalogs.error && <div role="alert" className="rounded-lg bg-warning-soft p-4 text-sm text-warning"><p>Não foi possível carregar os nomes de algumas opções. Os demais dados estão disponíveis.</p><Button type="button" variant="secondary" className="mt-2" onClick={catalogs.retry}>Tentar carregar opções novamente</Button></div>}
    {catalogs.loading && <p role="status" className="text-sm text-secondary">Carregando nomes das opções...</p>}
    <DataSection title="Dados do levantamento" data={data} fields={fields.metadataFields} />
    <DataSection title="Responsável familiar" data={object(data.responsible)} fields={fields.responsibleFields} catalogs={catalogs.data} />
    <DataSection title="Endereço" data={object(data.address)} fields={fields.surveyAddress} />
    <DataSection title="Moradia e infraestrutura" data={object(data.housing)} fields={fields.housingFields} />
    <DataSection title="Trabalho e benefícios" data={object(data.workAndBenefits)} fields={fields.workFields} />
    <DataSection title="Saúde" data={object(data.health)} fields={fields.healthFields} />
    {members.length ? members.map((member, index) => <DataSection key={String(member.id ?? index)} title={`Integrante ${index + 1} · ${displayValue(member.name)}`} data={member} fields={fields.memberFields} />)
      : <FormSection title="Integrantes da família"><p className="text-sm text-muted">Nenhum integrante registrado.</p></FormSection>}
    <DataSection title="Resumo financeiro" data={object(data.financialSummary)} fields={fields.financialFields} />
    <DataSection title="Autorizações" data={object(data.authorizations)} fields={fields.authorizationFields} />
    <DataSection title="Declaração e assinaturas" data={object(data.declaration)} fields={fields.declarationFields} />
  </>
}
export function RecordDetailsPage({ kind }: { kind: RecordKind }) {
  const { id = '' } = useParams()
  const location = useLocation()
  const [params] = useSearchParams()
  const student = kind === 'students'
  const base = student ? '/app/alunos' : '/app/levantamentos'
  const resource = useRecordResource<RecordData>(recordPath(kind, id))
  const notFound = resource.error instanceof ApiError && resource.error.status === 404
  const data = resource.data
  const name = data ? student ? data.name : object(data.responsible).name : null
  return <div className="space-y-5">
    <Link to={`${base}?${params}`} className="inline-flex min-h-11 items-center rounded-lg font-semibold text-link underline underline-offset-4 hover:text-link-hover">← Voltar para {student ? 'alunos cadastrados' : 'levantamentos cadastrados'}</Link>
    {location.state?.recordUpdated && <p role="status" className="rounded-lg bg-success-soft p-4 text-link">Cadastro atualizado com sucesso.</p>}
    <div className="flex flex-wrap items-start justify-between gap-3"><div>
      <p className="text-sm font-medium text-muted">{student ? 'Ficha do aluno' : 'Ficha do levantamento'}</p>
      <h1 className="mt-1 break-words text-2xl font-bold text-foreground">{name ? String(name) : notFound ? 'Cadastro não encontrado' : 'Dados do cadastro'}</h1>
    </div><div className="flex flex-wrap gap-3">{data && <Link className="inline-flex min-h-11 items-center rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-700" to={`${base}/${id}/editar?${params}`}>Editar cadastro</Link>}<Button type="button" variant="secondary" disabled={resource.loading} onClick={resource.retry}>Atualizar ficha</Button></div></div>
    {resource.loading ? <p role="status" className="rounded-xl border border-line bg-surface p-5 text-secondary">Carregando ficha...</p>
      : resource.error ? <div role="alert" className="rounded-xl border border-danger-line bg-danger-soft p-5 text-danger-strong"><p>{notFound ? 'Este cadastro não foi encontrado. Volte à lista para consultar os registros disponíveis.' : `Não foi possível carregar a ficha. ${resource.error.message}`}</p>{!notFound && <Button type="button" variant="secondary" className="mt-3" onClick={resource.retry}>Tentar novamente</Button>}</div>
      : data && <div aria-label="Dados completos do cadastro" className="space-y-5">{student ? <StudentContent data={data} /> : <SurveyContent data={data} />}</div>}
  </div>
}
