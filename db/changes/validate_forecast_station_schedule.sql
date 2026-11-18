create or replace function analysis_private.forecast_guard() returns trigger language plpgsql set search_path='' as $$
declare schedules jsonb := '{"MN":[["tiengiang","kiengiang","lamdong"],["hochiminh","dongthap","camau"],["bentre","vungtau","baclieu"],["dongnai","cantho","soctrang"],["tayninh","angiang","binhthuan"],["vinhlong","binhduong","travinh"],["hochiminh","longan","binhphuoc","haugiang"]],"MT":[["khanhhoa","kontum","hue"],["phuyen","hue"],["daklak","quangnam"],["danang","khanhhoa"],["binhdinh","quangtri","quangbinh"],["gialai","ninhthuan"],["danang","quangngai","daknong"]],"MB":[["mienbac"],["mienbac"],["mienbac"],["mienbac"],["mienbac"],["mienbac"],["mienbac"]]}'::jsonb; deadline timestamptz; localday date := (clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date;
begin
 if tg_op<>'INSERT' then raise exception 'Forecasts are immutable'; end if;
 if not exists(select 1 from jsonb_array_elements_text(schedules->new.region->extract(dow from new.target_date)::integer) v where v.value=new.station) then raise exception 'Station not scheduled on target date'; end if;
 new.created_at:=clock_timestamp(); new.user_id:=auth.uid();
 if new.user_id is null then raise exception 'Authentication required'; end if;
 deadline:=(new.target_date+case new.region when 'MN' then time '16:00' when 'MT' then time '17:00' else time '18:00' end) at time zone 'Asia/Ho_Chi_Minh';
 if new.target_date<localday or new.target_date>localday+7 or new.created_at>=deadline then raise exception 'Outside pre-draw recording window'; end if;
 if exists(select 1 from public.lottery_results where region=new.region and draw_date=new.target_date) then raise exception 'Target-day result already exists'; end if;
 if (new.snapshot->>'trained_before') is distinct from new.target_date::text then raise exception 'Training cutoff mismatch'; end if;
 return new;
end $$;
