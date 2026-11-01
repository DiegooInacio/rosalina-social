import { forwardRef } from 'react'
import { kinshipOptions, normalizeKinship } from '../../features/student-registration/kinship'
import { Select } from './Select'

type Props = { id: string; label: string; name: string; value: string; onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void; onBlur?: () => void; error?: string }
export const KinshipSelect = forwardRef<HTMLSelectElement, Props>(function KinshipSelect({ value: raw, ...props }, ref) {
  const value = normalizeKinship(raw)
  const options = value && !kinshipOptions.some((option) => option.value === value)
    ? [{ value, label: `${value} (salvo anteriormente)` }, ...kinshipOptions] : kinshipOptions
  return <Select {...props} ref={ref} value={value} placeholder="Não informado" options={options} />
})
