-- RPC: get_pricing_divergences(days_back int)
-- Retorna divergências entre orçamento exibido e valor final da OS agrupadas por perfil
create or replace function get_pricing_divergences(days_back int default 30)
returns table(
  profile text,
  count int,
  avg_diff numeric,
  avg_shown numeric,
  avg_final numeric
) language sql as $$
  with src as (
    select
      so.id,
      so.final_cost::numeric as final,
      -- meta registrado nas mensagens do bot (orçamento mostrado)
      try_cast((bm.meta->>'shown_price') as numeric) as shown,
      coalesce(so.meta->>'segment','') as segment,
      coalesce(so.meta->>'stove_type','') as stove_type,
      coalesce(so.meta->>'burners','') as burners
    from service_orders so
    left join bot_messages bm on bm.session_id = so.session_id and bm.direction = 'out'
    where so.created_at >= now() - (days_back || ' days')::interval
  )
  select
    trim(both ' ' from concat_ws(' • ', nullif(stove_type,''), nullif(segment,''), nullif(burners,''))) as profile,
    count(*)::int as count,
    avg((final - shown)) as avg_diff,
    avg(shown) as avg_shown,
    avg(final) as avg_final
  from src
  where shown is not null and final is not null
  group by 1
  order by count desc, abs(avg((final - shown))) desc
$$;
