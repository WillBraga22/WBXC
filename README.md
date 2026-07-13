# WBXC

Plataforma de propostas patrimoniais premium para consórcios.

## O que já está pronto nesta versão

- Estrutura do projeto (Next.js 15 + App Router + TypeScript + Tailwind)
- Tokens de tema aplicados no Tailwind (cores, fonte Inter)
- Clientes Supabase (browser + servidor) e middleware de sessão
- Componentes base: `Button`, `Card`, `Metric` (com count-up)
- Página pública `/p/[slug]` já consultando o Supabase de verdade
- Logo real da marca em `public/logo-xc.svg`
- **Motor de cálculo do consórcio** (`lib/calculations/`), replicando as fórmulas da planilha real do consultor — ver seção própria abaixo

## Motor de cálculo (`lib/calculations/`)

Extraí as fórmulas reais da planilha `Proposta_direcionada_com_Investimento` (abrindo o `.xlsm` e lendo as fórmulas de cada célula, não só os valores) e portei para TypeScript:

- `bid-tables.ts` — as tabelas de referência de lance (Lance Fixo, Limitado, Fidelidade 6/12/18 meses) por faixa de prazo. Esses números **não são calculados**, são parâmetros que a administradora define — por isso ficam isolados como dados de configuração, fáceis de atualizar quando ela revisar as regras.
- `consorcio.ts` — as funções de cálculo: reajuste do crédito pelo INCC/INPC (composto a cada 12 meses), parcela cheia/meia, cálculo de cada modalidade de lance (crédito líquido, valor embutido, parcela pós-contemplação, prazo restante), e os 3 cenários de investimento (venda da carta, locação, aplicação do crédito).

**Validado contra o exemplo real da planilha** (crédito R$150.000, prazo 180 meses, contemplação simulada no mês 25): os valores batem exatamente para reajuste de crédito, parcela, e para a modalidade Lance Fidelidade 18 meses (crédito líquido, valor embutido e prazo restante idênticos).

**Uma simplificação assumida, de propósito:** o "valor já investido até a contemplação" usa parcela fixa × meses decorridos — a mesma aproximação que a própria planilha usa como fallback (célula D55) quando não tem a tabela auxiliar mês a mês carregada. Isso gera uma diferença pequena (~2,7%) nesse número específico e nos que dependem dele (parcela pós-contemplação). Se quiser fidelidade de centavo nesse ponto, o próximo passo é portar a aba auxiliar "Aplic Pós Cont_Dados" também — hoje não portei por ser uma tabela de ~230 linhas específica desse cenário, e a diferença é pequena o suficiente para uso comercial (é uma simulação, não uma promessa de contemplação — como a própria planilha já avisa ao cliente final).

## O que falta (próximas entregas)

- Login e dashboard interno
- CRUD de clientes e propostas
- Formulário de nova proposta
- Componentes: Timeline, Chart, Sidebar, Navbar, Modal, Drawer, CurrencyInput, DatePicker, Toast, Avatar, KPI
- Exportação em PDF
- Analytics

## Como rodar localmente

```bash
npm install
cp .env.example .env.local
# preencha .env.local com as chaves do seu projeto Supabase
npm run dev
```

## Banco de dados

1. Crie um projeto em [supabase.com](https://supabase.com)
2. Abra o **SQL Editor** do projeto e rode o conteúdo de `supabase-schema.sql`
3. Copie a **Project URL** e a **anon key** (Settings → API) para o `.env.local`

## Subir no GitHub

```bash
git init
git add .
git commit -m "scaffold inicial do WBXC"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/wbxc.git
git push -u origin main
```

## Deploy na Vercel

1. Acesse [vercel.com/new](https://vercel.com/new) e importe o repositório
2. A Vercel detecta Next.js automaticamente — não precisa mudar build command
3. Em **Environment Variables**, adicione as mesmas três chaves do `.env.local`
4. Deploy. Pronto — `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` são as únicas obrigatórias para o app subir; `SUPABASE_SERVICE_ROLE_KEY` só é necessária quando implementarmos analytics/PDF (rotas server-side privilegiadas)
