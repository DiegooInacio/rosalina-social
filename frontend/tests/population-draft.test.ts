import { describe, expect, it } from 'vitest'
import { restorePopulationDraft } from '../src/features/population-survey/population-draft'
import { populationSchema } from '../src/features/population-survey/population.schema'

describe('CIN em rascunhos anteriores', () => {
  it('recupera CIN no CPF e unifica o documento dos integrantes', () => {
    const data = restorePopulationDraft({
      responsible: { name: 'Maria', documentType: 'CIN', documentNumber: '52998224725' },
      members: [{ name: 'Maria', documentType: 'CIN', documentNumber: '52998224725', isResponsible: true }],
    })
    expect(data.responsible).toMatchObject({ cpf: '52998224725', documentType: '', documentNumber: '' })
    expect(data.members[0]).toMatchObject({ documentType: 'CPF', documentNumber: '52998224725' })
    expect(populationSchema.safeParse(data).success).toBe(true)
  })

  it('remove somente a repetição do mesmo CPF com máscaras diferentes', () => {
    const data = restorePopulationDraft({ responsible: { cpf: '529.982.247-25', documentType: 'CIN', documentNumber: '52998224725' } })
    expect(data.responsible).toMatchObject({ cpf: '529.982.247-25', documentType: '', documentNumber: '' })
  })

  it('preserva CPF e CIN divergentes para conferência', () => {
    const data = restorePopulationDraft({ responsible: { cpf: '11144477735', documentType: 'CIN', documentNumber: '52998224725' } })
    expect(data.responsible).toMatchObject({ cpf: '11144477735', documentType: 'CIN', documentNumber: '52998224725' })
  })

  it('preserva documentos incompletos para correção, sem aceitá-los na conclusão', () => {
    const data = restorePopulationDraft({
      responsible: { name: 'Maria', documentType: 'CIN', documentNumber: '529' },
      members: [{ name: 'Maria', documentType: 'CIN', documentNumber: '529', isResponsible: true }],
    })
    expect(data.responsible.cpf).toBe('529')
    expect(data.members[0].documentNumber).toBe('529')
    expect(populationSchema.safeParse(data).success).toBe(false)
  })

  it('mantém RG antigo e CPF separados', () => {
    const data = restorePopulationDraft({ responsible: { cpf: '52998224725', documentType: 'RG', documentNumber: 'AB-123' } })
    expect(data.responsible).toMatchObject({ cpf: '52998224725', documentType: 'RG', documentNumber: 'AB-123' })
  })
})
