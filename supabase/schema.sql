-- 윌앤비전 급여·노무 관리: Supabase 테이블
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여 넣고 Run 하세요. 여러 번 실행해도 됩니다.
--
-- 화면의 데이터 묶음(사업장·노무 문제·급여 특이사항·청구 특이사항·통상임금·통상임금 메모)마다 테이블 하나.
-- 각 행은 id 와 내용(data, JSON) 으로 저장합니다. 항목(열)이 늘어나도 테이블을 고칠 필요가 없습니다.

grant usage on schema public to authenticated;

do $$
declare t text;
begin
  foreach t in array array['sites','issues','notes','bills','wages','wagenotes'] loop
    execute format('create table if not exists public.%I (
      id text primary key,
      data jsonb not null default ''{}''::jsonb,
      updated_at timestamptz not null default now()
    )', t);

    -- 앱(로그인 사용자)이 테이블에 접근할 수 있게 권한 부여 (새 프로젝트는 자동으로 주지 않는 경우가 있음)
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);

    -- 로그인한 사용자(팀 공용 계정)만 읽고 쓸 수 있음
    -- ⚠️ Authentication 설정에서 "Allow new users to sign up" 을 꼭 끄세요. 켜져 있으면 누구나 가입해 접근할 수 있습니다.
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "로그인 사용자 전체 권한" on public.%I', t);
    execute format('drop policy if exists "앱 전체 권한" on public.%I', t);
    execute format('create policy "로그인 사용자 전체 권한" on public.%I
      for all to authenticated using (true) with check (true)', t);

    -- 다른 사람이 고친 내용이 바로 화면에 반영되도록 실시간 알림 켜기
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
