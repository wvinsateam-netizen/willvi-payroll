-- 윌앤비전 급여·노무 관리: Supabase 테이블 + 보안 정책
-- Supabase → SQL Editor 에 통째로 붙여넣고 Run 하세요. 여러 번 실행해도 안전합니다.

-- 1) 데이터 테이블: 화면의 컬렉션(sites, issues, notes, wages, wagenotes)을 문서 단위로 저장
create table if not exists public.docs (
  col        text        not null check (col in ('sites','issues','notes','wages','wagenotes')),
  id         text        not null,
  data       jsonb       not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by text,
  primary key (col, id)
);

-- 2) 사용할 수 있는 사람 명단 (여기 있는 이메일만 읽기/쓰기 가능)
create table if not exists public.members (
  email      text primary key,
  name       text,
  created_at timestamptz not null default now()
);

create or replace function public.is_member()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.members where lower(email) = lower(auth.jwt() ->> 'email'));
$$;

-- 3) RLS: 로그인 + 명단에 있는 사람만
alter table public.docs    enable row level security;
alter table public.members enable row level security;

drop policy if exists "members read docs"   on public.docs;
drop policy if exists "members insert docs" on public.docs;
drop policy if exists "members update docs" on public.docs;
drop policy if exists "members delete docs" on public.docs;
create policy "members read docs"   on public.docs for select to authenticated using (public.is_member());
create policy "members insert docs" on public.docs for insert to authenticated with check (public.is_member());
create policy "members update docs" on public.docs for update to authenticated using (public.is_member()) with check (public.is_member());
create policy "members delete docs" on public.docs for delete to authenticated using (public.is_member());

drop policy if exists "members read members" on public.members;
create policy "members read members" on public.members for select to authenticated using (public.is_member());
-- members 추가/삭제는 SQL Editor(관리자)에서만 합니다.

-- 4) 다른 사람이 저장하면 화면에 바로 반영되도록 실시간 전송 켜기
do $$ begin
  alter publication supabase_realtime add table public.docs;
exception when duplicate_object then null; end $$;

-- 5) 사용자 등록 예시 (이메일을 바꿔서 실행)
-- insert into public.members (email, name) values ('someone@willvision.co.kr', '홍길동') on conflict do nothing;
