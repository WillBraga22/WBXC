# WBXC — Plataforma de Propostas Patrimoniais Premium

## 1. Visão do Produto

WBXC não é um site institucional nem um CRM genérico. É uma ferramenta de vendas de altíssimo padrão para um consultor patrimonial especializado em consórcios, que precisa transformar números (crédito, prazo, lance, rentabilidade) em uma **narrativa visual persuasiva**, entregue como link compartilhável (`/p/AB93KD`) em vez de PDF estático.

O padrão de referência de produto é Linear/Stripe/Vercel/Notion: tipografia impecável, espaço em branco generoso, motion discreto, dark mode nativo, zero "cara de CRM".

## 2. Stack e Justificativas

| Camada | Escolha | Por quê |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components reduzem JS no cliente da página pública (`/p/[slug]`), crítico para performance em link enviado a leigos via WhatsApp |
| Linguagem | TypeScript estrito | Contratos de dados (proposta, cliente, timeline) compartilhados entre form, banco e página pública — erro de tipo aqui vira bug visível pro cliente final |
| UI | TailwindCSS + shadcn/ui | Copiamos os componentes (não é dependência de pacote fechado), permitindo customização total de tema sem lutar contra a lib |
| Animação | Framer Motion | Fade/slide/count-up/scroll-reveal na página de proposta; usado com moderação (motion como reforço de hierarquia, não decoração) |
| Dados | Supabase (Postgres + RLS + Auth + Storage) | RLS resolve isolamento multi-consultor sem lógica de autorização espalhada pelo backend; Storage guarda logos/anexos de `files` |
| Forms | React Hook Form + Zod | Validação única (client + tipagem inferida), formulário de proposta tem ~10 campos com regras de negócio (ex: lance ≤ crédito) |
| Gráficos | Recharts | Comparativos (consórcio vs. financiamento) e evolução patrimonial |
| Ícones | Lucide React | Consistente com shadcn/ui, sem peso extra |

## 3. Decisões Arquiteturais

**Server Components por padrão.** Só viram Client Component quando há: estado local de UI (modais, drawers), interação imediata (formulários, contadores animados) ou hooks do Framer Motion. Listagens (dashboard, clientes) buscam dados no servidor.

**Página pública (`/p/[slug]`) é isolada do resto do app.** Não usa Sidebar/Navbar do dashboard, tem seu próprio layout, e é o único lugar onde performance de carregamento é tratada como métrica de produto (LCP baixo = menos chance do cliente final abandonar antes de ver a proposta).

**Multi-tenant via RLS, não via lógica de aplicação.** Cada `proposal`/`client` pertence a um `user_id` (o consultor). Toda policy do Supabase filtra por `auth.uid()`. Isso evita a classe de bug mais comum em SaaS: vazamento de dado entre contas por esquecimento de `WHERE` em alguma query.

**Slugs de proposta são gerados, não sequenciais.** Um ID incremental (`/p/1`, `/p/2`) permite ao cliente final adivinhar e acessar propostas de outros — usamos string curta aleatória (tipo nanoid, 6-8 chars, alfanumérico maiúsculo) validada por unicidade no banco.

**Exportação de PDF é derivada da página pública, não uma tela separada.** Renderizamos a mesma página em um modo `print`/headless (Playwright ou API de PDF) para evitar manter dois templates divergentes.

## 4. Estrutura de Pastas

```
wbxc/
├── app/
│   ├── (auth)/
│   │   ├── login/
│   │   └── layout.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx              # Sidebar + Navbar
│   │   ├── dashboard/page.tsx
│   │   ├── clientes/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── propostas/
│   │   │   ├── page.tsx
│   │   │   ├── nova/page.tsx
│   │   │   └── [id]/editar/page.tsx
│   │   ├── analytics/page.tsx
│   │   └── configuracoes/page.tsx
│   ├── p/
│   │   └── [slug]/
│   │       ├── page.tsx            # página pública da proposta
│   │       └── layout.tsx          # layout isolado, sem sidebar
│   ├── api/
│   │   └── proposals/[id]/pdf/route.ts
│   ├── layout.tsx                  # root layout, ThemeProvider
│   └── globals.css
├── components/
│   ├── ui/                         # primitives shadcn (button, card, modal...)
│   ├── dashboard/                  # KPI, metric cards, filtros
│   ├── proposal/                   # Hero, Timeline, Fluxograma, Comparativo, CTA
│   └── shared/                     # Navbar, Sidebar, Avatar, Toast, Loading
├── hooks/
│   ├── use-proposal.ts
│   ├── use-clients.ts
│   └── use-toast.ts
├── types/
│   ├── proposal.ts
│   ├── client.ts
│   └── database.ts                 # gerado do schema Supabase
├── services/
│   ├── proposals.ts                # camada de acesso a dados (CRUD)
│   ├── clients.ts
│   └── analytics.ts
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # client-side
│   │   ├── server.ts                # server-side (cookies)
│   │   └── middleware.ts
│   ├── utils.ts
│   ├── validations/                 # schemas Zod
│   └── constants.ts                 # cores, config
├── styles/
│   └── theme.ts
└── public/
```

## 5. Design System — resumo

Ver `DESIGN_SYSTEM.md` para tokens completos. Em síntese: fundo escuro (#0F172A), superfícies levemente mais claras (#111827), dourado (#C9A227) como cor de destaque/CTA usada com parcimônia, tipografia Inter, bordas sutis (#1F2937), texto secundário em cinza-azulado (#94A3B8).

## 6. Próximos passos deste projeto

1. ✅ Arquitetura e stack definidas (este documento)
2. ✅ Schema SQL completo (`supabase-schema.sql`)
3. ✅ Design system e tokens (`DESIGN_SYSTEM.md`)
4. ⏭ Scaffold do projeto Next.js + configuração Tailwind/shadcn com os tokens
5. ⏭ Componentes base (Button, Card, Metric, Timeline, Chart, Modal, Drawer...)
6. ⏭ Dashboard (listagens, KPIs)
7. ⏭ Formulário de Nova Proposta (React Hook Form + Zod)
8. ⏭ Página pública da proposta (a peça central do produto)
9. ⏭ Exportação em PDF
10. ⏭ Analytics de visualização de proposta
