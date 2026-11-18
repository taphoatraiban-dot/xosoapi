begin;
create schema if not exists analysis_private;
revoke all on schema analysis_private from public,anon,authenticated;
create table public.analysis_forecasts (
 id uuid primary key default gen_random_uuid(), user_id uuid not null default auth.uid() references auth.users(id),
 target_date date not null, region text not null check(region in ('MN','MT','MB')), station text not null check(station ~ '^[a-z]{2,30}$'),
 scope text not null check(scope in ('DDA','DDD','XCA','XCD','B2','B3','B4')),
 method text not null check(method in ('recent','frequency','weekday')), number text not null check(number ~ '^[0-9]{2,4}$'),
 version text not null default 'verified-v1' check(version='verified-v1'), snapshot jsonb not null check(jsonb_typeof(snapshot)='object' and octet_length(snapshot::text)<=30000),
 created_at timestamptz not null default clock_timestamp(), data_hash text not null check(data_hash ~ '^[a-f0-9]{64}$'),
 unique(user_id,target_date,region,station,scope),
 check(length(number)=case when scope in ('DDA','DDD','B2') then 2 when scope in ('XCA','XCD','B3') then 3 else 4 end)
);
create index analysis_forecasts_target on public.analysis_forecasts(target_date,region);
alter table public.analysis_forecasts enable row level security;
revoke all on public.analysis_forecasts from anon,authenticated;
grant select on public.analysis_forecasts to authenticated;
grant insert(target_date,region,station,scope,method,number,snapshot,data_hash) on public.analysis_forecasts to authenticated;
create policy analysis_forecasts_own_read on public.analysis_forecasts for select to authenticated using(user_id=(select auth.uid()));
create policy analysis_forecasts_own_insert on public.analysis_forecasts for insert to authenticated with check(user_id=(select auth.uid()) and (public.member_access_status()->>'allowed')::boolean);
create function analysis_private.forecast_guard() returns trigger language plpgsql set search_path='' as $$
declare deadline timestamptz; localday date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
 if tg_op<>'INSERT' then raise exception 'Forecasts are immutable'; end if;
 new.created_at:=clock_timestamp(); new.user_id:=auth.uid();
 if new.user_id is null then raise exception 'Authentication required'; end if;
 deadline:=(new.target_date+case new.region when 'MN' then time '16:00' when 'MT' then time '17:00' else time '18:00' end) at time zone 'Asia/Ho_Chi_Minh';
 if new.target_date<localday or new.target_date>localday+7 or new.created_at>=deadline then raise exception 'Outside pre-draw recording window'; end if;
 if exists(select 1 from public.lottery_results where region=new.region and draw_date=new.target_date) then raise exception 'Target-day result already exists'; end if;
 if (new.snapshot->>'trained_before') is distinct from new.target_date::text then raise exception 'Training cutoff mismatch'; end if;
 return new;
end $$;
create trigger forecast_immutable before insert or update or delete on public.analysis_forecasts for each row execute function analysis_private.forecast_guard();
create table public.analysis_forecast_outcomes (
 forecast_id uuid primary key references public.analysis_forecasts(id), user_id uuid not null references auth.users(id),
 status text not null check(status in ('matched','missed','missing','suspect')), actual_numbers jsonb not null default '[]',
 checked_at timestamptz not null default clock_timestamp(), result_hash text
);
alter table public.analysis_forecast_outcomes enable row level security;
revoke all on public.analysis_forecast_outcomes from anon,authenticated;
grant select on public.analysis_forecast_outcomes to authenticated;
create policy analysis_outcomes_own_read on public.analysis_forecast_outcomes for select to authenticated using(user_id=(select auth.uid()));
create function analysis_private.canon(s text) returns text language sql immutable set search_path='' as $$
 select case k when 'tphcm' then 'hochiminh' when 'tphochiminh' then 'hochiminh' when 'thuathienhue' then 'hue' when 'daclak' then 'daklak' when 'daclac' then 'daklak' when 'daklac' then 'daklak' when 'dacnong' then 'daknong' when 'dalat' then 'lamdong' when 'mienbac' then 'mienbac' else k end
 from (select regexp_replace(lower(translate(regexp_replace(normalize(coalesce(s,''),NFD),U&'[\0300-\036f]','','g'),'đĐ','dD')),'[^a-z0-9]','','g') k) q;
$$;
create function analysis_private.boards(j jsonb, inherited text default '', depth integer default 0) returns table(station text, prizes jsonb) language plpgsql immutable set search_path='' as $$
declare v jsonb; k text; name text; normal jsonb; x record;
begin
 if depth>18 or j is null then return; end if;
 if jsonb_typeof(j)='string' then begin return query select * from analysis_private.boards((j#>>'{}')::jsonb,inherited,depth+1); exception when invalid_text_representation then return; end; return; end if;
 if jsonb_typeof(j)='array' then for v in select value from jsonb_array_elements(j) loop return query select * from analysis_private.boards(v,inherited,depth+1); end loop; return; end if;
 if jsonb_typeof(j)<>'object' then return; end if;
 name:=coalesce(j->>'province',j->>'station',j->>'tinh',j->>'name',inherited);
 if jsonb_typeof(j->'prizes')='object' then
 normal:='{}';for x in select * from jsonb_each(j->'prizes') loop k:=analysis_private.canon(x.key);if k in ('special','dacbiet','giaidacbiet') then k:='db';end if;
 if k in ('db','g1','g2','g3','g4','g5','g6','g7','g8') then
 if normal ? k then return; end if;
 normal:=normal||jsonb_build_object(k,case when jsonb_typeof(x.value)='array' then x.value else jsonb_build_array(x.value) end);
 end if;end loop;
 station:=analysis_private.canon(name);prizes:=normal;return next;return;
 end if;
 for k,v in select * from jsonb_each(j) loop if k not in ('meta','metadata','info') then return query select * from analysis_private.boards(v,name,depth+1);end if;end loop;
end $$;
create function analysis_private.valid(p jsonb,r text) returns boolean language plpgsql immutable set search_path='' as $$
declare cs integer[]; ws integer[]; ks text[]; i integer; n text;
begin
 ks:=array['db','g1','g2','g3','g4','g5','g6','g7'];
 if r='MB' then cs:=array[1,1,2,6,4,6,3,4];ws:=array[5,5,5,5,4,4,3,2];else ks:=array_append(ks,'g8');cs:=array[1,1,1,2,7,1,3,1,1];ws:=array[6,5,5,5,5,4,4,3,2];end if;
 for i in 1..array_length(ks,1) loop
 if jsonb_typeof(p->ks[i]) is distinct from 'array' or jsonb_array_length(p->ks[i])<>cs[i] then return false;end if;
 for n in select value from jsonb_array_elements_text(p->ks[i]) loop if n is null or n !~ '^[0-9]+$' or length(n)<>ws[i] then return false;end if;end loop;
 end loop;return true;
end $$;
create materialized view analysis_private.valid_boards as
 select l.region,l.draw_date,case when l.region='MB' then 'mienbac' else b.station end station,b.prizes,
 (select jsonb_object_agg(k,(select jsonb_agg(v order by v) from jsonb_array_elements_text(vals) v)) from jsonb_each(b.prizes) e(k,vals)) signature
 from public.lottery_results l cross join lateral analysis_private.boards(l.data) b
 where l.region in ('MN','MT','MB') and analysis_private.valid(b.prizes,l.region);
create index analysis_boards_lookup on analysis_private.valid_boards(region,draw_date,station);
create function analysis_private.numbers(p jsonb,r text,s text) returns jsonb language sql immutable set search_path='' as $$
 select coalesce(jsonb_agg(distinct right(n,d)),'[]') from
 (select case when s in ('DDA','DDD','B2') then 2 when s in ('XCA','XCD','B3') then 3 else 4 end d) widths
 cross join lateral jsonb_each(p) e(k,vals) cross join lateral jsonb_array_elements_text(vals) a(n)
 where length(n)>=d and (s like 'B%' or (s in ('DDD','XCD') and k='db') or (s='DDA' and k=case when r='MB' then 'g7' else 'g8' end) or (s='XCA' and k=case when r='MB' then 'g6' else 'g7' end));
$$;
create function analysis_private.score_forecasts() returns integer language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 refresh materialized view analysis_private.valid_boards;
 insert into public.analysis_forecast_outcomes(forecast_id,user_id,status,actual_numbers,checked_at,result_hash)
 select f.id,f.user_id,case when b.total=0 then 'missing' when b.conflicts>1 or b.repeated then 'suspect' when analysis_private.numbers(b.prizes,f.region,f.scope) ? f.number then 'matched' else 'missed' end,
 case when b.total=0 or b.conflicts>1 or b.repeated then '[]'::jsonb else analysis_private.numbers(b.prizes,f.region,f.scope) end,clock_timestamp(),md5(b.prizes::text)
 from public.analysis_forecasts f left join lateral (
 select count(*) total,count(distinct v.signature) conflicts,(jsonb_agg(v.prizes)->0) prizes,
 coalesce(bool_or(exists(select 1 from analysis_private.valid_boards old where old.region=v.region and old.station=v.station and old.draw_date<>v.draw_date and old.signature=v.signature)),false) repeated
 from analysis_private.valid_boards v where v.region=f.region and v.draw_date=f.target_date and v.station=f.station
 ) b on true
 where f.target_date<=(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date
 on conflict(forecast_id) do update set status=excluded.status,actual_numbers=excluded.actual_numbers,checked_at=excluded.checked_at,result_hash=excluded.result_hash;
 get diagnostics n=row_count;return n;
end $$;
revoke all on all functions in schema analysis_private from public,anon,authenticated;
select cron.schedule('analysis_forecast_scoring','*/10 * * * *','select analysis_private.score_forecasts()');
comment on table public.analysis_forecasts is 'Immutable client-submitted analytical references, server timestamped before conservative deadlines; no wager or payout. Snapshot/hash is not proof of correct client computation.';
commit;
