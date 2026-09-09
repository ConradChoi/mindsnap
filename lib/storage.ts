// T4: 사진/음성 Storage 업로드 + signed URL 발급
//
// Private 버킷('media') + 경로 기반 RLS(`{user_id}/...`)를 사용한다.
// DB(snaps.image_path/audio_path)에는 경로만 저장하고, 화면에 보여줄 때마다
// signed URL을 발급한다(만료 시간 기본 1시간). signed URL 자체는 저장하지 않는다 —
// blob: URL을 DB에 저장했던 원래 버그와 동일한 실수를 반복하지 않기 위함.

import { supabase } from './supabase'

const BUCKET = 'media'
const DEFAULT_SIGNED_URL_TTL_SECONDS = 60 * 60 // 1시간

const extensionFromMime = (mime: string | undefined, fallback: string): string => {
  if (!mime) return fallback
  const map: Record<string, string> = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'audio/webm': 'webm',
    'audio/mp4': 'm4a',
    'audio/wav': 'wav',
    'audio/mpeg': 'mp3',
    // capacitor-voice-recorder(iOS/Android 네이티브 녹음)가 반환하는 포맷
    'audio/aac': 'aac',
  }
  return map[mime] ?? fallback
}

export const uploadSnapMedia = async (
  userId: string,
  snapId: string,
  kind: 'image' | 'audio',
  file: File | Blob
): Promise<string> => {
  const mime = (file as File).type || undefined
  const ext = extensionFromMime(mime, kind === 'image' ? 'jpg' : 'webm')
  const path = `${userId}/${snapId}/${kind}.${ext}`

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: mime,
  })

  if (error) {
    throw new Error(`Storage upload failed (${kind}): ${error.message}`)
  }

  return path
}

export const deleteSnapMediaFiles = async (paths: (string | null | undefined)[]): Promise<void> => {
  const validPaths = paths.filter((p): p is string => !!p)
  if (validPaths.length === 0) return
  const { error } = await supabase.storage.from(BUCKET).remove(validPaths)
  if (error) {
    // 파일 정리 실패는 앱 동작을 막지 않는다 (레코드 삭제가 더 중요함)
    console.error('Storage cleanup failed:', error.message)
  }
}

export const getSignedUrl = async (
  path: string | null | undefined,
  expiresInSeconds: number = DEFAULT_SIGNED_URL_TTL_SECONDS
): Promise<string | undefined> => {
  if (!path) return undefined
  const { data, error } = await supabase.storage.from(BUCKET).createSignedUrl(path, expiresInSeconds)
  if (error || !data) {
    console.error('Failed to create signed URL:', error?.message)
    return undefined
  }
  return data.signedUrl
}

export const getSignedUrls = async (
  paths: { imagePath?: string | null; audioPath?: string | null }
): Promise<{ imageUrl?: string; audioUrl?: string }> => {
  const [imageUrl, audioUrl] = await Promise.all([
    getSignedUrl(paths.imagePath),
    getSignedUrl(paths.audioPath),
  ])
  return { imageUrl, audioUrl }
}
