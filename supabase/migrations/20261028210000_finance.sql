-- =====================================================================
-- P9 — Finance.
--
-- School side (finance.view / finance.manage):
--   fee_items      what students owe for a year (all grades, or one grade level)
--   fee_payments   what was paid, by whom and how (online gateway: readiness only)
--   student_balances()  due / paid / balance per student (runs under RLS)
--   Students and parents read only their own fee items and payments (parent app).
-- Platform side (super admin only):
--   plans, school_subscriptions, platform_transactions (income / expense / commission)
--   subscribe_school()  creates the subscription, books the income and applies the plan's features
-- =====================================================================

create type public.payment_method as enum ('cash', 'bank_transfer', 'card', 'online');
create type public.billing_cycle as enum ('monthly', 'yearly');
create type public.transaction_kind as enum ('income', 'expense', 'commission');

-- ---------------------------------------------------------------------
-- School fees
-- ---------------------------------------------------------------------
create table public.fee_items (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools (id) on delete cascade,
  academic_year_id uuid not null,
  grade_level_id   uuid,
  name             text not null check (char_length(name) between 2 and 100),
  amount           numeric(10, 2) not null check (amount > 0),
  due_on           date,
  created_at       timestamptz not null default now(),
  constraint fee_items_year_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years (id, school_id) on delete no action deferrable initially deferred,
  constraint fee_items_grade_fkey
    foreign key (grade_level_id, school_id)
    references public.grade_levels (id, school_id) on delete no action deferrable initially deferred
);

create index fee_items_school_year_idx on public.fee_items (school_id, academic_year_id);
create index fee_items_year_idx on public.fee_items (academic_year_id, school_id);
create index fee_items_grade_idx on public.fee_items (grade_level_id, school_id);

create table public.fee_payments (
  id               uuid primary key default gen_random_uuid(),
  school_id        uuid not null references public.schools (id) on delete cascade,
  student_id       uuid not null,
  academic_year_id uuid not null,
  amount           numeric(10, 2) not null check (amount > 0),
  paid_on          date not null default current_date,
  method           public.payment_method not null default 'cash',
  reference        text check (char_length(reference) <= 100),
  note             text check (char_length(note) <= 300),
  received_by      uuid default auth.uid(),
  created_at       timestamptz not null default now(),
  foreign key (student_id, school_id) references public.profiles (id, school_id) on delete cascade,
  constraint fee_payments_year_fkey
    foreign key (academic_year_id, school_id)
    references public.academic_years (id, school_id) on delete no action deferrable initially deferred,
  foreign key (received_by, school_id) references public.profiles (id, school_id) on delete set null (received_by)
);

create index fee_payments_student_idx on public.fee_payments (student_id, school_id);
create index fee_payments_school_year_idx on public.fee_payments (school_id, academic_year_id);
create index fee_payments_year_idx on public.fee_payments (academic_year_id, school_id);
create index fee_payments_receiver_idx on public.fee_payments (received_by, school_id);

create function private.check_fee_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.student_enrollments se
    where se.student_id = new.student_id and se.academic_year_id = new.academic_year_id
  ) then
    raise exception 'student_not_in_class' using errcode = 'MD003';
  end if;
  new.received_by := coalesce(auth.uid(), new.received_by);
  return new;
end;
$$;

create trigger fee_payments_check
before insert or update on public.fee_payments
for each row execute function private.check_fee_payment();

/** Grade levels the caller's children (parent) or the caller (student) are enrolled in, per year. */
create function private.own_fee_scope()
returns table (academic_year_id uuid, grade_level_id uuid)
language sql
stable
security definer
set search_path = ''
as $$
  select se.academic_year_id, c.grade_level_id
  from public.student_enrollments se
  join public.classes c on c.id = se.class_id
  where se.student_id = auth.uid()
     or se.student_id in (select ps.student_id from public.parent_students ps where ps.parent_id = auth.uid());
$$;

grant execute on function private.own_fee_scope() to authenticated;

alter table public.fee_items enable row level security;
alter table public.fee_payments enable row level security;

create policy "fee_items: read" on public.fee_items for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (
    (select private.has_permission('finance.view'))
    or exists (
      select 1 from private.own_fee_scope() s
      where s.academic_year_id = fee_items.academic_year_id
        and (fee_items.grade_level_id is null or fee_items.grade_level_id = s.grade_level_id)
    )
  )
);

do $$
declare
  manage text := 'school_id = (select private.jwt_school_id()) and (select private.has_permission(''finance.manage''))';
  t text;
begin
  foreach t in array array['fee_items', 'fee_payments']
  loop
    execute format('create policy "%1$s: insert" on public.%1$I for insert to authenticated with check (%2$s)', t, manage);
    execute format('create policy "%1$s: update" on public.%1$I for update to authenticated using (%2$s) with check (%2$s)', t, manage);
    execute format('create policy "%1$s: delete" on public.%1$I for delete to authenticated using (%2$s)', t, manage);
  end loop;
end;
$$;

create policy "fee_payments: read" on public.fee_payments for select to authenticated
using (
  school_id = (select private.jwt_school_id())
  and (
    (select private.has_permission('finance.view'))
    or student_id = (select auth.uid())
    or student_id in (select private.parent_student_ids())
  )
);

/** Due / paid / balance per enrolled student for a year (runs under RLS). */
create function public.student_balances(p_year_id uuid)
returns table (
  student_id uuid,
  full_name text,
  class_id uuid,
  class_name text,
  due numeric,
  paid numeric
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    se.student_id,
    p.full_name,
    c.id,
    c.name,
    coalesce((
      select sum(fi.amount) from public.fee_items fi
      where fi.academic_year_id = p_year_id
        and (fi.grade_level_id is null or fi.grade_level_id = c.grade_level_id)
    ), 0),
    coalesce((
      select sum(fp.amount) from public.fee_payments fp
      where fp.student_id = se.student_id and fp.academic_year_id = p_year_id
    ), 0)
  from public.student_enrollments se
  join public.profiles p on p.id = se.student_id
  join public.classes c on c.id = se.class_id
  where se.academic_year_id = p_year_id
  order by p.full_name;
$$;

revoke execute on function public.student_balances(uuid) from public, anon;
grant execute on function public.student_balances(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Platform: plans, subscriptions, ledger (super admin only)
-- ---------------------------------------------------------------------
create table public.plans (
  id            uuid primary key default gen_random_uuid(),
  name          text not null unique check (char_length(name) between 2 and 60),
  monthly_price numeric(10, 2) not null check (monthly_price >= 0),
  yearly_price  numeric(10, 2) not null check (yearly_price >= 0),
  features      text[] not null default '{}',
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

create table public.school_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  school_id  uuid not null references public.schools (id) on delete cascade,
  plan_id    uuid not null references public.plans (id) on delete restrict,
  cycle      public.billing_cycle not null,
  starts_on  date not null,
  ends_on    date not null,
  amount     numeric(10, 2) not null check (amount >= 0),
  created_at timestamptz not null default now(),
  constraint school_subscriptions_dates check (ends_on > starts_on)
);

create index school_subscriptions_school_idx on public.school_subscriptions (school_id, ends_on desc);
create index school_subscriptions_plan_idx on public.school_subscriptions (plan_id);

create table public.platform_transactions (
  id          uuid primary key default gen_random_uuid(),
  kind        public.transaction_kind not null,
  amount      numeric(12, 2) not null check (amount > 0),
  occurred_on date not null default current_date,
  school_id   uuid references public.schools (id) on delete set null,
  description text not null check (char_length(description) between 2 and 200),
  created_at  timestamptz not null default now()
);

create index platform_transactions_date_idx on public.platform_transactions (occurred_on desc);
create index platform_transactions_school_idx on public.platform_transactions (school_id);

alter table public.plans enable row level security;
alter table public.school_subscriptions enable row level security;
alter table public.platform_transactions enable row level security;

do $$
declare
  t text;
begin
  foreach t in array array['plans', 'school_subscriptions', 'platform_transactions']
  loop
    execute format(
      'create policy "%1$s: platform owner" on public.%1$I for all to authenticated
         using ((select private.is_super_admin())) with check ((select private.is_super_admin()))',
      t
    );
  end loop;
end;
$$;

-- A school sees its own subscription history (settings / renewal reminders).
create policy "school_subscriptions: school reads own" on public.school_subscriptions for select to authenticated
using (school_id = (select private.jwt_school_id()));

/**
 * Subscribes (or renews) a school: the period follows the cycle, the price is booked as income
 * and the school's features become the plan's features.
 */
create function public.subscribe_school(
  p_school_id uuid,
  p_plan_id uuid,
  p_cycle public.billing_cycle,
  p_starts_on date default current_date
)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_plan public.plans%rowtype;
  v_school text;
  v_amount numeric;
  v_id uuid;
begin
  if not private.is_super_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  select * into v_plan from public.plans where id = p_plan_id and is_active;
  select name into v_school from public.schools where id = p_school_id;
  if v_plan.id is null or v_school is null then
    raise exception 'not found' using errcode = 'P0002';
  end if;

  v_amount := case when p_cycle = 'monthly' then v_plan.monthly_price else v_plan.yearly_price end;

  insert into public.school_subscriptions (school_id, plan_id, cycle, starts_on, ends_on, amount)
  values (
    p_school_id, p_plan_id, p_cycle, p_starts_on,
    p_starts_on + case when p_cycle = 'monthly' then interval '1 month' else interval '1 year' end,
    v_amount
  )
  returning id into v_id;

  if v_amount > 0 then
    insert into public.platform_transactions (kind, amount, occurred_on, school_id, description)
    values ('income', v_amount, p_starts_on, p_school_id, v_plan.name || ' — ' || v_school);
  end if;

  perform public.set_school_features(p_school_id, v_plan.features);
  return v_id;
end;
$$;

revoke execute on function public.subscribe_school(uuid, uuid, public.billing_cycle, date) from public, anon;
grant execute on function public.subscribe_school(uuid, uuid, public.billing_cycle, date) to authenticated;

/** Platform owner home: this month's money and subscriptions ending within 30 days. */
create function public.platform_finance_summary()
returns jsonb
language sql
stable
security invoker
set search_path = ''
as $$
  select jsonb_build_object(
    'income', coalesce((select sum(amount) from public.platform_transactions
                        where kind = 'income' and occurred_on >= date_trunc('month', current_date)), 0),
    'commission', coalesce((select sum(amount) from public.platform_transactions
                            where kind = 'commission' and occurred_on >= date_trunc('month', current_date)), 0),
    'expense', coalesce((select sum(amount) from public.platform_transactions
                         where kind = 'expense' and occurred_on >= date_trunc('month', current_date)), 0),
    'expiring', (
      select count(*) from (
        select distinct on (s.school_id) s.ends_on
        from public.school_subscriptions s
        order by s.school_id, s.ends_on desc
      ) latest
      where latest.ends_on between current_date and current_date + 30
    )
  );
$$;

revoke execute on function public.platform_finance_summary() from public, anon;
grant execute on function public.platform_finance_summary() to authenticated;
