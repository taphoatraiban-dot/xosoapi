CREATE OR REPLACE FUNCTION public.member_access_status()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m public.ott_memberships%rowtype; t timestamptz := now(); until_at timestamptz;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 if exists(select 1 from public.admin_users a where a.user_id=auth.uid()) then
  return jsonb_build_object('allowed',true,'is_admin',true,'can_trial',false,'expires_at',null);
 end if;
 select * into m from public.ott_memberships where user_id=auth.uid();
 until_at := greatest(coalesce(m.trial_ends_at,'-infinity'::timestamptz),coalesce(m.paid_until,'-infinity'::timestamptz));
 return jsonb_build_object('is_admin',false,'allowed',until_at>t,'can_trial',m.user_id is null or m.trial_started_at is null,'expires_at',case when until_at='-infinity'::timestamptz then null else until_at end);
end $function$
;

CREATE OR REPLACE FUNCTION public.member_start_trial()
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare m public.ott_memberships%rowtype;
begin
 if auth.uid() is null then raise exception 'Not authenticated'; end if;
 if exists(select 1 from public.admin_users a where a.user_id=auth.uid()) then return public.member_access_status(); end if;
 insert into public.ott_memberships(user_id,trial_started_at,trial_ends_at) values(auth.uid(),now(),now()+interval '7 days') on conflict(user_id) do nothing;
 update public.ott_memberships set trial_started_at=now(),trial_ends_at=now()+interval '7 days' where user_id=auth.uid() and trial_started_at is null;
 select * into m from public.ott_memberships where user_id=auth.uid();
 return public.member_access_status();
end $function$
;

CREATE OR REPLACE FUNCTION public.ott_admin_review(p_order_id bigint, p_approve boolean)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_order public.ott_orders%ROWTYPE;
    v_until timestamptz;
BEGIN
    IF auth.uid() IS NULL
       OR NOT EXISTS (
           SELECT 1
           FROM public.admin_users a
           WHERE a.user_id = auth.uid()
       )
    THEN
        RAISE EXCEPTION 'Admin only';
    END IF;

    SELECT *
    INTO v_order
    FROM public.ott_orders
    WHERE id = p_order_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Order not found';
    END IF;

    IF v_order.status <> 'pending' THEN
        RAISE EXCEPTION 'Order already processed';
    END IF;

    IF p_approve AND EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=v_order.user_id) THEN
        RAISE EXCEPTION 'Không gia hạn tài khoản Admin.' USING ERRCODE='42501';
    END IF;

    IF p_approve THEN

        IF v_order.amount_vnd <> 49000
           OR v_order.duration_days <> 30
        THEN
            RAISE EXCEPTION 'Invalid package';
        END IF;

        -- Cong don 30 ngay neu con han.
        INSERT INTO public.ott_memberships (
            user_id,
            paid_until
        )
        VALUES (
            v_order.user_id,
            now() + interval '30 days'
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
            paid_until =
                GREATEST(
                    now(),
                    COALESCE(
                        public.ott_memberships.paid_until,
                        now()
                    )
                ) + interval '30 days'
        RETURNING paid_until INTO v_until;

        -- Dong bo voi bang thanh vien cu.
        -- Bang nay da duoc su dung trong he thong.
        INSERT INTO public.member_entitlements (
            user_id,
            paid_until
        )
        VALUES (
            v_order.user_id,
            v_until
        )
        ON CONFLICT (user_id)
        DO UPDATE SET
            paid_until = GREATEST(
                COALESCE(
                    public.member_entitlements.paid_until,
                    '-infinity'::timestamptz
                ),
                EXCLUDED.paid_until
            );

        UPDATE public.ott_orders
        SET
            status = 'approved',
            approved_at = now()
        WHERE id = p_order_id;

    ELSE

        UPDATE public.ott_orders
        SET status = 'rejected'
        WHERE id = p_order_id;

    END IF;

    RETURN jsonb_build_object(
        'order_id', p_order_id,
        'status',
            CASE
                WHEN p_approve THEN 'approved'
                ELSE 'rejected'
            END,
        'expires_at', v_until
    );
END;
$function$
;

CREATE OR REPLACE FUNCTION public.ott_create_order()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE
    v_user uuid;
    v_id bigint;
BEGIN
    v_user := auth.uid();

    IF v_user IS NULL THEN
        RAISE EXCEPTION 'Login required';
    END IF;

    IF EXISTS (SELECT 1 FROM public.admin_users a WHERE a.user_id=v_user) THEN
        RAISE EXCEPTION 'Tài khoản Admin không cần mua hoặc gia hạn thành viên.' USING ERRCODE='42501';
    END IF;

    -- Tra lai don dang cho neu da co.
    SELECT o.id INTO v_id
    FROM public.ott_orders o
    WHERE o.user_id = v_user
      AND o.status = 'pending'
    ORDER BY o.created_at DESC
    LIMIT 1;

    IF v_id IS NOT NULL THEN
        RETURN v_id;
    END IF;

    INSERT INTO public.ott_orders (
        user_id, amount_vnd, duration_days, status
    )
    VALUES (
        v_user, 49000, 30, 'pending'
    )
    RETURNING id INTO v_id;

    RETURN v_id;
END;
$function$
;