'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { proposalFormSchema, type ProposalFormValues } from '@/lib/validations/proposal'
import { createProposal } from '@/services/proposals'

export interface CreateProposalActionState {
  error?: string
}

export async function createProposalAction(
  data: ProposalFormValues
): Promise<CreateProposalActionState> {
  const parsed = proposalFormSchema.safeParse(data)
  if (!parsed.success) {
    return { error: 'Dados inválidos. Revise os campos destacados.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Sessão expirada. Faça login novamente.' }
  }

  let proposalId: string
  try {
    const result = await createProposal(user.id, parsed.data)
    proposalId = result.id
  } catch (err) {
    return { error: err instanceof Error ? err.message : 'Falha ao salvar a proposta.' }
  }

  redirect(`/propostas/${proposalId}/editar`)
}
