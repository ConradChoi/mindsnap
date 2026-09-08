-- 성격 검사 결과 저장 (도형심리 / 에니어그램 / 생일 인생주기 공통 테이블)
-- test_type으로 검사 종류를 구분하고, input(원본 응답)과 result_key(계산된 결과 식별자)만
-- 저장한다. 결과 설명 텍스트는 DB가 아니라 앱 코드의 콘텐츠 파일(data/*.json)에서 관리한다
-- (검사 종류가 늘어나도 테이블을 새로 만들 필요가 없도록 하는 설계).

create table public.personality_test_results (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  test_type   text not null check (test_type in ('shape', 'enneagram', 'life_cycle')),
  input       jsonb not null default '{}',
  result_key  text not null,
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index personality_test_results_user_active_idx
  on public.personality_test_results (user_id, created_at desc) where deleted_at is null;

alter table public.personality_test_results enable row level security;

create policy personality_test_results_select_own on public.personality_test_results
  for select using (auth.uid() = user_id);
create policy personality_test_results_insert_own on public.personality_test_results
  for insert with check (auth.uid() = user_id);
create policy personality_test_results_update_own on public.personality_test_results
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
