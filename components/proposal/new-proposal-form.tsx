'use client'

import { useMemo, useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { proposalFormSchema, type ProposalFormValues } from '@/lib/validations/proposal'
import { runFullSimulation, type ConsortiumInputs } from '@/lib/calculations/consorcio'
import { createProposalAction } from '@/app/(dashboard)/propostas/actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CurrencyInput } from '@/components/ui/currency-input'
import { Button } from '@/components/ui/button'
import { formatCurrency, formatPercent } from '@/lib/utils'

const ADMIN_FEE_DEFAULTS = { IMOVEL: 0.23, VEICULO: 0.16 } as const

export function NewProposalForm({ clients }: { clients: { id: string; full_name: string }[] }) {
  const [serverError, setServerError] = useState<string | null>(null)

  const {
    register,
    watch,
    setValue,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ProposalFormValues>({
    resolver: zodResolver(proposalFormSchema),
    defaultValues: {
      creditType: 'IMOVEL',
      creditInitial: 150000,
      groupTermMonths: 180,
      inccRate: 0.05,
      adminFeeRate: ADMIN_FEE_DEFAULTS.IMOVEL,
      insuranceRate: 0,
      monthsToContemplation: 25,
      installmentMode: 'MEIA',
      bidDiscountTarget: 'PARCELA',
    },
  })

  const values = watch()

  // Recalcula a simulação em tempo real a cada mudança no formulário —
  // é isso que dá ao consultor o "preview" imediato do que o cliente final vai ver.
  const simulation = useMemo(() => {
    if (!values.creditInitial || !values.groupTermMonths || !values.monthsToContemplation) return null

    const inputs: ConsortiumInputs = {
      creditInitial: values.creditInitial,
      groupTermMonths: values.groupTermMonths,
      creditType: values.creditType,
      inccRate: values.inccRate ?? 0.05,
      adminFeeRate: values.adminFeeRate ?? ADMIN_FEE_DEFAULTS[values.creditType],
      insuranceRate: values.insuranceRate ?? 0,
      monthsToContemplation: values.monthsToContemplation,
      installmentMode: values.installmentMode ?? 'MEIA',
      bidDiscountTarget: values.bidDiscountTarget ?? 'PARCELA',
    }

    try {
      return runFullSimulation(inputs)
    } catch {
      return null
    }
  }, [values])

  function onCreditTypeChange(type: 'IMOVEL' | 'VEICULO') {
    setValue('creditType', type)
    setValue('adminFeeRate', ADMIN_FEE_DEFAULTS[type])
  }

  async function onSubmit(data: ProposalFormValues) {
    setServerError(null)
    const result = await createProposalAction(data)
    if (result?.error) {
      setServerError(result.error)
    }
    // Em caso de sucesso, o Server Action já faz o redirect() para
    // /propostas/[id]/editar — não há nada mais a fazer aqui.
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_380px]">
      {/* Coluna do formulário */}
      <div className="flex flex-col gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Dados da proposta</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Cliente" error={errors.clientId?.message} className="sm:col-span-2">
              <select
                {...register('clientId')}
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="">Selecione um cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.full_name}
                  </option>
                ))}
              </select>
            </Field>

            <Field label="Título da proposta" error={errors.title?.message} className="sm:col-span-2">
              <input
                {...register('title')}
                placeholder="Ex: Apartamento 2 quartos — Paulo Silva"
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </Field>

            <Field label="Tipo de bem">
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={values.creditType === 'IMOVEL' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onCreditTypeChange('IMOVEL')}
                >
                  Imóvel
                </Button>
                <Button
                  type="button"
                  variant={values.creditType === 'VEICULO' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => onCreditTypeChange('VEICULO')}
                >
                  Veículo
                </Button>
              </div>
            </Field>

            <Field label="Objetivo da proposta">
              <input
                {...register('objective')}
                placeholder="Ex: Investimento, moradia, troca de veículo"
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Simulação do consórcio</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Valor do crédito inicial" error={errors.creditInitial?.message}>
              <CurrencyInput
                value={values.creditInitial * 100 || 0}
                onChange={(v) => setValue('creditInitial', v)}
              />
            </Field>

            <Field label="Prazo do grupo (meses)" error={errors.groupTermMonths?.message}>
              <input
                type="number"
                {...register('groupTermMonths')}
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </Field>

            <Field label="Meses até a contemplação simulada" error={errors.monthsToContemplation?.message}>
              <input
                type="number"
                {...register('monthsToContemplation')}
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </Field>

            <Field label="Reajuste INCC/INPC (%)">
              <input
                type="number"
                step="0.01"
                {...register('inccRate')}
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </Field>

            <Field label="Taxa adm. + fundo de reserva (%)">
              <input
                type="number"
                step="0.01"
                {...register('adminFeeRate')}
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </Field>

            <Field label="Parcela na adesão">
              <select
                {...register('installmentMode')}
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <option value="MEIA">Meia parcela</option>
                <option value="NORMAL">Parcela normal</option>
              </select>
            </Field>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Cenário de investimento (opcional)</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <Field label="Venda da carta contemplada (%)">
              <input
                type="number"
                step="0.01"
                {...register('quotaResalePercent')}
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </Field>
            <Field label="Locação do bem (%)">
              <input
                type="number"
                step="0.001"
                {...register('propertyRentalPercent')}
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </Field>
            <Field label="Rendimento da aplicação (%)">
              <input
                type="number"
                step="0.001"
                {...register('reinvestmentYieldPercent')}
                className="h-10 rounded-md border border-border bg-transparent px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-primary"
              />
            </Field>
          </CardContent>
        </Card>

        {serverError && (
          <p className="rounded-md border border-red-900/50 bg-red-950/30 px-4 py-2 text-sm text-red-400">
            {serverError}
          </p>
        )}
        <Button type="submit" loading={isSubmitting} className="self-start">
          Salvar proposta
        </Button>
      </div>

      {/* Coluna de preview ao vivo */}
      <div className="lg:sticky lg:top-6 lg:self-start">
        <Card elevated>
          <CardHeader>
            <CardTitle>Preview da simulação</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {!simulation ? (
              <p className="text-sm text-muted">Preencha os dados para ver a simulação.</p>
            ) : (
              <>
                <PreviewRow label="Crédito atualizado" value={formatCurrency(simulation.updatedCredit)} />
                <PreviewRow
                  label="Parcela na adesão"
                  value={formatCurrency(
                    values.installmentMode === 'MEIA'
                      ? simulation.fullInstallmentAtAdhesion / 2
                      : simulation.fullInstallmentAtAdhesion
                  )}
                />
                <div className="border-t border-border pt-4">
                  <p className="mb-2 text-xs uppercase tracking-wide text-muted">
                    Modalidades de lance
                  </p>
                  <div className="flex flex-col gap-3">
                    {simulation.bidModalities.map((m) => (
                      <div key={m.name} className="rounded-md border border-border p-3">
                        <p className="text-sm font-medium">{m.name}</p>
                        <p className="text-xs text-muted">
                          Crédito líquido: {formatCurrency(m.netCredit)} · Lance:{' '}
                          {formatPercent(m.embeddedBidPercent)}
                        </p>
                        <p className="text-xs text-muted">
                          Parcela pós-contemplação: {formatCurrency(m.installmentAfterAward)} ·{' '}
                          {m.remainingTermMonths} meses restantes
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </form>
  )
}

function Field({
  label,
  error,
  children,
  className,
}: {
  label: string
  error?: string
  children: React.ReactNode
  className?: string
}) {
  return (
    <label className={`flex flex-col gap-1.5 ${className ?? ''}`}>
      <span className="text-xs font-medium text-muted">{label}</span>
      {children}
      {error && <span className="text-xs text-red-400">{error}</span>}
    </label>
  )
}

function PreviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm font-semibold tabular-nums">{value}</span>
    </div>
  )
}
