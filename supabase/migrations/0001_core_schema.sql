-- MindSnap Supabase 스키마 (Firebase -> Supabase 전환, T1)
-- 원칙: uuid PK, 모든 날짜 컬럼 timestamptz, 소프트 삭제(deleted_at)로 휴지통 구현,
--       RLS로 "본인 행만 read/write" 강제.

create extension if not exists pgcrypto;

-- =========================================================
-- 0. 공통 유틸: updated_at 자동 갱신 트리거 함수
-- =========================================================
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================
-- 1. profiles — 사용자 프로필 (auth.users 1:1)
-- =========================================================
create table public.profiles (
  id                    uuid primary key references auth.users(id) on delete cascade,
  display_name          text,
  last_nickname_change  timestamptz,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy profiles_select_own on public.profiles
  for select using (auth.uid() = id);
create policy profiles_insert_own on public.profiles
  for insert with check (auth.uid() = id);
create policy profiles_update_own on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- 신규 가입 시 auth.users insert -> profiles row 자동 생성
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, null)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();


-- =========================================================
-- 2. snaps — 스냅(사진/음성/메모)
-- =========================================================
create table public.snaps (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users(id) on delete cascade,
  title        text not null check (char_length(title) between 1 and 200),
  note         text,
  image_path   text,
  audio_path   text,
  tags         text[] not null default '{}',
  captured_at  timestamptz not null default now(),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  deleted_at   timestamptz
);

create index snaps_user_active_idx
  on public.snaps (user_id, created_at desc) where deleted_at is null;
create index snaps_user_trash_idx
  on public.snaps (user_id, deleted_at) where deleted_at is not null;

alter table public.snaps enable row level security;

create policy snaps_select_own on public.snaps
  for select using (auth.uid() = user_id);
create policy snaps_insert_own on public.snaps
  for insert with check (auth.uid() = user_id);
create policy snaps_update_own on public.snaps
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger snaps_set_updated_at
  before update on public.snaps
  for each row execute function public.set_updated_at();


-- =========================================================
-- 3. mood_records — 마음 기록 (5단계 mood_level)
-- =========================================================
create table public.mood_records (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  mood_level  smallint not null check (mood_level between 1 and 5),
  note        text,
  activities  text[] not null default '{}',
  created_at  timestamptz not null default now(),
  deleted_at  timestamptz
);

create index mood_records_user_active_idx
  on public.mood_records (user_id, created_at desc) where deleted_at is null;
create index mood_records_user_trash_idx
  on public.mood_records (user_id, deleted_at) where deleted_at is not null;

alter table public.mood_records enable row level security;

create policy mood_records_select_own on public.mood_records
  for select using (auth.uid() = user_id);
create policy mood_records_insert_own on public.mood_records
  for insert with check (auth.uid() = user_id);
create policy mood_records_update_own on public.mood_records
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);


-- =========================================================
-- 4. remember_today — "오늘을 기억할래" (5단계 mood_level로 daily-mood와 통일)
-- =========================================================
create table public.remember_today (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users(id) on delete cascade,
  mood_level        smallint not null check (mood_level between 1 and 5),
  memorable_event   text not null,
  reason            text not null,
  cause             text not null,
  improvement       text not null,
  action            text not null,
  summary           text not null,
  selected_date     timestamptz,
  with_notification boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  deleted_at        timestamptz
);

create index remember_today_user_active_idx
  on public.remember_today (user_id, created_at desc) where deleted_at is null;
create index remember_today_user_trash_idx
  on public.remember_today (user_id, deleted_at) where deleted_at is not null;

alter table public.remember_today enable row level security;

create policy remember_today_select_own on public.remember_today
  for select using (auth.uid() = user_id);
create policy remember_today_insert_own on public.remember_today
  for insert with check (auth.uid() = user_id);
create policy remember_today_update_own on public.remember_today
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

create trigger remember_today_set_updated_at
  before update on public.remember_today
  for each row execute function public.set_updated_at();


-- =========================================================
-- 5. activity_log — 활동 로그 (인증된 사용자만, IP 미수집)
-- =========================================================
create table public.activity_log (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  action      text not null,
  category    text not null,
  details     jsonb not null default '{}',
  user_agent  text,
  session_id  text,
  created_at  timestamptz not null default now()
);

create index activity_log_user_idx
  on public.activity_log (user_id, created_at desc);

alter table public.activity_log enable row level security;

create policy activity_log_select_own on public.activity_log
  for select using (auth.uid() = user_id);
create policy activity_log_insert_own on public.activity_log
  for insert with check (auth.uid() = user_id);
-- update/delete 정책 없음 (로그는 불변, 서비스 롤에서만 정리 가능)
