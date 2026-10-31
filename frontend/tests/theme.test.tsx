import { act, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
import { ThemeSelector } from '../src/features/theme/ThemeSelector'
import { getThemePreference, initializeTheme, setThemePreference, themeStorageKey } from '../src/features/theme/theme'

let darkSystem = false
let callbacks: Set<() => void>
let dispose: (() => void) | undefined
beforeEach(() => {
  localStorage.clear()
  callbacks = new Set()
  darkSystem = false
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    get matches() { return darkSystem },
    addEventListener: (_event: string, listener: () => void) => callbacks.add(listener),
    removeEventListener: (_event: string, listener: () => void) => callbacks.delete(listener),
  })))
})
afterEach(() => {
  dispose?.(); dispose = undefined
  vi.restoreAllMocks()
  localStorage.clear()
  setThemePreference('system')
  localStorage.clear()
  document.documentElement.removeAttribute('data-theme')
  document.documentElement.style.removeProperty('color-scheme')
  vi.unstubAllGlobals()
})

it('acompanha o sistema quando não há preferência salva', () => {
  darkSystem = true
  dispose = initializeTheme()
  expect(getThemePreference()).toBe('system')
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(document.documentElement.style.colorScheme).toBe('dark')
})

it('permite escolher claro/escuro e mantém a escolha salva', async () => {
  dispose = initializeTheme()
  render(<ThemeSelector />)
  await userEvent.selectOptions(screen.getByLabelText('Tema'), 'dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(localStorage.getItem(themeStorageKey)).toBe('dark')
  await userEvent.selectOptions(screen.getByLabelText('Tema'), 'light')
  expect(document.documentElement.dataset.theme).toBe('light')
  expect(localStorage.getItem(themeStorageKey)).toBe('light')
})

it('restaura tema explícito mesmo quando o sistema usa o oposto', () => {
  localStorage.setItem(themeStorageKey, 'light')
  darkSystem = true
  dispose = initializeTheme()
  expect(getThemePreference()).toBe('light')
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('reage à mudança do sistema somente no modo automático', () => {
  dispose = initializeTheme()
  darkSystem = true
  act(() => callbacks.forEach((callback) => callback()))
  expect(document.documentElement.dataset.theme).toBe('dark')
  act(() => setThemePreference('light'))
  act(() => callbacks.forEach((callback) => callback()))
  expect(document.documentElement.dataset.theme).toBe('light')
  act(() => setThemePreference('system'))
  expect(document.documentElement.dataset.theme).toBe('dark')
  darkSystem = false
  act(() => callbacks.forEach((callback) => callback()))
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('sincroniza alterações entre abas', () => {
  dispose = initializeTheme()
  render(<ThemeSelector />)
  act(() => {
    localStorage.setItem(themeStorageKey, 'dark')
    window.dispatchEvent(new StorageEvent('storage', { key: themeStorageKey, newValue: 'dark' }))
  })
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect((screen.getByLabelText('Tema') as HTMLSelectElement).value).toBe('dark')
})

it('continua permitindo trocar o tema quando o armazenamento está bloqueado', () => {
  dispose = initializeTheme()
  vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('Bloqueado') })
  setThemePreference('dark')
  expect(document.documentElement.dataset.theme).toBe('dark')
  expect(getThemePreference()).toBe('dark')
  setThemePreference('light')
  expect(document.documentElement.dataset.theme).toBe('light')
})

it('remove os observadores ao reiniciar pelo desenvolvimento', () => {
  dispose = initializeTheme()
  expect(callbacks.size).toBe(1)
  dispose(); dispose = undefined
  expect(callbacks.size).toBe(0)
})

it.each([['dark', 'dark'], ['light', 'light'], [null, 'dark']])('aplica o tema inicial %s antes de iniciar a aplicação', (saved, expected) => {
  const html = readFileSync('index.html', 'utf8')
  const script = html.match(/<script>([\s\S]*?)<\/script>/)![1]
  darkSystem = true
  if (saved) localStorage.setItem(themeStorageKey, saved)
  new Function('document', 'localStorage', 'window', script)(document, localStorage, window)
  expect(document.documentElement.dataset.theme).toBe(expected)
  expect(document.documentElement.style.colorScheme).toBe(expected)
})
