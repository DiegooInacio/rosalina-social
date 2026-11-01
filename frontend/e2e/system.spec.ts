import { test, expect, type Page } from '@playwright/test'

const activityId = '00000000-0000-4000-8000-000000000001'
const studentId = '00000000-0000-4000-8000-000000000002'
const surveyId = '00000000-0000-4000-8000-000000000003'
const memberId = '00000000-0000-4000-8000-000000000004'
const jwt = (expired = false) => `header.${Buffer.from(JSON.stringify({ sub: 'admin@teste.local', role: 'ADMIN', type: 'access', exp: Math.floor(Date.now() / 1000) + (expired ? -60 : 3600) })).toString('base64')}.signature`

async function setup(page: Page, expired = false) {
  const state = {
    refreshes: 0, draftSaves: 0, puts: [] as Record<string, unknown>[],
    student: { id: studentId, revision: '2026-01-01T00:00:00Z', status: 'ATIVO', name: 'Ana Silva', activity: { id: activityId, name: 'Capoeira' }, birthDate: '2015-05-20', guardianPhone: '85999999999', relatives: [{ type: 'MAE', name: 'Maria' }], socioeconomic: { householdIncome: 1200.50, hasWaterSupply: false } } as Record<string, unknown>,
    survey: { id: surveyId, revision: '2026-01-01T00:00:00Z', status: 'COMPLETED', referenceDate: '2026-01-01', responsible: { name: 'Maria Silva' }, members: [{ id: memberId, name: 'Maria Silva', isResponsible: true, kinship: 'Responsável', income: 0 }], financialSummary: { memberCount: 1, incomeComplete: true, totalIncome: 0, perCapitaIncome: 0 }, authorizations: { imageAndSound: false, personalData: true } } as Record<string, unknown>,
  }
  const drafts = new Map<string, Record<string, unknown>>()
  await page.addInitScript(({ token }) => {
    localStorage.setItem('rosalina.accessToken', token)
    localStorage.setItem('rosalina.refreshToken', 'browser-refresh')
  }, { token: jwt(expired) })
  await page.route('**/api/v1/**', async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    const path = url.pathname
    const method = request.method()
    const body = request.postDataJSON() as Record<string, unknown> | null
    const fulfill = (data: unknown, status = 200) => route.fulfill({ status, json: data })
    if (path.endsWith('/auth/refresh')) { state.refreshes++; return fulfill({ accessToken: jwt(), refreshToken: 'browser-refresh-new' }) }
    if (path === '/api/v1/catalogs') return fulfill(url.searchParams.get('category') === 'ATIVIDADE' || !url.searchParams.has('category') ? [{ id: activityId, category: 'ATIVIDADE', name: 'Capoeira', active: true }] : [])
    if (path === '/api/v1/form-drafts' && method === 'GET') return fulfill({ content: [...drafts.values()].filter((draft) => draft.formType === url.searchParams.get('formType')) })
    if (path === '/api/v1/form-drafts' && method === 'POST') {
      const draft = { ...body, id: 'browser-draft', version: 0, status: 'DRAFT', updatedAt: new Date().toISOString() }
      drafts.set('browser-draft', draft); state.draftSaves++; return fulfill(draft, 201)
    }
    if (path.startsWith('/api/v1/form-drafts/')) {
      const draft = drafts.get('browser-draft')!
      if (path.endsWith('/complete')) {
        const submission = body?.submission as Record<string, unknown>
        const student = draft.formType === 'STUDENT'
        if (student) state.student = { ...submission, id: studentId, activity: { id: activityId, name: 'Capoeira' } }
        else state.survey = { ...submission, id: surveyId }
        drafts.clear()
        return fulfill({ draftId: 'browser-draft', formType: draft.formType, recordId: student ? studentId : surveyId })
      }
      if (method === 'GET') return fulfill(draft)
      if (method === 'PUT') {
        const updated = { ...draft, ...body, version: Number(draft.version) + 1, updatedAt: new Date().toISOString() }
        drafts.set('browser-draft', updated); state.draftSaves++; return fulfill(updated)
      }
      if (method === 'DELETE') { drafts.clear(); return route.fulfill({ status: 204 }) }
    }
    if (path === `/api/v1/students/${studentId}`) {
      if (method === 'PUT') {
        if (request.headers()['if-match'] !== `"${state.student.revision}"`) return fulfill({ message: 'Versão desatualizada' }, 409)
        state.puts.push(body!); state.student = { ...body, id: studentId, revision: '2026-01-01T00:00:01Z', activity: { id: activityId, name: 'Capoeira' } } }
      return fulfill(state.student)
    }
    if (path === `/api/v1/population-surveys/${surveyId}`) {
      if (method === 'PUT') {
        if (request.headers()['if-match'] !== `"${state.survey.revision}"`) return fulfill({ message: 'Versão desatualizada' }, 409)
        state.puts.push(body!); state.survey = { ...body, id: surveyId, revision: '2026-01-01T00:00:01Z' } }
      return fulfill(state.survey)
    }
    if (path === '/api/v1/students') return fulfill({ content: [{ ...state.student, activity: 'Capoeira' }], totalElements: 1, totalPages: 1, number: 0 })
    if (path === '/api/v1/population-surveys') return fulfill({ content: [{ id: surveyId, responsibleName: 'Maria Silva', referenceDate: '2026-01-01' }], totalElements: 1, totalPages: 1, number: 0 })
    return fulfill({ message: `Rota não simulada: ${method} ${path}` }, 404)
  })
  return state
}

test('renova a sessão de administrador ao entrar diretamente em atividades', async ({ page }) => {
  const state = await setup(page, true)
  await page.goto('/app/atividades')
  await expect(page.getByRole('heading', { name: 'Atividades', exact: true })).toBeVisible()
  await expect(page.getByText('Capoeira', { exact: true })).toBeVisible()
  expect(state.refreshes).toBe(1)
})

test('tema escuro persiste e autosave não desloca os campos', async ({ page }) => {
  const state = await setup(page)
  await page.goto('/app/alunos/novo')
  const name = page.getByLabel('Nome (obrigatório)', { exact: true })
  await expect(name).toBeEnabled()
  await page.getByLabel('Tema', { exact: true }).selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  const top = await name.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
  await name.fill('Aluno em rascunho')
  const pending = await name.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
  expect(Math.abs(pending - top)).toBeLessThanOrEqual(1)
  await expect.poll(() => state.draftSaves).toBeGreaterThan(0)
  await expect(page.getByText(/Rascunho salvo às/)).toBeVisible()
  const saved = await name.evaluate((element) => element.getBoundingClientRect().top + window.scrollY)
  expect(Math.abs(saved - top)).toBeLessThanOrEqual(1)
  await page.reload()
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await expect(name).toHaveValue('Aluno em rascunho')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true)
})

test('responsável sincroniza e renda/parentesco são padronizados', async ({ page }) => {
  await setup(page)
  await page.goto('/app/levantamentos/novo')
  await page.getByLabel('Nome (obrigatório)', { exact: true }).fill('Maria')
  await page.getByRole('button', { name: 'Adicionar responsável à família' }).click()
  await page.getByLabel('Nome (obrigatório)', { exact: true }).fill('Maria corrigida')
  const member = page.getByRole('group', { name: 'Integrante 1', exact: true })
  await expect(member.getByLabel('Nome completo (obrigatório)')).toHaveValue('Maria corrigida')
  await expect(member.getByLabel('Nome completo (obrigatório)')).toHaveAttribute('readonly', '')
  await member.getByLabel('Parentesco', { exact: true }).selectOption('Responsável')
  await member.getByLabel('Renda mensal (R$)').fill('123456')
  await expect(member.getByLabel('Renda mensal (R$)')).toHaveValue('R$ 1.234,56')
  await page.getByRole('button', { name: 'Salvar levantamento', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Ver ficha do cadastro salvo' })).toHaveAttribute('href', `/app/levantamentos/${surveyId}`)
})

test('edita aluno existente, restaura alterações e grava por PUT sem criar cadastro novo', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/app/alunos/${studentId}`)
  await page.getByRole('link', { name: 'Editar cadastro' }).click()
  const phone = page.getByLabel('Telefone do responsável (obrigatório)')
  await expect(phone).toBeEnabled()
  await phone.fill('85988888888')
  await page.reload()
  await expect(phone).toHaveValue('(85) 98888-8888')
  await expect(page.getByLabel('Renda familiar mensal (R$)')).toHaveValue('R$ 1.200,50')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Cadastro atualizado com sucesso.')).toBeVisible()
  expect(state.puts).toHaveLength(1)
  expect(String(state.puts[0].guardianPhone).replace(/\D/g, '')).toBe('85988888888')
  expect(state.draftSaves).toBe(0)
})

test('edita levantamento preservando o identificador do integrante e autorização Não', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/app/levantamentos/${surveyId}/editar`)
  await page.getByLabel('Nome (obrigatório)', { exact: true }).fill('Maria atualizada')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Cadastro atualizado com sucesso.')).toBeVisible()
  const members = state.puts[0].members as Record<string, unknown>[]
  expect(members[0].id).toBe(memberId)
  expect(members[0].name).toBe('Maria atualizada')
  expect(state.puts[0].authorizations).toEqual({ imageAndSound: false, personalData: true })
})


test('edita telefone preservando atividade desativada e respostas ausentes', async ({ page }) => {
  const state = await setup(page)
  await page.route('**/api/v1/catalogs?category=ATIVIDADE', (route) => route.fulfill({ json: [{ id: activityId, category: 'ATIVIDADE', name: 'Capoeira', active: false }] }))
  await page.goto(`/app/alunos/${studentId}/editar`)
  await expect(page.getByLabel('Atividade matriculada (obrigatória)')).toHaveValue(activityId)
  await expect(page.getByRole('option', { name: 'Capoeira (inativa)' })).toBeAttached()
  await expect(page.getByLabel('Possui Cadastro Único (CadÚnico)')).toHaveValue('')
  await page.getByLabel('Telefone do responsável (obrigatório)').fill('85988888888')
  await page.getByRole('button', { name: 'Salvar alterações', exact: true }).click()
  await expect(page.getByText('Cadastro atualizado com sucesso.')).toBeVisible()
  expect(state.puts[0]).toMatchObject({ activityId, cadunico: null, relatives: [{ type: 'MAE', name: 'Maria', literate: null }] })
})

test('preserva identificação preenchida somente no integrante responsável', async ({ page }) => {
  const state = await setup(page)
  state.survey.members = [{ id: memberId, name: 'Maria Silva', birthDate: '1986-01-01', age: 40, documentType: 'CIN', documentNumber: '52998224725', isResponsible: true, income: 0 }]
  await page.goto(`/app/levantamentos/${surveyId}/editar`)
  const member = page.getByRole('group', { name: 'Integrante 1', exact: true })
  await expect(member.getByLabel('Data de nascimento')).toHaveValue('01/01/1986')
  await expect(member.getByLabel('Data de nascimento')).toBeEditable()
  await expect(member.getByLabel('Idade na data de referência')).toHaveValue('40')
  await expect(member.getByLabel('CPF', { exact: true })).toHaveValue('52998224725')
  await page.getByLabel('Alergias').fill('Poeira')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Cadastro atualizado com sucesso.')).toBeVisible()
  expect(state.puts[0].members).toEqual([expect.objectContaining({ id: memberId, birthDate: '1986-01-01', age: 40, documentType: 'CIN', documentNumber: '52998224725' })])
})

test('confirma gravação concluída mesmo recebendo erro 500', async ({ page }) => {
  const state = await setup(page)
  await page.route(`**/api/v1/students/${studentId}`, async (route) => {
    if (route.request().method() === 'PUT') {
      const body = route.request().postDataJSON() as Record<string, unknown>
      state.puts.push(body)
      state.student = { ...body, id: studentId, revision: '2026-01-01T00:00:01Z', activity: { id: activityId, name: 'Capoeira' } }
      return route.fulfill({ status: 500, json: { message: 'Erro interno.' } })
    }
    return route.fulfill({ json: state.student })
  })
  await page.goto(`/app/alunos/${studentId}/editar`)
  await page.getByLabel('Telefone do responsável (obrigatório)').fill('85988888888')
  await page.getByRole('button', { name: 'Salvar alterações' }).click()
  await expect(page.getByText('Cadastro atualizado com sucesso.')).toBeVisible()
  expect(state.puts).toHaveLength(1)
})

test('trocar de conta remove o rascunho anterior da tela', async ({ page }) => {
  await setup(page)
  await page.goto('/app/alunos/novo')
  await page.getByLabel('Nome (obrigatório)', { exact: true }).fill('Dados da primeira conta')
  await page.getByRole('button', { name: 'Salvar rascunho agora' }).click()
  await expect(page.getByText(/Rascunho salvo às/)).toBeVisible()
  await page.route('**/api/v1/form-drafts?*', (route) => route.fulfill({ json: { content: [] } }))
  await page.evaluate(() => {
    const key = 'rosalina.accessToken'
    const oldValue = localStorage.getItem(key)
    const newValue = `header.${btoa(JSON.stringify({ sub: 'outra@teste.local', role: 'ADMIN', type: 'access', exp: Date.now() / 1000 + 3600 }))}.signature`
    localStorage.setItem(key, newValue)
    window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue }))
  })
  await expect(page.getByLabel('Nome (obrigatório)', { exact: true })).toHaveValue('')
})

test('compara a cópia local com dados alterados em outra sessão', async ({ page }) => {
  const state = await setup(page)
  await page.goto(`/app/alunos/${studentId}/editar`)
  await page.getByLabel('Telefone do responsável (obrigatório)').fill('85988888888')
  state.student = { ...state.student, guardianPhone: '85977777777', revision: '2026-01-01T00:00:02Z' }
  await page.reload()
  await page.getByText('Comparar minha cópia com os dados atuais', { exact: true }).click()
  await expect(page.getByRole('cell', { name: '(85) 98888-8888', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: '(85) 97777-7777', exact: true })).toBeVisible()
  expect(state.puts).toHaveLength(0)
})

test('repete a criação após perder a resposta sem criar outro rascunho', async ({ page }) => {
  await setup(page)
  const keys: string[] = []
  let saved: Record<string, unknown> | undefined
  await page.route('**/api/v1/form-drafts', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    const body = route.request().postDataJSON() as Record<string, unknown>
    keys.push(String(body.requestId))
    if (!saved) {
      saved = { ...body, id: body.requestId, version: 0, status: 'DRAFT', updatedAt: new Date().toISOString() }
      return route.abort('failed')
    }
    expect(body.requestId).toBe(saved.id)
    return route.fulfill({ status: 201, json: saved })
  })
  await page.goto('/app/alunos/novo')
  await page.getByLabel('Nome (obrigatório)', { exact: true }).fill('Um rascunho')
  await page.getByRole('button', { name: 'Salvar rascunho agora' }).click()
  await expect(page.getByText(/Não foi possível salvar o rascunho/)).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('Nome (obrigatório)', { exact: true })).toHaveValue('Um rascunho')
  await expect(page.getByText(/Rascunho salvo às/)).toBeVisible()
  expect(keys).toHaveLength(2)
  expect(new Set(keys).size).toBe(1)
})

test('mantém consultas, perfil e tema funcionando após integrar as telas', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await setup(page)
  let profile = { id: 'profile-1', name: 'Maria Silva', email: 'admin@teste.local', role: 'ADMIN' }
  await page.route('**/api/v1/me', async (route) => {
    if (route.request().method() === 'PATCH') profile = { ...profile, ...route.request().postDataJSON() }
    return route.fulfill({ json: profile })
  })
  await page.goto('/app/alunos')
  await expect(page.getByRole('heading', { name: 'Alunos cadastrados' })).toBeVisible()
  await page.getByRole('button', { name: /Minha conta/ }).click()
  await page.getByRole('link', { name: 'Meu perfil' }).click()
  await expect(page.getByRole('heading', { name: 'Meu perfil' })).toBeVisible()
  await expect(page.getByLabel('Nome (obrigatório)', { exact: true })).toHaveValue('Maria Silva')
  await page.getByLabel('Tema', { exact: true }).selectOption('dark')
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark')
  await page.getByLabel('Nome (obrigatório)', { exact: true }).fill('Maria Oliveira')
  await page.getByRole('button', { name: 'Salvar nome' }).click()
  await expect(page.getByText('Nome atualizado com sucesso.')).toBeVisible()
  await page.getByRole('link', { name: 'Levantamentos cadastrados', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Levantamentos cadastrados' })).toBeVisible()
  expect(errors).toEqual([])
})
