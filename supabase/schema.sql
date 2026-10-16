-- 윌앤비전 급여·노무 관리: Supabase 테이블
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여 넣고 Run 하세요. 여러 번 실행해도 됩니다.
--
-- 화면의 데이터 묶음(사업장·노무 문제·급여 특이사항·통상임금·통상임금 메모)마다 테이블 하나.
-- 각 행은 id 와 내용(data, JSON) 으로 저장합니다. 항목(열)이 늘어나도 테이블을 고칠 필요가 없습니다.

do $$
declare t text;
begin
  foreach t in array array['sites','issues','notes','wages','wagenotes'] loop
    execute format('create table if not exists public.%I (
      id text primary key,
      data jsonb not null default ''{}''::jsonb,
      updated_at timestamptz not null default now()
    )', t);

    -- 로그인 없이 사용: 주소·anon 키를 가진 사람은 누구나 읽고 쓸 수 있음
    -- (그래서 키는 GitHub 등 공개 장소에 올리면 안 됨. js/config.local.js 참고)
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "로그인 사용자 전체 권한" on public.%I', t);
    execute format('drop policy if exists "앱 전체 권한" on public.%I', t);
    execute format('create policy "앱 전체 권한" on public.%I
      for all to anon, authenticated using (true) with check (true)', t);

    -- 다른 사람이 고친 내용이 바로 화면에 반영되도록 실시간 알림 켜기
    if not exists (select 1 from pg_publication_tables
                   where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
