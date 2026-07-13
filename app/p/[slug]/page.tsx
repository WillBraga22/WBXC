import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Metric } from '@/components/ui/metric'
import { formatCurrency } from '@/lib/utils'

interface PageProps {
  params: Promise<{ slug: string }>
}

export default async function ProposalPage({ params }: PageProps) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: proposal } = await supabase
    .from('proposals')
    .select('*, clients(full_name)')
    .eq('slug', slug)
    .eq('status', 'published')
    .single()

  if (!proposal) notFound()

  return (
    <main className="mx-auto max-w-3xl px-6 py-24 md:py-32">
      {/* Hero */}
      <section className="flex flex-col gap-4">
        <span className="text-sm uppercase tracking-wide text-muted">
          Proposta patrimonial
        </span>
        <h1 className="text-5xl font-semibold tracking-tight md:text-6xl">
          {proposal.title}
        </h1>
        {proposal.objective && (
          <p className="max-w-xl text-base leading-relaxed text-muted">
            {proposal.objective}
          </p>
        )}
      </section>

      {/* Indicadores principais */}
      <section className="mt-20 grid grid-cols-2 gap-8 md:grid-cols-3">
        <Metric
          value={proposal.credit_value}
          label="Crédito"
          format={(v) => formatCurrency(v)}
          variant="primary"
        />
        <Metric
          value={proposal.installment_value}
          label="Parcela mensal"
          format={(v) => formatCurrency(v)}
        />
        <Metric value={proposal.term_months} label="Prazo (meses)" />
      </section>

      {/* CTA */}
      <section className="mt-24 border-t border-border pt-12">
        <a
          href="#"
          className="inline-flex h-12 items-center justify-center rounded-md bg-primary px-8 text-base font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Falar com o consultor
        </a>
      </section>
    </main>
  )
}
