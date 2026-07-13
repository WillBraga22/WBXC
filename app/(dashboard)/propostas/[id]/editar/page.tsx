import { notFound } from 'next/navigation'
import Link from 'next/link'
import { getProposalById } from '@/services/proposals'
import { Navbar } from '@/components/shared/navbar'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercent } from '@/lib/utils'

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function EditProposalPage({ params }: PageProps) {
  const { id } = await params
  const proposal = await getProposalById(id)

  if (!proposal) notFound()

  const publicUrl = `/p/${proposal.slug}`

  return (
    <>
      <Navbar title={proposal.title} />
      <main className="flex flex-col gap-6 p-6 md:p-8">
        <Card>
          <CardHeader>
            <CardTitle>Resumo</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <Summary label="Crédito" value={formatCurrency(proposal.credit_value)} />
            <Summary label="Parcela" value={formatCurrency(proposal.installment_value)} />
            <Summary label="Prazo" value={`${proposal.term_months} meses`} />
            <Summary
              label="Status"
              value={proposal.status === 'published' ? 'Publicada' : 'Rascunho'}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Modalidades de lance calculadas</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            {(proposal.bid_modalities ?? []).map((modality: {
              id: string
              name: string
              net_credit: number
              embedded_bid_percent: number
              installment_after_award: number
              remaining_term_months: number
            }) => (
              <div key={modality.id} className="rounded-md border border-border p-3">
                <p className="text-sm font-medium">{modality.name}</p>
                <p className="text-xs text-muted">
                  Crédito líquido: {formatCurrency(modality.net_credit)} · Lance embutido:{' '}
                  {formatPercent(modality.embedded_bid_percent)}
                </p>
                <p className="text-xs text-muted">
                  Parcela pós-contemplação: {formatCurrency(modality.installment_after_award)} ·{' '}
                  {modality.remaining_term_months} meses restantes
                </p>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex gap-3">
          <Button asChild variant="secondary">
            <Link href={publicUrl} target="_blank">
              Ver página pública
            </Link>
          </Button>
          {/* TODO: botão "Publicar" — troca status para 'published' via Server Action */}
        </div>
      </main>
    </>
  )
}

function Summary({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-xs text-muted">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  )
}
