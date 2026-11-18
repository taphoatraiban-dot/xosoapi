-- Run as migration owner; all test records are rolled back.
begin;
select set_config('request.jwt.claim.sub',(select user_id::text from public.admin_users limit 1),true);
set local role authenticated;
do $$
declare fid uuid; actor text:=auth.uid()::text; rejected boolean:=false; d date:=(clock_timestamp() at time zone 'Asia/Ho_Chi_Minh')::date+1;
begin
 insert into public.analysis_forecasts(target_date,region,station,scope,method,number,snapshot,data_hash)
 values(d,'MB','mienbac','XCD','recent','007',jsonb_build_object('trained_before',d::text),repeat('a',64)) returning id into fid;
 begin update public.analysis_forecasts set number='008' where id=fid;exception when insufficient_privilege then rejected:=true;end;
 if not rejected then raise exception 'Forecast mutation was allowed';end if;
 perform set_config('request.jwt.claim.sub','00000000-0000-0000-0000-000000000000',true);
 if exists(select 1 from public.analysis_forecasts where id=fid) then raise exception 'Owner isolation failed';end if;
 perform set_config('request.jwt.claim.sub',actor,true);rejected:=false;
 begin insert into public.analysis_forecasts(target_date,region,station,scope,method,number,snapshot,data_hash)
 values(d-2,'MB','mienbac','XCD','recent','007',jsonb_build_object('trained_before',(d-2)::text),repeat('a',64));
 exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Past record was allowed';end if;
 rejected:=false;
 begin insert into public.analysis_forecasts(target_date,region,station,scope,method,number,snapshot,data_hash)
 values(d,'MB','invalidstation','XCD','recent','007',jsonb_build_object('trained_before',d::text),repeat('a',64));
 exception when raise_exception then rejected:=true;end;
 if not rejected then raise exception 'Unscheduled station was allowed';end if;
end $$;
rollback;
