-- 성격 검사 결과 콘텐츠(도형심리/에니어그램/생일인생주기 설명 문구)를 앱 번들이 아닌
-- DB에서 관리한다. 이렇게 해야 Capacitor 패키징 이후에도 콘텐츠 문구 수정 시
-- 앱스토어 재빌드/재심사 없이 즉시 반영된다.
--
-- 모든 사용자에게 동일하게 노출되는 공개 콘텐츠라 사용자별 RLS는 필요 없다.
-- 수정은 Supabase 대시보드(Table editor)에서 직접 하고, 클라이언트에서는 읽기만 가능하다.

create table public.personality_test_content (
  test_type    text not null check (test_type in ('shape', 'enneagram', 'life_cycle')),
  content_key  text not null,
  content      jsonb not null,
  updated_at   timestamptz not null default now(),
  primary key (test_type, content_key)
);

alter table public.personality_test_content enable row level security;

create policy personality_test_content_select_all on public.personality_test_content
  for select using (true);

-- insert/update/delete 정책 없음(의도적) — 클라이언트는 절대 콘텐츠를 쓸 수 없고,
-- 콘텐츠 수정은 Supabase 대시보드 Table editor 또는 SQL editor에서만 진행한다.

create trigger personality_test_content_set_updated_at
  before update on public.personality_test_content
  for each row execute function public.set_updated_at();
