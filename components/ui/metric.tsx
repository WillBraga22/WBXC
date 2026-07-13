'use client'

import { useEffect, useRef } from 'react'
import { motion, useInView, useMotionValue, useSpring } from 'framer-motion'
import { cn } from '@/lib/utils'

interface MetricProps {
  value: number
  label: string
  format?: (value: number) => string
  variant?: 'default' | 'primary'
  className?: string
}

/**
 * Exibe um número com animação de contagem quando entra na viewport.
 * Nunca reanima em rolagens subsequentes (viewport once: true).
 */
export function Metric({
  value,
  label,
  format = (v) => Math.round(v).toString(),
  variant = 'default',
  className,
}: MetricProps) {
  const ref = useRef<HTMLSpanElement>(null)
  const isInView = useInView(ref, { once: true, margin: '-10% 0px' })
  const motionValue = useMotionValue(0)
  const springValue = useSpring(motionValue, { duration: 1200, bounce: 0 })

  useEffect(() => {
    if (isInView) motionValue.set(value)
  }, [isInView, value, motionValue])

  useEffect(() => {
    return springValue.on('change', (latest) => {
      if (ref.current) ref.current.textContent = format(latest)
    })
  }, [springValue, format])

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
      className={cn('flex flex-col gap-1', className)}
    >
      <span
        ref={ref}
        className={cn(
          'text-4xl font-bold tabular-nums',
          variant === 'primary' ? 'text-primary' : 'text-foreground'
        )}
      >
        0
      </span>
      <span className="text-sm text-muted">{label}</span>
    </motion.div>
  )
}
