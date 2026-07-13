'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export interface CurrencyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value'> {
  value: number
  onChange: (value: number) => void
}

/**
 * Input mascarado em R$. Guarda o valor como número (para o React Hook
 * Form / Zod), mas exibe formatado enquanto o usuário digita.
 */
const CurrencyInput = React.forwardRef<HTMLInputElement, CurrencyInputProps>(
  ({ value, onChange, className, ...props }, ref) => {
    const [displayValue, setDisplayValue] = React.useState(() => formatDigits(value))

    function formatDigits(cents: number) {
      const reais = cents / 100
      return reais.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      const digitsOnly = e.target.value.replace(/\D/g, '')
      const cents = digitsOnly ? parseInt(digitsOnly, 10) : 0
      setDisplayValue(formatDigits(cents))
      onChange(cents / 100)
    }

    return (
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted">
          R$
        </span>
        <input
          ref={ref}
          inputMode="numeric"
          className={cn(
            'h-10 w-full rounded-md border border-border bg-transparent pl-9 pr-3 text-sm text-foreground outline-none placeholder:text-muted focus-visible:ring-2 focus-visible:ring-primary',
            className
          )}
          value={displayValue}
          onChange={handleChange}
          {...props}
        />
      </div>
    )
  }
)
CurrencyInput.displayName = 'CurrencyInput'

export { CurrencyInput }
