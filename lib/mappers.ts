// T3: 날짜 변환 단일 계층
//
// Supabase(Postgres)는 timestamptz 컬럼을 항상 ISO 8601 문자열로 반환한다(Date 인스턴스가 아님).
// 예전 Firebase 코드는 `instanceof Date ? ... : new Date(...)` 패턴을 8곳 이상 복붙해서
// (Firestore Timestamp / 캐시된 Date / 문자열이 뒤섞여 나올 수 있었기 때문에) 계속 버그가 났다.
// Supabase 전환 이후에는 "DB 응답은 항상 string, 앱에서는 항상 Date" 라는 단일 규칙만 지키면
// 되므로, 변환 로직을 이 파일 하나로 모은다. 다른 곳에서 `new Date(row.xxx)`를 직접 호출하지 않는다.

export const toDate = (value: string | null | undefined): Date | undefined => {
  if (!value) return undefined
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? undefined : d
}

export const toDateRequired = (value: string): Date => {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid timestamptz value from DB: ${value}`)
  }
  return d
}

// ---- Row 타입 (DB에서 select()로 그대로 받는 형태, snake_case) ----

export interface ProfileRow {
  id: string
  display_name: string | null
  last_nickname_change: string | null
  created_at: string
  updated_at: string
}

export interface SnapRow {
  id: string
  user_id: string
  title: string
  note: string | null
  image_path: string | null
  audio_path: string | null
  tags: string[]
  captured_at: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface MoodRecordRow {
  id: string
  user_id: string
  mood_level: number
  note: string | null
  activities: string[]
  created_at: string
  deleted_at: string | null
}

export interface RememberTodayRow {
  id: string
  user_id: string
  mood_level: number
  memorable_event: string
  reason: string
  cause: string
  improvement: string
  action: string
  summary: string
  selected_date: string | null
  with_notification: boolean
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export interface PersonalityTestResultRow {
  id: string
  user_id: string
  test_type: string
  input: Record<string, unknown>
  result_key: string
  created_at: string
  deleted_at: string | null
}

// ---- Row -> 앱 타입 매퍼 (엔티티별 1개) ----
// 이미지/음성 signed URL은 매퍼 밖(lib/storage.ts)에서 채워 넣는다 (I/O가 필요하므로).

import { MoodRecord, PersonalityTestResult, PersonalityTestType, RememberToday, Snap, User } from './types'

export const mapProfileRow = (row: ProfileRow, email: string | null): User => ({
  uid: row.id,
  email,
  displayName: row.display_name,
  createdAt: toDateRequired(row.created_at),
  updatedAt: toDateRequired(row.updated_at),
})

export const mapSnapRow = (row: SnapRow, urls?: { imageUrl?: string; audioUrl?: string }): Snap => ({
  id: row.id,
  userId: row.user_id,
  title: row.title,
  note: row.note ?? undefined,
  imageUrl: urls?.imageUrl,
  audioUrl: urls?.audioUrl,
  tags: row.tags ?? [],
  capturedAt: toDateRequired(row.captured_at),
  createdAt: toDateRequired(row.created_at),
  updatedAt: toDateRequired(row.updated_at),
  deletedAt: toDate(row.deleted_at),
})

export const mapMoodRecordRow = (row: MoodRecordRow): MoodRecord => ({
  id: row.id,
  userId: row.user_id,
  mood: row.mood_level as MoodRecord['mood'],
  note: row.note ?? undefined,
  activities: row.activities ?? [],
  createdAt: toDateRequired(row.created_at),
  deletedAt: toDate(row.deleted_at),
})

export const mapPersonalityTestResultRow = (row: PersonalityTestResultRow): PersonalityTestResult => ({
  id: row.id,
  userId: row.user_id,
  testType: row.test_type as PersonalityTestType,
  input: row.input ?? {},
  resultKey: row.result_key,
  createdAt: toDateRequired(row.created_at),
  deletedAt: toDate(row.deleted_at),
})

export const mapRememberTodayRow = (row: RememberTodayRow): RememberToday => ({
  id: row.id,
  userId: row.user_id,
  mood: row.mood_level as RememberToday['mood'],
  memorableEvent: row.memorable_event,
  reason: row.reason,
  cause: row.cause,
  improvement: row.improvement,
  action: row.action,
  summary: row.summary,
  selectedDate: toDate(row.selected_date),
  withNotification: row.with_notification,
  createdAt: toDateRequired(row.created_at),
  updatedAt: toDateRequired(row.updated_at),
  deletedAt: toDate(row.deleted_at),
})
