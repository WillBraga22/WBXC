import { createClient } from '@/lib/supabase/server'
import type { ProposalFormValues } from '@/lib/validations/proposal'
import { runFullSimulation, type ConsortiumInputs } from '@/lib/calculations/consorcio'

interface CreateProposalResult {
  id: string
  slug: string
}

/**
 * Cria uma proposta a partir dos dados do formulário: roda a simulação,
 * grava a linha em `proposals` e uma linha em `bid_modalities` para cada
 * modalidade de lance calculada.
 *
 * Roda no servidor (Server Action) para que o RLS do Supabase valide o
 * `user_id` a partir da sessão, sem precisar confiar em nada vindo do client.
 */
export async function createProposal(
  userId: string,
  data: ProposalFormValues
): Promise<CreateProposalResult> {
  const supabase = await createClient()

  const inputs: ConsortiumInputs = {
    creditInitial: data.creditInitial,
    groupTermMonths: data.groupTermMonths,
    creditType: data.creditType,
    inccRate: data.inccRate,
    adminFeeRate: data.adminFeeRate,
    insuranceRate: data.insuranceRate,
    monthsToContemplation: data.monthsToContemplation,
    installmentMode: data.installmentMode,
    bidDiscountTarget: data.bidDiscountTarget,
  }

  const simulation = runFullSimulation(inputs)

  const { data: proposal, error: proposalError } = await supabase
    .from('proposals')
    .insert({
      user_id: userId,
      client_id: data.clientId,
      title: data.title,
      objective: data.objective ?? null,
      credit_value: data.creditInitial,
      term_months: data.groupTermMonths,
      installment_value:
        data.installmentMode === 'MEIA'
          ? simulation.fullInstallmentAtAdhesion / 2
          : simulation.fullInstallmentAtAdhesion,
      readjustment_index_rate: data.inccRate,
      quota_resale_percent: data.quotaResalePercent ?? null,
      property_rental_percent: data.propertyRentalPercent ?? null,
      reinvestment_yield_percent: data.reinvestmentYieldPercent ?? null,
      observations: data.observations ?? null,
      status: 'draft',
    })
    .select('id, slug')
    .single()

  if (proposalError || !proposal) {
    throw new Error(proposalError?.message ?? 'Falha ao criar a proposta')
  }

  const bidModalityRows = simulation.bidModalities.map((modality, index) => ({
    proposal_id: proposal.id,
    name: modality.name,
    term_months_for_bid: modality.termBucket,
    net_credit: modality.netCredit,
    embedded_bid_percent: modality.embeddedBidPercent,
    embedded_bid_value: modality.embeddedBidValue,
    installment_after_award: modality.installmentAfterAward,
    remaining_term_months: modality.remainingTermMonths,
    fidelity_months: modality.fidelityMonthsRequired,
    order_index: index,
  }))

  const { error: bidModalitiesError } = await supabase
    .from('bid_modalities')
    .insert(bidModalityRows)

  if (bidModalitiesError) {
    throw new Error(bidModalitiesError.message)
  }

  return { id: proposal.id, slug: proposal.slug }
}

export async function getProposalById(id: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('proposals')
    .select('*, clients(full_name), bid_modalities(*)')
    .eq('id', id)
    .single()

  if (error) return null
  return data
}
