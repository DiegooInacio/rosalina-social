import { forwardRef } from 'react'
import { formatMoney, moneyFromDigits, moneyFromPaste } from '../../lib/money'
import { Input, type InputProps } from './Input'

type Props = Omit<InputProps, 'value' | 'defaultValue' | 'onChange' | 'onPaste' | 'type'> & {
  value: string
  onValueChange: (value: string) => void
}

export const MoneyInput = forwardRef<HTMLInputElement, Props>(function MoneyInput(
  { value, onValueChange, onKeyDown, ...props }, ref,
) {
  return <Input {...props} ref={ref} type="text" inputMode="numeric" placeholder="R$ 0,00" value={formatMoney(value)}
    onChange={(event) => {
      const next = moneyFromDigits(event.target.value)
      if (next !== null) onValueChange(next)
    }}
    onPaste={(event) => {
      event.preventDefault()
      const next = moneyFromPaste(event.clipboardData.getData('text'))
      if (next !== null) onValueChange(next)
    }}
    onKeyDown={(event) => {
      onKeyDown?.(event)
      if (!event.defaultPrevented && value !== '' && Number(value.replace(',', '.')) === 0 && ['Backspace', 'Delete'].includes(event.key)) {
        event.preventDefault()
        onValueChange('')
      }
    }} />
})
