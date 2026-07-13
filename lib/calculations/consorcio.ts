import {
  BID_MODALITY_TABLE,
  BID_TERM_BUCKETS,
  suggestedFidelityModality,
  type BidModalityName,
  type BidTermBucket,
} from './bid-tables'

export type CreditType = 'IMOVEL' | 'VEICULO'
export type BidDiscountTarget = 'PARCELA' | 'PRAZO'
export type InstallmentMode = 'NORMAL' | 'MEIA'

export interface ConsortiumInputs {
  creditInitial: number
  /** Prazo total do grupo, em meses (ex: 180) */
  groupTermMonths: number
  creditType: CreditType
  /** Reajuste anual do consórcio (INCC/INPC), ex: 0.05 para 5% */
  inccRate: number
  /** Taxa de administração + fundo de reserva, ex: 0.23 para imóvel */
  adminFeeRate: number
  /** Taxa de seguro de vida mensal sobre o saldo devedor (0 se não houver) */
  insuranceRate: number
  /** Em quantos meses (a partir de hoje) a simulação assume a contemplação */
  monthsToContemplation: number
  /** Parcela inteira ou meia parcela na adesão do plano */
  installmentMode: InstallmentMode
  /** Descontar o lance no prazo restante ou na parcela pós-contemplação */
  bidDiscountTarget: BidDiscountTarget
  /** Assembleias já realizadas do grupo (0 para propostas de grupo novo/em formação) */
  assembliesHeld?: number
}

export interface ScenarioInputs {
  /** % de venda da carta contemplada, ex: 0.2 para 20% */
  quotaResalePercent: number
  /** % de locação mensal sobre o valor do bem, ex: 0.005 para 0,5% */
  propertyRentalPercent: number
  /** % de rendimento mensal da aplicação do crédito, ex: 0.009 para 0,9% */
  reinvestmentYieldPercent: number
}

export interface BidModalityResult {
  name: BidModalityName
  /** Prazo (em meses) usado para calcular esse lance */
  termBucket: BidTermBucket
  /** Meses de fidelidade exigidos (0 = não se aplica) */
  fidelityMonthsRequired: number
  /** Crédito líquido liberado na contemplação (após descontar o embutido) */
  netCredit: number
  /** % de lance embutido sobre o crédito atualizado */
  embeddedBidPercent: number
  /** Valor em R$ do lance embutido */
  embeddedBidValue: number
  /** Parcela mensal após a contemplação (sem seguro) */
  installmentAfterAward: number
  /** Parcela mensal após a contemplação (com seguro, se houver) */
  installmentAfterAwardWithInsurance: number
  /** Prazo restante em meses após a contemplação */
  remainingTermMonths: number
}

export interface InvestmentScenarioResult {
  /** Cenário 1: vender a carta contemplada */
  resale: {
    saleValue: number
    amountInvestedUntilAward: number
    profit: number
    monthlyProfitabilityPercent: number
  }
  /** Cenário 2: usar o crédito para comprar um bem e alugá-lo */
  rental: {
    monthlyRentalIncome: number
    installmentAfterAward: number
    netMonthlyReturn: number
  }
  /** Cenário 3: aplicar o crédito contemplado a juros */
  reinvestment: {
    monthlyApplicationYield: number
    projectedWithdrawalAtTermEnd: number
  }
}

/**
 * Reajusta o crédito pelo índice INCC/INPC, aplicado de forma composta a
 * cada 12 meses decorridos — replica exatamente o comportamento observado
 * na tabela de referência da planilha (coluna "Crédito" da aba G_Dados).
 */
export function reindexCredit(creditInitial: number, inccRate: number, monthsElapsed: number): number {
  const yearsElapsed = Math.floor(Math.max(monthsElapsed - 1, 0) / 12)
  return creditInitial * Math.pow(1 + inccRate, yearsElapsed)
}

/**
 * Parcela cheia mensal: (crédito + taxa de administração) / prazo do grupo,
 * mais o seguro de vida quando aplicável.
 */
export function fullInstallment(
  credit: number,
  adminFeeRate: number,
  termMonths: number,
  insuranceValue = 0
): number {
  return (credit * (1 + adminFeeRate)) / termMonths + insuranceValue
}

function nearestTermBucket(termMonths: number): BidTermBucket {
  return BID_TERM_BUCKETS.reduce((closest, bucket) =>
    Math.abs(bucket - termMonths) < Math.abs(closest - termMonths) ? bucket : closest
  )
}

/**
 * Calcula os números de uma modalidade específica de lance, para o crédito
 * já reajustado de uma proposta.
 */
export function calculateBidModality(
  modality: BidModalityName,
  inputs: ConsortiumInputs,
  updatedCredit: number,
  amountPaidUntilAward: number
): BidModalityResult {
  const termBucket = nearestTermBucket(inputs.groupTermMonths)
  const row = BID_MODALITY_TABLE[modality]

  const embeddedBidPercent = row.embeddedBidPercent[termBucket] ?? 0
  const embeddedBidValue = embeddedBidPercent * updatedCredit
  const netCredit = updatedCredit - embeddedBidValue

  const updatedAdminFee = updatedCredit * inputs.adminFeeRate
  const totalObligation = updatedCredit + updatedAdminFee
  const outstandingBalance = totalObligation - amountPaidUntilAward - embeddedBidValue

  const bidTermMonths = row.bidInstallments[termBucket] ?? 0
  // "Prazo Pgto" real: meses restantes do grupo a partir de hoje.
  const groupRemainingTerm =
    inputs.groupTermMonths - (inputs.assembliesHeld ?? 0) - inputs.monthsToContemplation

  // Contemplação por lance dá 2 meses de isenção de parcela (regra da planilha).
  const remainingTermMonths =
    inputs.bidDiscountTarget === 'PRAZO'
      ? groupRemainingTerm - bidTermMonths - 2
      : groupRemainingTerm - 2

  const installmentAfterAward = outstandingBalance / Math.max(remainingTermMonths, 1)
  const insuranceCost = outstandingBalance * inputs.insuranceRate
  const installmentAfterAwardWithInsurance = installmentAfterAward + insuranceCost

  return {
    name: modality,
    termBucket,
    fidelityMonthsRequired: row.fidelityMonthsRequired,
    netCredit,
    embeddedBidPercent,
    embeddedBidValue,
    installmentAfterAward,
    installmentAfterAwardWithInsurance,
    remainingTermMonths,
  }
}

/**
 * Contemplação por sorteio (sem lance): crédito integral, sem desconto
 * embutido, prazo restante sem os 2 meses de isenção (isenção é só p/ lance).
 */
export function calculateDrawModality(
  inputs: ConsortiumInputs,
  updatedCredit: number,
  amountPaidUntilAward: number
): BidModalityResult {
  const updatedAdminFee = updatedCredit * inputs.adminFeeRate
  const totalObligation = updatedCredit + updatedAdminFee
  const outstandingBalance = totalObligation - amountPaidUntilAward

  const remainingTermMonths =
    inputs.groupTermMonths - (inputs.assembliesHeld ?? 0) - inputs.monthsToContemplation

  const installmentAfterAward = outstandingBalance / Math.max(remainingTermMonths, 1)
  const insuranceCost = outstandingBalance * inputs.insuranceRate

  return {
    name: 'Sorteio' as BidModalityName,
    termBucket: nearestTermBucket(inputs.groupTermMonths),
    fidelityMonthsRequired: 0,
    netCredit: updatedCredit,
    embeddedBidPercent: 0,
    embeddedBidValue: 0,
    installmentAfterAward,
    installmentAfterAwardWithInsurance: installmentAfterAward + insuranceCost,
    remainingTermMonths,
  }
}

/**
 * Roda a simulação completa: crédito atualizado, valor já pago até a
 * contemplação simulada, e o resultado de cada modalidade de lance
 * (Sorteio + as 5 modalidades da tabela de referência).
 */
export function runFullSimulation(inputs: ConsortiumInputs) {
  const updatedCredit = reindexCredit(inputs.creditInitial, inputs.inccRate, inputs.monthsToContemplation)

  const fullInstallmentAtAdhesion = fullInstallment(inputs.creditInitial, inputs.adminFeeRate, inputs.groupTermMonths)
  const installmentUsed = inputs.installmentMode === 'MEIA' ? fullInstallmentAtAdhesion / 2 : fullInstallmentAtAdhesion

  // Aproximação do "valor já investido até a contemplação": parcela usada
  // (inteira ou meia) multiplicada pelos meses decorridos. A planilha real
  // usa uma tabela auxiliar mês a mês (aba "Aplic Pós Cont_Dados"); esta é
  // a mesma aproximação que a própria planilha usa como fallback (célula D55).
  const amountPaidUntilAward = installmentUsed * inputs.monthsToContemplation

  const draw = calculateDrawModality(inputs, updatedCredit, amountPaidUntilAward)

  const modalityNames: BidModalityName[] = [
    'Lance Fixo',
    'Lance Limitado',
    'Lance Fidelidade 6pclas',
    'Lance Fidelidade 12pclas',
    'Lance Fidelidade 18pclas',
  ]

  const bidModalities = modalityNames.map((name) =>
    calculateBidModality(name, inputs, updatedCredit, amountPaidUntilAward)
  )

  const recommendedFidelity = suggestedFidelityModality(inputs.monthsToContemplation)

  return {
    updatedCredit,
    fullInstallmentAtAdhesion,
    amountPaidUntilAward,
    draw,
    bidModalities,
    recommendedFidelity,
  }
}

/**
 * Cenários de "transforme seu consórcio em investimento": venda da carta,
 * locação do bem, ou aplicação do crédito contemplado.
 */
export function calculateInvestmentScenarios(
  updatedCredit: number,
  amountPaidUntilAward: number,
  installmentAfterAward: number,
  remainingTermMonths: number,
  scenario: ScenarioInputs
): InvestmentScenarioResult {
  // Venda da carta contemplada
  const saleValue = updatedCredit * scenario.quotaResalePercent
  const profit = saleValue - amountPaidUntilAward
  const monthlyProfitabilityPercent =
    amountPaidUntilAward > 0 ? profit / amountPaidUntilAward / Math.max(1, 1) : 0

  // Locação do bem
  const monthlyRentalIncome = updatedCredit * scenario.propertyRentalPercent
  const netMonthlyReturn = monthlyRentalIncome - installmentAfterAward

  // Aplicação do crédito contemplado (juros compostos mensais até o fim do prazo)
  const projectedWithdrawalAtTermEnd =
    updatedCredit * Math.pow(1 + scenario.reinvestmentYieldPercent, Math.max(remainingTermMonths, 0))

  return {
    resale: {
      saleValue,
      amountInvestedUntilAward: amountPaidUntilAward,
      profit,
      monthlyProfitabilityPercent,
    },
    rental: {
      monthlyRentalIncome,
      installmentAfterAward,
      netMonthlyReturn,
    },
    reinvestment: {
      monthlyApplicationYield: scenario.reinvestmentYieldPercent,
      projectedWithdrawalAtTermEnd,
    },
  }
}
