create schema if not exists extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.mbp_workspaces (
  id uuid primary key default extensions.gen_random_uuid(),
  write_token_hash text not null,
  data jsonb not null default '{"v":1,"projects":{}}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.mbp_workspaces enable row level security;

revoke all on table public.mbp_workspaces from anon, authenticated;

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

grant execute on function public.mbp_create_workspace() to anon, authenticated;
grant execute on function public.mbp_load_workspace(uuid, text) to anon, authenticated;
grant execute on function public.mbp_save_workspace(uuid, text, jsonb) to anon, authenticated;
