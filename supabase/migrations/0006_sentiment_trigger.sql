-- supabase/migrations/0006_sentiment_trigger.sql
-- 세 테이블에 새 행이 생기면 pg_net으로 analyze-sentiment Edge Function을 비동기
-- 호출한다. pg_net.http_post는 논블로킹이라 INSERT 트랜잭션을 지연시키지 않는다.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_analyze_sentiment()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_source_table text;
  v_text text;
begin
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

  perform net.http_post(
    url := 'https://rxxodddnuwhnvokdglrz.supabase.co/functions/v1/analyze-sentiment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eG9kZGRudXdobnZva2RnbHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjgyMTMsImV4cCI6MjEwNDM0NDIxM30.ulL0OXjvGDOZMQloCI-uW2f3FDjZHhu0k3KW92-P7_8',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eG9kZGRudXdobnZva2RnbHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjgyMTMsImV4cCI6MjEwNDM0NDIxM30.ulL0OXjvGDOZMQloCI-uW2f3FDjZHhu0k3KW92-P7_8'
    ),
    body := jsonb_build_object(
      'source_table', v_source_table,
      'source_id', new.id,
      'user_id', new.user_id,
      'text', v_text
    )
  );

  return new;
end;
$$;

create trigger snaps_notify_sentiment
  after insert on public.snaps
  for each row execute function public.notify_analyze_sentiment();

create trigger mood_records_notify_sentiment
  after insert on public.mood_records
  for each row execute function public.notify_analyze_sentiment();

create trigger remember_today_notify_sentiment
  after insert on public.remember_today
  for each row execute function public.notify_analyze_sentiment();
