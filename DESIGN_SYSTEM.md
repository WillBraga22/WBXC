# WBXC — Design System

## Princípio

O produto não deve parecer um painel administrativo. Cada tela — mesmo o dashboard interno — segue os mesmos padrões de espaçamento, tipografia e motion da página pública. Não existe "tela de admin feia" e "tela bonita pro cliente".

## Tokens de cor

```ts
// styles/theme.ts
export const colors = {
  background: '#0F172A',
  surface: '#111827',
  primary: '#C9A227',
  text: '#FFFFFF',
  muted: '#94A3B8',
  border: '#1F2937',
} as const
```

Uso:
- `background`: fundo geral da aplicação
- `surface`: cards, modais, drawers — um degrau acima do fundo
- `primary` (dourado): reservado para CTAs, valores em destaque, estados ativos — nunca usado em áreas grandes
- `muted`: texto secundário, labels, legendas de gráfico
- `border`: divisórias sutis, 1px, sem sombras pesadas

Todas as cores devem satisfazer contraste AA para acessibilidade (texto branco sobre `#0F172A`/`#111827` já atende; `primary` sobre fundo escuro é usado só para elementos grandes o suficiente, não texto pequeno).

## Tipografia

Fonte: **Inter** (via `next/font/google`), com fallback de sistema.

Escala sugerida (Tailwind):
- Display (hero da proposta): `text-5xl md:text-6xl font-semibold tracking-tight`
- Título de seção: `text-2xl md:text-3xl font-semibold`
- Corpo: `text-base text-muted-foreground leading-relaxed`
- Métrica/KPI: `text-4xl font-bold tabular-nums` (números sempre com `tabular-nums` para não "dançar" durante count-up)

## Espaçamento

Escala base 4px (padrão Tailwind). Seções da proposta pública usam respiro generoso: `py-24 md:py-32` entre blocos, nunca conteúdo colado nas bordas.

## Motion (Framer Motion)

Regras:
- Toda entrada de seção usa `whileInView` com `viewport={{ once: true }}` — nunca reanima ao rolar de novo
- Duração padrão: 0.4–0.6s, easing `easeOut`
- Números (crédito, parcela, lucro) usam count-up de 1–1.5s, iniciado só quando o elemento entra na viewport
- Nunca mais de uma animação de entrada "chamativa" por viewport — hierarquia visual vem de tipografia e espaço, não de movimento

## Componentes base (biblioteca `components/ui`)

| Componente | Responsabilidade |
|---|---|
| `Button` | Variantes: primary (dourado), secondary (outline), ghost. Estados: default, hover, loading, disabled |
| `Card` | Container padrão de superfície, com variante "elevated" para destaque |
| `Metric` | Número + label + variação (ex: +12%), com count-up embutido |
| `Timeline` | Lista vertical de marcos com conector visual, usado em `timeline` |
| `Chart` | Wrapper de Recharts com tema já aplicado (grid, cores, tooltip customizado) |
| `Navbar` | Topo do dashboard interno |
| `Sidebar` | Navegação lateral do dashboard (Clientes, Propostas, Analytics, Configurações) |
| `Modal` | Baseado em Radix (via shadcn), para confirmações e formulários curtos |
| `Drawer` | Painel lateral para edição rápida sem sair do contexto |
| `CurrencyInput` | Input mascarado em R$, integrado ao React Hook Form |
| `DatePicker` | Seleção de datas (ex: prazo da proposta) |
| `Progress` | Barra de progresso (ex: andamento da timeline) |
| `Loading` | Skeletons e spinners consistentes |
| `Toast` | Feedback de ações (salvar, excluir, copiar link) |
| `Avatar` | Foto/iniciais do consultor ou cliente |
| `KPI` | Card de indicador para o dashboard (usa `Metric` internamente) |

## Dark mode

Dark é o modo padrão e principal (o tema já é escuro por definição de marca). Um `ThemeProvider` deve existir para permitir modo claro futuramente, mas o lançamento inicial é dark-only.
