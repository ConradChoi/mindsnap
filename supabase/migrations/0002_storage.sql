-- MindSnap Supabase Storage 설정 (T4)
-- Private 버킷 + 경로 기반 RLS: 객체 경로는 반드시 `{auth.uid()}/...`로 시작해야 함.
-- 화면에는 signed URL을 발급해서 보여준다 (경로 자체는 DB의 snaps.image_path/audio_path에 저장).

insert into storage.buckets (id, name, public)
values ('media', 'media', false)
on conflict (id) do nothing;

drop policy if exists media_select_own on storage.objects;
drop policy if exists media_insert_own on storage.objects;
drop policy if exists media_update_own on storage.objects;
drop policy if exists media_delete_own on storage.objects;

create policy media_select_own on storage.objects
  for select using (
    bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy media_insert_own on storage.objects
  for insert with check (
    bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy media_update_own on storage.objects
  for update using (
    bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy media_delete_own on storage.objects
  for delete using (
    bucket_id = 'media' and auth.uid()::text = (storage.foldername(name))[1]
  );
