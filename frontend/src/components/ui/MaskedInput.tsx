import { forwardRef, type ChangeEvent } from 'react'
import { masks, type MaskName } from '../../lib/masks'
import { Input, type InputProps } from './Input'

type MaskedInputProps = InputProps & {
  mask: MaskName
}

export const MaskedInput = forwardRef<HTMLInputElement, MaskedInputProps>(
  function MaskedInput({ mask, onChange, ...props }, ref) {
    function handleChange(event: ChangeEvent<HTMLInputElement>) {
      event.target.value = masks[mask](event.target.value)
      onChange?.(event)
    }

    return <Input ref={ref} inputMode="numeric" onChange={handleChange} {...props} />
  },
)