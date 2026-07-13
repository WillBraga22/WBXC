-- =====================================================================
-- WBXC — Schema Supabase (Postgres)
-- Convenções: UUID como PK, timestamps com timezone, updated_at via
-- trigger, RLS habilitada em todas as tabelas de dado de usuário.
-- =====================================================================

create extension if not exists "pgcrypto";
create extension if not exists pg_trgm;

-- ---------------------------------------------------------------------
-- FUNÇÃO utilitária: atualizar updated_at automaticamente
-- ---------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- ---------------------------------------------------------------------
-- FUNÇÃO utilitária: gerar slug curto único para propostas públicas
-- ---------------------------------------------------------------------
create or replace function public.generate_proposal_slug()
returns text as $$
declare
  chars text := 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  result text := '';
  i integer;
begin
  for i in 1..8 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$ language plpgsql;

-- =====================================================================
-- USERS (consultores) — espelha auth.users do Supabase Auth
-- =====================================================================
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  phone text,
  company_name text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_users_updated_at
  before update on public.users
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Cria automaticamente a linha em public.users quando alguém se autentica
-- pela primeira vez (magic link, etc.) via Supabase Auth.
-- ---------------------------------------------------------------------
create or replace function public.handle_new_auth_user()
returns trigger as $$
begin
  insert into public.users (id, full_name, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.email), new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger trg_handle_new_auth_user
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

-- =====================================================================
-- CLIENTS (clientes finais do consultor)
-- =====================================================================
create table public.clients (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  document text, -- CPF/CNPJ
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_clients_user_id on public.clients(user_id);
create index idx_clients_full_name on public.clients using gin (full_name gin_trgm_ops);

create trigger trg_clients_updated_at
  before update on public.clients
  for each row execute function public.set_updated_at();

-- =====================================================================
-- PROPOSALS (proposta patrimonial)
-- =====================================================================
create table public.proposals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  client_id uuid not null references public.clients(id) on delete cascade,
  slug text not null unique default public.generate_proposal_slug(),

  title text not null,
  objective text,                     -- ex: "aposentadoria", "imóvel", "veículo"

  credit_value numeric(14,2) not null,
  term_months integer not null,
  installment_value numeric(14,2) not null,
  bid_value numeric(14,2),            -- lance
  expected_profitability numeric(6,3),-- rentabilidade esperada (%)
  expected_profit numeric(14,2),      -- lucro esperado
  expected_savings numeric(14,2),     -- economia estimada

  -- Campos do cenário "transforme seu consórcio em investimento"
  readjustment_index_rate numeric(6,4),     -- reajuste INCC/INPC estimado
  quota_resale_percent numeric(6,4),        -- % de venda da carta contemplada
  property_rental_percent numeric(6,4),     -- % de locação do imóvel/bem
  reinvestment_yield_percent numeric(6,4),  -- % de rendimento da aplicação do crédito

  observations text,

  status text not null default 'draft'
    check (status in ('draft', 'published', 'archived')),

  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_proposals_user_id on public.proposals(user_id);
create index idx_proposals_client_id on public.proposals(client_id);
create index idx_proposals_slug on public.proposals(slug);
create index idx_proposals_status on public.proposals(status);

create trigger trg_proposals_updated_at
  before update on public.proposals
  for each row execute function public.set_updated_at();

-- =====================================================================
-- STRATEGY (bloco de estratégia dentro da proposta)
-- =====================================================================
create table public.strategy (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null default 0,
  icon text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_strategy_proposal_id on public.strategy(proposal_id);

create trigger trg_strategy_updated_at
  before update on public.strategy
  for each row execute function public.set_updated_at();

-- =====================================================================
-- TIMELINE (linha do tempo / próximos passos da proposta)
-- =====================================================================
create table public.timeline (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  label text not null,
  description text,
  month_offset integer not null,     -- mês relativo ao início (0, 1, 2...)
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_timeline_proposal_id on public.timeline(proposal_id);

create trigger trg_timeline_updated_at
  before update on public.timeline
  for each row execute function public.set_updated_at();

-- =====================================================================
-- BID_MODALITIES (modalidades de lance do consórcio: Sorteio, Lance Fixo,
-- Lance Limitado, Lance Fidelidade N meses, Lance Livre etc.)
-- Reflete o modelo real de cálculo usado hoje na planilha do consultor.
-- =====================================================================
create table public.bid_modalities (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,

  name text not null,                       -- ex: "Lance Fidelidade 18 meses"
  term_months_for_bid integer,              -- prazo usado no cálculo do lance
  net_credit numeric(14,2),                 -- crédito líquido liberado
  own_cash_bid numeric(14,2) default 0,     -- lance em dinheiro próprio
  embedded_bid_percent numeric(6,4),        -- % de lance embutido
  embedded_bid_value numeric(14,2),         -- valor do lance embutido
  installment_after_award numeric(14,2),    -- parcela pós-contemplação
  remaining_term_months integer,            -- prazo restante após contemplação
  fidelity_months integer,                  -- meses de fidelidade exigidos (0 se não houver)

  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_bid_modalities_proposal_id on public.bid_modalities(proposal_id);

create trigger trg_bid_modalities_updated_at
  before update on public.bid_modalities
  for each row execute function public.set_updated_at();

-- =====================================================================
-- COMPARISON (comparativos, ex: consórcio vs. financiamento)
-- =====================================================================
create table public.comparison (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  label text not null,                -- ex: "Financiamento Bancário"
  total_cost numeric(14,2),
  total_interest numeric(14,2),
  term_months integer,
  order_index integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_comparison_proposal_id on public.comparison(proposal_id);

create trigger trg_comparison_updated_at
  before update on public.comparison
  for each row execute function public.set_updated_at();

-- =====================================================================
-- ANALYTICS (eventos de visualização da proposta pública)
-- =====================================================================
create table public.analytics (
  id uuid primary key default gen_random_uuid(),
  proposal_id uuid not null references public.proposals(id) on delete cascade,
  event_type text not null
    check (event_type in ('view', 'cta_click', 'pdf_export', 'share')),
  visitor_ip text,
  user_agent text,
  referrer text,
  created_at timestamptz not null default now()
);

create index idx_analytics_proposal_id on public.analytics(proposal_id);
create index idx_analytics_event_type on public.analytics(event_type);
create index idx_analytics_created_at on public.analytics(created_at);

-- =====================================================================
-- SETTINGS (configurações por consultor: marca, cores, whatsapp, etc.)
-- =====================================================================
create table public.settings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.users(id) on delete cascade,
  brand_name text,
  brand_logo_url text,
  primary_color text default '#C9A227',
  whatsapp_number text,
  default_cta_text text default 'Falar com o consultor',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger trg_settings_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- =====================================================================
-- FILES (anexos: logos, documentos, imagens usadas na proposta)
-- =====================================================================
create table public.files (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  proposal_id uuid references public.proposals(id) on delete cascade,
  storage_path text not null,          -- caminho no Supabase Storage
  file_name text not null,
  file_type text,
  file_size_bytes bigint,
  created_at timestamptz not null default now()
);

create index idx_files_user_id on public.files(user_id);
create index idx_files_proposal_id on public.files(proposal_id);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.users enable row level security;
alter table public.clients enable row level security;
alter table public.proposals enable row level security;
alter table public.strategy enable row level security;
alter table public.timeline enable row level security;
alter table public.bid_modalities enable row level security;
alter table public.comparison enable row level security;
alter table public.analytics enable row level security;
alter table public.settings enable row level security;
alter table public.files enable row level security;

-- USERS: cada consultor só vê/edita o próprio registro
create policy "users_select_own" on public.users
  for select using (auth.uid() = id);
create policy "users_update_own" on public.users
  for update using (auth.uid() = id);

-- CLIENTS: CRUD restrito ao dono
create policy "clients_all_own" on public.clients
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- PROPOSALS: CRUD restrito ao dono (a leitura pública do slug é feita
-- via uma função/rota específica com service role, não pela policy padrão)
create policy "proposals_all_own" on public.proposals
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- STRATEGY / TIMELINE / COMPARISON: acesso via proposta do dono
create policy "strategy_all_own" on public.strategy
  for all using (
    exists (select 1 from public.proposals p
            where p.id = strategy.proposal_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.proposals p
            where p.id = strategy.proposal_id and p.user_id = auth.uid())
  );

create policy "timeline_all_own" on public.timeline
  for all using (
    exists (select 1 from public.proposals p
            where p.id = timeline.proposal_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.proposals p
            where p.id = timeline.proposal_id and p.user_id = auth.uid())
  );

create policy "bid_modalities_all_own" on public.bid_modalities
  for all using (
    exists (select 1 from public.proposals p
            where p.id = bid_modalities.proposal_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.proposals p
            where p.id = bid_modalities.proposal_id and p.user_id = auth.uid())
  );

create policy "comparison_all_own" on public.comparison
  for all using (
    exists (select 1 from public.proposals p
            where p.id = comparison.proposal_id and p.user_id = auth.uid())
  ) with check (
    exists (select 1 from public.proposals p
            where p.id = comparison.proposal_id and p.user_id = auth.uid())
  );

-- ANALYTICS: consultor só lê eventos das próprias propostas;
-- inserção de eventos (view/click) é feita por rota server-side com service role
create policy "analytics_select_own" on public.analytics
  for select using (
    exists (select 1 from public.proposals p
            where p.id = analytics.proposal_id and p.user_id = auth.uid())
  );

-- SETTINGS: um registro por consultor
create policy "settings_all_own" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- FILES: restrito ao dono
create policy "files_all_own" on public.files
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

