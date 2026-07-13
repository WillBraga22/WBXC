import { Card, CardContent } from '@/components/ui/card'
import { Metric } from '@/components/ui/metric'
import { cn } from '@/lib/utils'

interface KpiProps {
  value: number
  label: string
  format?: (value: number) => string
  className?: string
}

export function Kpi({ value, label, format, className }: KpiProps) {
  return (
    <Card className={cn(className)}>
      <CardContent className="pt-6">
        <Metric value={value} label={label} format={format} variant="primary" />
      </CardContent>
    </Card>
  )
}
