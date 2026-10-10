-- Google Cloud Natural Language API 감정 분석/엔티티 추출 결과 저장소.
-- 세 소스 테이블(snaps/mood_records/remember_today)에 컬럼을 각각 추가하는 대신
-- 결과를 한 테이블에 모아서, 저널 감정 추이·엔티티 통계를 뽑을 때 한 테이블만
-- 보면 되게 한다. 쓰기는 analyze-sentiment Edge Function이 service_role로만
-- 수행하므로 클라이언트용 insert/update RLS 정책은 두지 않는다.

create type public.sentiment_source_table as enum ('snap', 'mood_record', 'remember_today');

create table public.sentiment_analysis (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  source_table         public.sentiment_source_table not null,
  source_id            uuid not null,
  status               text not null default 'pending'
                         check (status in ('pending', 'completed', 'failed')),
  sentiment_score      real,     -- -1.0(부정) ~ 1.0(긍정)
  sentiment_magnitude  real,     -- 0 이상, 감정 표현의 강도(극성 무관)
  entities             jsonb,    -- [{name, type, salience}, ...]
  error_message        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (source_table, source_id)
);

create index sentiment_analysis_user_idx
  on public.sentiment_analysis (user_id, created_at desc);

alter table public.sentiment_analysis enable row level security;

create policy sentiment_analysis_select_own on public.sentiment_analysis
  for select using (auth.uid() = user_id);

create trigger sentiment_analysis_set_updated_at
  before update on public.sentiment_analysis
  for each row execute function public.set_updated_at();

-- 옵트아웃 토글 (기본값 true — 전체 사용자에게 기본 적용, 설정에서 끌 수 있음)
alter table public.profiles
  add column sentiment_analysis_enabled boolean not null default true;
