import { useState, type FormEvent } from 'react'
import { Link, useSearchParams } from 'react-router'
import { Button } from '../../components/ui/Button'
import { Input } from '../../components/ui/Input'
import { MaskedInput } from '../../components/ui/MaskedInput'
import { Select } from '../../components/ui/Select'
import { isValidCpf } from '../../lib/validators'
import { recordPath, type RecordKind, type RecordPage } from './records.api'
import { useRecordResource } from './useRecordResource'
import { displayDate, displayDateTime } from './record-display'

export function RecordListPage({ kind }: { kind: RecordKind }) {
  const student = kind === 'students'
  const base = student ? '/app/alunos' : '/app/levantamentos'
  const title = student ? 'Alunos cadastrados' : 'Levantamentos cadastrados'
  const [params, setParams] = useSearchParams()
  const [cpfError, setCpfError] = useState('')
  const page = /^\d+$/.test(params.get('page') ?? '') ? Math.min(Number(params.get('page')), 2147483647) : 0
  const query = new URLSearchParams({ page: String(page), size: '20' })
  for (const key of student ? ['name', 'cpf', 'status'] : ['name', 'cpf']) {
    if (params.get(key)) query.set(key, params.get(key)!)
  }
  const resource = useRecordResource<RecordPage>(`${recordPath(kind)}?${query}`)
  const data = resource.data
  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const cpf = String(form.get('cpf') ?? '').trim()
    if (cpf && !isValidCpf(cpf)) { setCpfError('Informe um CPF válido com 11 dígitos.'); return }
    setCpfError('')
    const next = new URLSearchParams()
    for (const key of ['name', 'cpf', ...(student ? ['status'] : [])]) {
      const value = String(form.get(key) ?? '').trim()
      if (value) next.set(key, key === 'cpf' ? value.replace(/\D/g, '') : value)
    }
    setParams(next)
    if (next.toString() === params.toString()) resource.retry()
  }
  function goToPage(next: number) {
    const updated = new URLSearchParams(params)
    updated.set('page', String(next)); setParams(updated)
  }
  const actionClass = 'inline-flex min-h-11 items-center rounded-lg px-3 py-2 font-semibold text-link underline underline-offset-4 hover:bg-success-soft'
  return <div className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="text-2xl font-bold text-foreground">{title}</h1><p className="mt-2 text-secondary">Consulte os cadastros concluídos e abra uma ficha para ver os dados completos.</p></div>
      <Link className={actionClass} to={`${base}/novo`}>{student ? 'Cadastrar aluno' : 'Novo levantamento'}</Link>
    </div>
    <form key={params.toString()} onSubmit={search} className="rounded-xl border border-line bg-surface p-5" noValidate aria-label="Buscar cadastros">
      <div className="grid items-start gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Input id="records-name" name="name" label={student ? 'Nome do aluno' : 'Nome do responsável'} defaultValue={params.get('name') ?? ''} />
        <MaskedInput id="records-cpf" name="cpf" label="CPF completo" mask="cpf" defaultValue={params.get('cpf') ?? ''} hint="Para buscar por CPF, informe os 11 dígitos." error={cpfError} onChange={() => setCpfError('')} />
        {student && <Select id="records-status" name="status" label="Situação" placeholder="Todas" defaultValue={params.get('status') ?? ''} options={[{ value: 'ATIVO', label: 'Ativos' }, { value: 'INATIVO', label: 'Inativos' }]} />}
      </div>
      <div className="mt-4 flex flex-wrap gap-3">
        <Button type="submit">Buscar</Button>
        <Button type="button" variant="secondary" onClick={(event) => { event.currentTarget.form?.reset(); setCpfError(''); setParams({}); if (!params.size) resource.retry() }}>Limpar filtros</Button>
        <Button type="button" variant="secondary" disabled={resource.loading} onClick={resource.retry}>Atualizar lista</Button>
      </div>
    </form>
    <section aria-label="Resultados da busca" aria-busy={resource.loading} className="rounded-xl border border-line bg-surface p-5">
      {resource.loading ? <p role="status" className="text-secondary">Carregando cadastros...</p>
        : resource.error ? <div role="alert"><p className="text-danger-strong">Não foi possível carregar os cadastros. {resource.error.message}</p><Button type="button" variant="secondary" className="mt-3" onClick={resource.retry}>Tentar novamente</Button></div>
        : data && <>
          <p aria-live="polite" className="mb-4 text-sm text-secondary">{data.totalElements} {data.totalElements === 1 ? 'cadastro encontrado' : 'cadastros encontrados'}.</p>
          {!data.content.length ? <p className="py-4 text-secondary">{params.get('name') || params.get('cpf') || params.get('status') ? 'Nenhum cadastro encontrado para os filtros informados.' : 'Nenhum cadastro concluído nesta lista. Rascunhos aparecem nos formulários de preenchimento.'}</p> : <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <caption className="sr-only">{title}</caption>
              <thead className="border-b border-line text-secondary"><tr>
                {(student ? ['Nome', 'Atividade', 'CPF', 'Nascimento', 'Situação', 'Ficha'] : ['Responsável familiar', 'Data de referência', 'Última atualização', 'Ficha']).map((label) => <th key={label} scope="col" className="px-3 py-3 font-semibold">{label}</th>)}
              </tr></thead>
              <tbody className="divide-y divide-line-soft">{data.content.map((item) => <tr key={item.id} className="hover:bg-canvas">
                <th scope="row" className="px-3 py-3 font-medium text-foreground">{student ? item.name : item.responsibleName}</th>
                {student ? <><td className="px-3 py-3">{item.activity || 'Não informado'}</td><td className="whitespace-nowrap px-3 py-3">{item.cpf || 'Não informado'}</td><td className="whitespace-nowrap px-3 py-3">{displayDate(item.birthDate)}</td><td className="px-3 py-3"><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === 'ATIVO' ? 'bg-success text-link' : 'bg-subtle text-secondary'}`}>{item.status === 'ATIVO' ? 'Ativo' : 'Inativo'}</span></td></>
                  : <><td className="whitespace-nowrap px-3 py-3">{displayDate(item.referenceDate)}</td><td className="whitespace-nowrap px-3 py-3">{displayDateTime(item.updatedAt)}</td></>}
                <td className="px-3 py-3"><Link className={actionClass} to={`${base}/${item.id}?${params}`} aria-label={`Ver ficha de ${student ? item.name : item.responsibleName}`}>Ver ficha</Link></td>
              </tr>)}</tbody>
            </table>
          </div>}
          {data.totalPages > 1 && <nav aria-label="Paginação" className="mt-5 flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
            <Button type="button" variant="secondary" disabled={page === 0} onClick={() => goToPage(page - 1)}>Anterior</Button>
            <p className="text-sm text-secondary">Página {page + 1} de {data.totalPages}</p>
            <Button type="button" variant="secondary" disabled={page >= data.totalPages - 1} onClick={() => goToPage(page + 1)}>Próxima</Button>
          </nav>}
        </>}
    </section>
  </div>
}
