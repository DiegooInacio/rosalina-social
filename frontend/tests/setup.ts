import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

afterEach(() => {
  cleanup()
  vi.restoreAllMocks()
})

// jsdom não implementa rolagem visual.
HTMLElement.prototype.scrollIntoView = vi.fn()
