import { z } from 'zod'

export const proposalFormSchema = z
  .object({
    // Cliente e identificação
    clientId: z.string().uuid({ message: 'Selecione um cliente' }),
    title: z.string().min(3, 'Dê um título para a proposta'),
    objective: z.string().optional(),

    // Dados do consórcio
    creditType: z.enum(['IMOVEL', 'VEICULO']),
    creditInitial: z.coerce.number().positive('Informe o valor do crédito'),
    groupTermMonths: z.coerce.number().int().positive('Informe o prazo do grupo'),
    inccRate: z.coerce.number().min(0).max(1).default(0.05),
    adminFeeRate: z.coerce.number().min(0).max(1),
    insuranceRate: z.coerce.number().min(0).max(1).default(0),
    monthsToContemplation: z.coerce.number().int().positive('Informe o prazo simulado até a contemplação'),
    installmentMode: z.enum(['NORMAL', 'MEIA']).default('MEIA'),
    bidDiscountTarget: z.enum(['PARCELA', 'PRAZO']).default('PARCELA'),

    // Cenário de investimento (opcional — só quando objetivo é "Investimento")
    quotaResalePercent: z.coerce.number().min(0).max(1).optional(),
    propertyRentalPercent: z.coerce.number().min(0).max(1).optional(),
    reinvestmentYieldPercent: z.coerce.number().min(0).max(1).optional(),

    observations: z.string().optional(),
  })
  .refine((data) => data.monthsToContemplation < data.groupTermMonths, {
    message: 'A contemplação simulada deve ocorrer antes do fim do prazo do grupo',
    path: ['monthsToContemplation'],
  })

export type ProposalFormValues = z.infer<typeof proposalFormSchema>
