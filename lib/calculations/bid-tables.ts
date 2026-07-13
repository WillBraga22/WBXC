/**
 * Tabelas de referência de lance.
 *
 * Estes números vieram diretamente da planilha real
 * ("Proposta_direcionada_com_Investimento") nas faixas B70:K92 da aba
 * "Simulação". Eles NÃO são calculados por fórmula — são parâmetros que a
 * administradora de consórcio define por prazo de grupo, e mudam quando ela
 * lança novos grupos ou revisa regras de lance embutido/fidelidade.
 *
 * Por isso ficam isolados aqui como dados de configuração, e não
 * "hardcoded" dentro da calculadora. Quando a administradora atualizar as
 * regras, o ajuste é só neste arquivo (e, no futuro, numa tela de
 * configurações — ver "settings" no schema do banco).
 *
 * Cada `termBucket` é o prazo (em meses) usado para calcular o lance —
 * não confundir com o prazo total do grupo.
 */

export type BidModalityName =
  | 'Lance Fixo'
  | 'Lance Limitado'
  | 'Lance Fidelidade 6pclas'
  | 'Lance Fidelidade 12pclas'
  | 'Lance Fidelidade 18pclas'

export const BID_TERM_BUCKETS = [180, 200, 220, 100, 120, 140, 36, 72, 240] as const

export type BidTermBucket = (typeof BID_TERM_BUCKETS)[number]

interface BidModalityRow {
  /** Nº de parcelas efetivamente ofertadas como lance (arredondado para baixo) */
  bidInstallments: Partial<Record<BidTermBucket, number>>
  /** Nº "cheio" de parcelas de lance embutido, antes do arredondamento */
  embeddedBidInstallments: Partial<Record<BidTermBucket, number>>
  /** % de lance embutido sobre o crédito atualizado */
  embeddedBidPercent: Partial<Record<BidTermBucket, number>>
  /** Meses consecutivos em dia exigidos para participar dessa modalidade (0 = não se aplica) */
  fidelityMonthsRequired: number
}

export const BID_MODALITY_TABLE: Record<BidModalityName, BidModalityRow> = {
  'Lance Fixo': {
    bidInstallments: { 180: 43, 200: 48, 220: 53, 100: 25, 120: 31, 140: 1, 36: 0, 72: 0, 240: 1 },
    embeddedBidInstallments: { 180: 43.9, 200: 48.78, 220: 53.65, 100: 25.86, 120: 31.03, 140: 36.21, 36: 0, 72: 0, 240: 58.07 },
    embeddedBidPercent: { 180: 0.2938, 200: 0.2952, 220: 0.2963, 100: 0.29, 120: 0.2997, 140: 0.0083, 36: 0, 72: 0, 240: 0.0052 },
    fidelityMonthsRequired: 0,
  },
  'Lance Limitado': {
    bidInstallments: { 180: 43, 200: 48, 220: 53, 100: 25, 120: 31, 140: 0, 36: 0, 72: 18, 240: 0 },
    embeddedBidInstallments: { 180: 43.9, 200: 48.78, 220: 53.65, 100: 25.86, 120: 31.03, 140: 0, 36: 0, 72: 18.78, 240: 0 },
    embeddedBidPercent: { 180: 0.2938, 200: 0.2952, 220: 0.2963, 100: 0.29, 120: 0.2997, 140: 0, 36: 0, 72: 0.2875, 240: 0 },
    fidelityMonthsRequired: 0,
  },
  'Lance Fidelidade 6pclas': {
    bidInstallments: { 180: 40, 200: 45, 220: 50, 100: 24, 120: 30, 140: 36, 36: 9, 72: 15, 240: 58 },
    embeddedBidInstallments: { 180: 43.9, 200: 48.78, 220: 53.65, 100: 25.86, 120: 31.03, 140: 36.21, 36: 9.86, 72: 18.78, 240: 58.07 },
    embeddedBidPercent: { 180: 0.2733, 200: 0.2768, 220: 0.2795, 100: 0.2784, 120: 0.29, 140: 0.2982, 36: 0.2738, 72: 0.2395, 240: 0.2996 },
    fidelityMonthsRequired: 6,
  },
  'Lance Fidelidade 12pclas': {
    bidInstallments: { 180: 40, 200: 45, 220: 50, 100: 24, 120: 30, 140: 33, 36: 0, 72: 8, 240: 55 },
    embeddedBidInstallments: { 180: 43.9, 200: 48.78, 220: 53.65, 100: 25.86, 120: 31.03, 140: 36.21, 36: 0, 72: 18.78, 240: 58.07 },
    embeddedBidPercent: { 180: 0.2733, 200: 0.2768, 220: 0.2795, 100: 0.2784, 120: 0.29, 140: 0.2734, 36: 0, 72: 0.1916, 240: 0.2841 },
    fidelityMonthsRequired: 12,
  },
  'Lance Fidelidade 18pclas': {
    bidInstallments: { 180: 30, 200: 35, 220: 40, 100: 20, 120: 24, 140: 0, 36: 0, 72: 0, 240: 45 },
    embeddedBidInstallments: { 180: 43.9, 200: 48.78, 220: 53.66, 100: 25.87, 120: 31.03, 140: 0, 36: 0, 72: 0, 240: 58.07 },
    embeddedBidPercent: { 180: 0.205, 200: 0.2152, 220: 0.2236, 100: 0.232, 120: 0.232, 140: 0, 36: 0, 72: 0, 240: 0.2325 },
    fidelityMonthsRequired: 18,
  },
}

/**
 * Escolhe automaticamente a modalidade "Fidelidade" recomendada com base em
 * quantos meses o cliente já pagou em dia até a contemplação simulada.
 * Reflete a regra geral da planilha (célula C19) — grupos com regras
 * especiais por número (ex: grupo 841) não estão cobertos aqui e devem ser
 * ajustados manualmente se necessário.
 */
export function suggestedFidelityModality(monthsPaidOnTime: number): BidModalityName {
  if (monthsPaidOnTime < 12) return 'Lance Fidelidade 6pclas'
  if (monthsPaidOnTime < 18) return 'Lance Fidelidade 12pclas'
  return 'Lance Fidelidade 18pclas'
}
