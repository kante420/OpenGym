-- 1. Añadir la columna color_theme en la tabla gyms
alter table public.gyms add column if not exists color_theme text default 'gold';

-- 2. Conceder permiso de actualización sobre la columna color_theme a authenticated (administrador)
grant update (color_theme) on public.gyms to authenticated;

-- 3. Actualizar la función get_gym_public para devolver el color_theme
drop function if exists public.get_gym_public(text);
create function public.get_gym_public(p_subdomain text)
returns table (id uuid, name text, subdomain text, status text, logo_version bigint, color_theme text)
language sql stable security definer set search_path = '' as $$
  select g.id, g.name, g.subdomain, g.status, extract(epoch from g.logo_updated_at)::bigint, coalesce(g.color_theme, 'gold')
  from public.gyms g where g.subdomain = lower(p_subdomain) limit 1
$$;
grant execute on function public.get_gym_public(text) to anon, authenticated;
