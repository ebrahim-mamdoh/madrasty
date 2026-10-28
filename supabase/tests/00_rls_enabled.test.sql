begin;
select plan(2);

-- Every table exposed through the API must have RLS on.
select is(
  (
    select count(*)::int
    from pg_tables
    where schemaname = 'public' and not rowsecurity
  ),
  0,
  'RLS is enabled on every public table'
);

-- …and must have at least one policy (RLS without policies silently hides everything).
select is(
  (
    select count(*)::int
    from pg_tables t
    where t.schemaname = 'public'
      and not exists (
        select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = t.tablename
      )
  ),
  0,
  'Every public table has at least one policy'
);

select * from finish();
rollback;
