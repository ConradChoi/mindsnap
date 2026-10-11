-- supabase/migrations/0007_sentiment_trigger_hardening.sql
-- 최종 리뷰(review-91d1bff..06c5d04.diff)에서 발견된 문제 3가지를 고친다.
--
-- 1) (Critical) analyze-sentiment는 공개된 anon key만으로 "Verify JWT" 체크를
--    통과해 호출할 수 있었다 — anon key는 앱 번들에 그대로 포함되는 공개 값이라
--    사실상 누구나 임의의 user_id/source_id/text로 함수를 호출해 다른 사용자
--    소유의 분석 행을 위조하거나 덮어쓸 수 있었다(service_role로 쓰기 때문).
--    DB 트리거만 아는 공유 시크릿(Vault)을 헤더로 실어 보내고, Edge Function이
--    이 시크릿을 검증하지 못하면 거부하도록 바꿔서 "트리거를 통한 호출만" 허용한다.
-- 2) (Important) pg_net 호출이 AFTER INSERT 트리거 안에서 예외를 던지면(확장
--    오작동, 큐 테이블 문제 등) 원본 snaps/mood_records/remember_today insert
--    자체가 롤백됐다 — Global Constraint("분석 실패가 원본 기록 저장에 어떤
--    영향도 주면 안 된다")를 직접 위반하므로 예외를 잡아 warning으로만 남긴다.
-- 3) (Important) pending 행을 Edge Function이 네트워크 호출 이후에나 비동기로
--    썼기 때문에, 기록 저장 직후 곧바로 저널 화면으로 이동하면 아직 pending
--    행조차 없어 클라이언트 폴링이 "분석 중인 게 없다"고 판단하고 한 번 조회한
--    뒤 멈춰버리는 경우가 있었다 — 트리거가 같은 트랜잭션에서 pending 행을
--    동기적으로 먼저 써서, insert 직후부터 바로 "분석 중" 상태가 보이게 한다.
-- 4) 3번을 트리거에 옮기면서 옵트아웃 사용자도 pending 행이 생기고 거기서 영원히
--    멈추는 회귀가 생길 뻔했다(Edge Function의 옵트아웃 체크는 그 이후 단계라 pending
--    행을 completed/failed로 바꿔주지 않음) — 트리거에서도 옵트아웃 여부를 먼저
--    확인해서, 꺼져 있으면 pending 행조차 쓰지 않도록 했다.
--
-- 이 마이그레이션 자체에는 시크릿 값이 없다(Vault에서 조회). 시크릿은 아래
-- 명령으로 별도 등록했다(이 리포에는 값 자체를 커밋하지 않는다):
--   select vault.create_secret('<random-secret>', 'sentiment_trigger_secret', '...');
-- Edge Function 쪽에는 동일 값을 SENTIMENT_TRIGGER_SECRET 시크릿으로 등록한다.

create or replace function public.notify_analyze_sentiment()
returns trigger
language plpgsql
security definer set search_path = public, extensions, vault
as $$
declare
  v_source_table text;
  v_text text;
  v_trigger_secret text;
  v_enabled boolean;
begin
  -- 옵트아웃 사용자는 pending 행조차 만들지 않는다(Review Focus: "옵트아웃 사용자에
  -- 대해서는 어떤 행도 생성하지 않아야 한다"). profiles 행이 아직 없으면(드묾) NULL이고
  -- NULL은 false가 아니므로 기본값(분석함)으로 진행한다.
  select sentiment_analysis_enabled into v_enabled
  from public.profiles
  where id = new.user_id;

  if v_enabled is false then
    return new;
  end if;

  if tg_table_name = 'snaps' then
    v_source_table := 'snap';
    v_text := new.note;
  elsif tg_table_name = 'mood_records' then
    v_source_table := 'mood_record';
    v_text := new.note;
  elsif tg_table_name = 'remember_today' then
    v_source_table := 'remember_today';
    v_text := concat_ws(
      E'\n',
      '기억에 남는 일: ' || new.memorable_event,
      '이유: ' || new.reason,
      '원인: ' || new.cause,
      '개선할 점: ' || new.improvement,
      '행동: ' || new.action,
      '요약: ' || new.summary
    );
  else
    return new;
  end if;

  -- 분석할 텍스트가 없으면(예: 사진만 있는 스냅) Edge Function 호출 자체를 생략한다.
  if v_text is null or btrim(v_text) = '' then
    return new;
  end if;

  -- pending 행을 트리거에서 동기적으로 기록 — Edge Function의 네트워크 호출을
  -- 기다리지 않고도 insert 직후부터 "분석 중" 상태를 조회할 수 있게 한다.
  insert into public.sentiment_analysis (user_id, source_table, source_id, status)
  values (new.user_id, v_source_table::public.sentiment_source_table, new.id, 'pending')
  on conflict (source_table, source_id) do nothing;

  select decrypted_secret into v_trigger_secret
  from vault.decrypted_secrets
  where name = 'sentiment_trigger_secret';

  begin
    perform net.http_post(
      url := 'https://rxxodddnuwhnvokdglrz.supabase.co/functions/v1/analyze-sentiment',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eG9kZGRudXdobnZva2RnbHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjgyMTMsImV4cCI6MjEwNDM0NDIxM30.ulL0OXjvGDOZMQloCI-uW2f3FDjZHhu0k3KW92-P7_8',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eG9kZGRudXdobnZva2RnbHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjgyMTMsImV4cCI6MjEwNDM0NDIxM30.ulL0OXjvGDOZMQloCI-uW2f3FDjZHhu0k3KW92-P7_8',
        'x-trigger-secret', coalesce(v_trigger_secret, '')
      ),
      body := jsonb_build_object(
        'source_table', v_source_table,
        'source_id', new.id,
        'user_id', new.user_id,
        'text', v_text
      )
    );
  exception when others then
    raise warning 'notify_analyze_sentiment: analyze-sentiment 호출 실패(%), 원본 기록 저장에는 영향 없음', sqlerrm;
  end;

  return new;
end;
$$;
