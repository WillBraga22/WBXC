import { createClient } from '@/lib/supabase/server'
import { Navbar } from '@/components/shared/navbar'
import { Kpi } from '@/components/dashboard/kpi'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { formatCurrency } from '@/lib/utils'
import Link from 'next/link'

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: proposals } = await supabase
    .from('proposals')
    .select('id, title, slug, status, credit_value, created_at, clients(full_name)')
    .order('created_at', { ascending: false })
    .limit(8)

  const totalProposals = proposals?.length ?? 0
  const publishedCount = proposals?.filter((p) => p.status === 'published').length ?? 0
  const totalCreditValue = proposals?.reduce((sum, p) => sum + (p.credit_value ?? 0), 0) ?? 0

  return (
    <>
      <Navbar title="Dashboard" />
      <main className="p-6 md:p-8">
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Kpi value={totalProposals} label="Propostas criadas" />
          <Kpi value={publishedCount} label="Propostas publicadas" />
          <Kpi value={totalCreditValue} label="Crédito total simulado" format={formatCurrency} />
        </section>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Propostas recentes</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-1 p-0">
            {!proposals || proposals.length === 0 ? (
              <p className="px-6 pb-6 text-sm text-muted">
                Nenhuma proposta ainda.{' '}
                <Link href="/propostas/nova" className="text-primary hover:underline">
                  Criar a primeira
                </Link>
                .
              </p>
            ) : (
              proposals.map((proposal) => (
                <Link
                  key={proposal.id}
                  href={`/propostas/${proposal.id}/editar`}
                  className="flex items-center justify-between border-t border-border px-6 py-4 transition-colors first:border-t-0 hover:bg-background"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{proposal.title}</span>
                    <span className="text-xs text-muted">
                      {(proposal.clients as unknown as { full_name: string } | null)?.full_name}
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm tabular-nums text-muted">
                      {formatCurrency(proposal.credit_value ?? 0)}
                    </span>
                    <span
                      className={
                        proposal.status === 'published'
                          ? 'rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary'
                          : 'rounded-full bg-border px-2 py-0.5 text-xs text-muted'
                      }
                    >
                      {proposal.status === 'published' ? 'Publicada' : 'Rascunho'}
                    </span>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>
      </main>
    </>
  )
}
