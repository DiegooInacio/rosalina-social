import { forwardRef } from 'react'
import { Select } from './Select'
import { yesNoOptions } from '../../lib/form-fields'

type Props = { id: string; label: string; name: string; value: boolean | null; onChange: (value: boolean | null) => void; onBlur: () => void }
export const NullableBooleanSelect = forwardRef<HTMLSelectElement, Props>(function NullableBooleanSelect({ value, onChange, ...props }, ref) {
  return <Select {...props} ref={ref} value={value === null ? '' : String(value)} placeholder="Não informado" options={yesNoOptions}
    onChange={(event) => onChange(event.target.value === '' ? null : event.target.value === 'true')} />
})
