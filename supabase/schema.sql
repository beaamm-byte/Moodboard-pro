create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mbp_workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  write_token_hash text not null,
  data jsonb not null default '{"v":1,"projects":{}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.mbp_user_workspaces (
  user_id uuid primary key references auth.users(id) on delete cascade,
  workspace_id uuid not null references public.mbp_workspaces(id) on delete cascade,
  email text,
  accepted_sync_terms_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mbp_workspaces enable row level security;
alter table public.mbp_user_workspaces enable row level security;

revoke all on table public.mbp_workspaces from anon, authenticated;
revoke all on table public.mbp_user_workspaces from anon, authenticated;

create or replace function public.mbp_hash_token(token text)
returns text
language sql
immutable
as $$
  select encode(extensions.digest(token, 'sha256'), 'hex')
$$;

create or replace function public.mbp_create_workspace()
returns table(workspace_id uuid, write_token text)
language plpgsql
security definer
set search_path = public
as $$
declare
  token text := encode(extensions.gen_random_bytes(32), 'hex');
  new_id uuid;
begin
  insert into public.mbp_workspaces(write_token_hash)
  values (public.mbp_hash_token(token))
  returning id into new_id;

  return query select new_id, token;
end;
$$;

create or replace function public.mbp_load_workspace(
  p_workspace_id uuid,
  p_write_token text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  payload jsonb;
begin
  select data into payload
  from public.mbp_workspaces
  where id = p_workspace_id
    and write_token_hash = public.mbp_hash_token(p_write_token);

  if payload is null then
    raise exception 'Workspace not found or token invalid';
  end if;

  return payload;
end;
$$;

create or replace function public.mbp_save_workspace(
  p_workspace_id uuid,
  p_write_token text,
  p_data jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.mbp_workspaces
  set data = p_data,
      updated_at = now()
  where id = p_workspace_id
    and write_token_hash = public.mbp_hash_token(p_write_token);

  if not found then
    raise exception 'Workspace not found or token invalid';
  end if;

  return true;
end;
$$;

drop function if exists public.mbp_ensure_user_workspace(text, boolean);

create function public.mbp_ensure_user_workspace(
  p_email text default null,
  p_terms_accepted boolean default false
)
returns table(workspace_id uuid, created boolean)
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  existing_workspace_id uuid;
  new_workspace_id uuid;
  token text := encode(extensions.gen_random_bytes(32), 'hex');
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select workspace_id into existing_workspace_id
  from public.mbp_user_workspaces
  where user_id = current_user_id;

  if existing_workspace_id is not null then
    update public.mbp_user_workspaces
    set email = coalesce(nullif(p_email, ''), email),
        accepted_sync_terms_at = case
          when p_terms_accepted then coalesce(accepted_sync_terms_at, now())
          else accepted_sync_terms_at
        end,
        updated_at = now()
    where user_id = current_user_id;
    return query select existing_workspace_id, false;
    return;
  end if;

  if not p_terms_accepted then
    raise exception 'Sync terms must be accepted before creating an email workspace';
  end if;

  insert into public.mbp_workspaces(write_token_hash)
  values (public.mbp_hash_token(token))
  returning id into new_workspace_id;

  insert into public.mbp_user_workspaces(user_id, workspace_id, email, accepted_sync_terms_at)
  values (current_user_id, new_workspace_id, nullif(p_email, ''), now());

  return query select new_workspace_id, true;
end;
$$;

create or replace function public.mbp_load_user_workspace()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  payload jsonb;
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  select w.data into payload
  from public.mbp_user_workspaces uw
  join public.mbp_workspaces w on w.id = uw.workspace_id
  where uw.user_id = current_user_id;

  if payload is null then
    raise exception 'No workspace linked to this user';
  end if;

  return payload;
end;
$$;

create or replace function public.mbp_save_user_workspace(
  p_data jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
begin
  if current_user_id is null then
    raise exception 'Authentication required';
  end if;

  update public.mbp_workspaces w
  set data = p_data,
      updated_at = now()
  from public.mbp_user_workspaces uw
  where uw.workspace_id = w.id
    and uw.user_id = current_user_id;

  if not found then
    raise exception 'No workspace linked to this user';
  end if;

  update public.mbp_user_workspaces
  set updated_at = now()
  where user_id = current_user_id;

  return true;
end;
$$;

grant execute on function public.mbp_create_workspace() to anon, authenticated;
grant execute on function public.mbp_load_workspace(uuid, text) to anon, authenticated;
grant execute on function public.mbp_save_workspace(uuid, text, jsonb) to anon, authenticated;
grant execute on function public.mbp_ensure_user_workspace(text, boolean) to authenticated;
grant execute on function public.mbp_load_user_workspace() to authenticated;
grant execute on function public.mbp_save_user_workspace(jsonb) to authenticated;
