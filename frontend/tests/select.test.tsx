import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { expect, it, vi } from 'vitest'
import { Select } from '../src/components/ui/Select'

const options = [{ value: 'a', label: 'Opção A' }, { value: 'b', label: 'Opção B' }]

it('exibe orientação vazia sem oferecê-la como opção selecionável', () => {
  render(<Select id="example" label="Exemplo" options={options} placeholder="Escolha uma opção" />)
  const select = screen.getByLabelText('Exemplo') as HTMLSelectElement
  expect(select.value).toBe('')
  expect(select.selectedOptions[0].textContent).toBe('Escolha uma opção')
  expect(select.selectedOptions[0].hidden).toBe(true)
  expect(select.selectedOptions[0].disabled).toBe(true)
  expect(screen.getAllByRole('option').map(option => option.textContent)).toEqual(['Opção A', 'Opção B'])
})

it('limpa select controlado, notifica o formulário e devolve o foco ao campo', async () => {
  const changed = vi.fn()
  function Controlled() {
    const [value, setValue] = useState('a')
    return <Select id="controlled" label="Controlado" options={options} value={value} onChange={event => { changed(event.target.value); setValue(event.target.value) }} />
  }
  render(<Controlled />)
  await userEvent.click(screen.getByRole('button', { name: 'Limpar seleção de Controlado' }))
  const select = screen.getByLabelText('Controlado') as HTMLSelectElement
  expect(select.value).toBe('')
  expect(changed).toHaveBeenCalledWith('')
  expect(document.activeElement).toBe(select)
  await userEvent.selectOptions(select, 'b')
  expect(select.value).toBe('b')
})

it('limpa campo sem onChange e respeita o reset nativo dos filtros', async () => {
  render(<form><Select id="filter" label="Filtro" name="filter" options={options} defaultValue="b" /><button type="reset">Restaurar</button></form>)
  const select = screen.getByLabelText('Filtro') as HTMLSelectElement
  expect(select.value).toBe('b')
  await userEvent.click(screen.getByRole('button', { name: 'Limpar seleção de Filtro' }))
  expect(select.value).toBe('')
  await userEvent.click(screen.getByRole('button', { name: 'Restaurar' }))
  expect(select.value).toBe('b')
})

it('atualiza valor e estado de edição do React Hook Form ao limpar', async () => {
  function Registered() {
    const { register, control, reset, formState: { isDirty } } = useForm({ defaultValues: { option: 'a' } })
    const value = useWatch({ control, name: 'option' })
    return <><Select id="registered" label="Registrado" options={options} {...register('option')} /><output>{`${value || 'vazio'}:${isDirty}`}</output><button onClick={() => reset()}>Restaurar</button></>
  }
  render(<Registered />)
  expect((screen.getByLabelText('Registrado') as HTMLSelectElement).value).toBe('a')
  await userEvent.click(screen.getByRole('button', { name: 'Limpar seleção de Registrado' }))
  expect(screen.getByText('vazio:true')).toBeTruthy()
  await userEvent.click(screen.getByRole('button', { name: 'Restaurar' }))
  expect((screen.getByLabelText('Registrado') as HTMLSelectElement).value).toBe('a')
  expect(screen.getByText('a:false')).toBeTruthy()
})

it('não oferece limpeza em campos obrigatórios e respeita campos desabilitados', async () => {
  render(<><Select id="required" label="Obrigatório" options={options} required defaultValue="a" /><Select id="aria-required" label="Obrigatório acessível" options={options} aria-required="true" /><fieldset disabled><Select id="disabled" label="Bloqueado" options={options} defaultValue="b" /></fieldset></>)
  expect(screen.queryByRole('button', { name: 'Limpar seleção de Obrigatório' })).toBeNull()
  expect(screen.queryByRole('button', { name: 'Limpar seleção de Obrigatório acessível' })).toBeNull()
  await userEvent.click(screen.getByRole('button', { name: 'Limpar seleção de Bloqueado' }))
  expect((screen.getByLabelText('Bloqueado') as HTMLSelectElement).value).toBe('b')
})
