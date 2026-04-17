-- ============================================================
-- AIOS — Agency OS for Claude Code
-- Initial Schema Migration
-- ============================================================

-- Enable required extensions
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ============================================================
-- PROFILES
-- ============================================================
create table public.profiles (
  id          uuid references auth.users on delete cascade primary key,
  email       text not null,
  full_name   text,
  avatar_url  text,
  plan        text not null default 'free'
                check (plan in ('free', 'solo', 'agency')),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  subscription_status     text,
  api_quota_used          integer not null default 0,
  api_quota_limit         integer not null default 50,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ============================================================
-- ORGANIZATIONS (Agency tier)
-- ============================================================
create table public.organizations (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  slug         text not null unique,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  plan         text not null default 'agency' check (plan in ('agency')),
  stripe_customer_id      text unique,
  stripe_subscription_id  text unique,
  subscription_status     text,
  member_limit integer not null default 5,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.organizations enable row level security;

-- ============================================================
-- ORG MEMBERS
-- ============================================================
create table public.org_members (
  id         uuid primary key default gen_random_uuid(),
  org_id     uuid not null references public.organizations(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member'
               check (role in ('owner', 'admin', 'member')),
  created_at timestamptz not null default now(),
  unique (org_id, user_id)
);

alter table public.org_members enable row level security;

create policy "Org members can view their org"
  on public.organizations for select
  using (
    auth.uid() = owner_id
    or exists (
      select 1 from public.org_members
      where org_id = organizations.id and user_id = auth.uid()
    )
  );

create policy "Owners can manage their org"
  on public.organizations for all
  using (auth.uid() = owner_id);

create policy "Org members can view membership"
  on public.org_members for select
  using (
    user_id = auth.uid()
    or exists (
      select 1 from public.organizations
      where id = org_members.org_id and owner_id = auth.uid()
    )
  );

-- ============================================================
-- PROJECTS
-- ============================================================
create table public.projects (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  owner_id    uuid references public.profiles(id) on delete cascade,
  org_id      uuid references public.organizations(id) on delete cascade,
  status      text not null default 'active'
                check (status in ('active', 'paused', 'archived')),
  config      jsonb not null default '{}',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  -- Either personal or org project
  constraint projects_owner_check check (
    (owner_id is not null and org_id is null)
    or (owner_id is null and org_id is not null)
  )
);

alter table public.projects enable row level security;

create policy "Personal project owners can manage"
  on public.projects for all
  using (auth.uid() = owner_id);

create policy "Org members can view org projects"
  on public.projects for select
  using (
    org_id is not null
    and exists (
      select 1 from public.org_members
      where org_id = projects.org_id and user_id = auth.uid()
    )
  );

create policy "Org admins+ can manage org projects"
  on public.projects for all
  using (
    org_id is not null
    and exists (
      select 1 from public.org_members
      where org_id = projects.org_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- AGENTS
-- ============================================================
create table public.agents (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  name          text not null,
  description   text,
  model         text not null default 'claude-sonnet-4-6',
  system_prompt text,
  tools         jsonb not null default '[]',
  config        jsonb not null default '{}',
  status        text not null default 'active'
                  check (status in ('active', 'inactive')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

alter table public.agents enable row level security;

create policy "Project members can access agents"
  on public.agents for all
  using (
    exists (
      select 1 from public.projects p
      where p.id = agents.project_id
        and (
          p.owner_id = auth.uid()
          or exists (
            select 1 from public.org_members om
            where om.org_id = p.org_id and om.user_id = auth.uid()
          )
        )
    )
  );

-- ============================================================
-- SESSIONS
-- ============================================================
create table public.sessions (
  id            uuid primary key default gen_random_uuid(),
  project_id    uuid not null references public.projects(id) on delete cascade,
  agent_id      uuid references public.agents(id),
  user_id       uuid not null references public.profiles(id),
  status        text not null default 'running'
                  check (status in ('running', 'completed', 'failed', 'cancelled')),
  input_tokens  integer not null default 0,
  output_tokens integer not null default 0,
  cost_usd      numeric(12, 6) not null default 0,
  metadata      jsonb not null default '{}',
  started_at    timestamptz not null default now(),
  ended_at      timestamptz,
  created_at    timestamptz not null default now()
);

alter table public.sessions enable row level security;

create policy "Users can access their own sessions"
  on public.sessions for all
  using (auth.uid() = user_id);

create policy "Org members can view org sessions"
  on public.sessions for select
  using (
    exists (
      select 1 from public.projects p
      join public.org_members om on om.org_id = p.org_id
      where p.id = sessions.project_id and om.user_id = auth.uid()
    )
  );

-- ============================================================
-- API KEYS
-- ============================================================
create table public.api_keys (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid references public.profiles(id) on delete cascade,
  org_id       uuid references public.organizations(id) on delete cascade,
  name         text not null,
  key_hash     text not null unique,
  key_prefix   text not null,
  last_used_at timestamptz,
  expires_at   timestamptz,
  permissions  jsonb not null default '["read", "write"]',
  created_at   timestamptz not null default now(),
  constraint api_keys_owner_check check (
    (owner_id is not null and org_id is null)
    or (owner_id is null and org_id is not null)
  )
);

alter table public.api_keys enable row level security;

create policy "Owners can manage their api keys"
  on public.api_keys for all
  using (auth.uid() = owner_id);

create policy "Org admins can manage org api keys"
  on public.api_keys for all
  using (
    org_id is not null
    and exists (
      select 1 from public.org_members
      where org_id = api_keys.org_id
        and user_id = auth.uid()
        and role in ('owner', 'admin')
    )
  );

-- ============================================================
-- INDEXES
-- ============================================================
create index idx_profiles_stripe_customer on public.profiles(stripe_customer_id);
create index idx_projects_owner on public.projects(owner_id);
create index idx_projects_org on public.projects(org_id);
create index idx_agents_project on public.agents(project_id);
create index idx_sessions_project on public.sessions(project_id);
create index idx_sessions_user on public.sessions(user_id);
create index idx_sessions_status on public.sessions(status);
create index idx_api_keys_hash on public.api_keys(key_hash);

-- ============================================================
-- UPDATED_AT TRIGGER
-- ============================================================
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.update_updated_at();

create trigger set_organizations_updated_at
  before update on public.organizations
  for each row execute procedure public.update_updated_at();

create trigger set_projects_updated_at
  before update on public.projects
  for each row execute procedure public.update_updated_at();

create trigger set_agents_updated_at
  before update on public.agents
  for each row execute procedure public.update_updated_at();
