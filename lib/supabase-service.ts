// Firebase(lib/firebase-service.ts)를 대체하는 Supabase 데이터 서비스 레이어.
// 화면 코드의 변경을 최소화하기 위해 기존 함수 이름/시그니처를 최대한 유지한다.
//
// 실시간 구독(subscribeToSnaps 등)은 이식하지 않는다: 기존 코드에서도 어디서도 호출되지
// 않는 죽은 코드였고(1인 사용자 앱 특성상 필요성도 낮음), 오히려 반복적인 날짜 변환 버그의
// 진원지였다. 화면은 일반 조회(fetch)로 데이터를 가져온다.

import { supabase } from './supabase'
import { getSignedUrls, uploadSnapMedia } from './storage'
import {
  mapMoodRecordRow,
  mapPersonalityTestResultRow,
  mapProfileRow,
  mapRememberTodayRow,
  mapSnapRow,
  MoodRecordRow,
  PersonalityTestResultRow,
  ProfileRow,
  RememberTodayRow,
  SnapRow,
  toDateRequired,
} from './mappers'
import {
  MoodLevel,
  MoodRecord,
  PersonalityTestResult,
  PersonalityTestType,
  RememberToday,
  Snap,
  TrashItem,
  User,
} from './types'
import { ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES, logUserActivity } from './analytics'

const TRASH_RETENTION_DAYS = 14

// =========================================================
// Profile (User) services
// =========================================================

// 회원가입 시 profiles row는 DB 트리거(on_auth_user_created)가 자동 생성한다.
// 이 함수는 트리거가 아직 반영되지 않은 경합 상황을 대비한 안전장치(upsert)로만 남겨둔다.
export const createUser = async (userData: { email: string; name?: string }) => {
  const { data: authData } = await supabase.auth.getUser()
  const uid = authData.user?.id
  if (!uid) throw new Error('createUser: no authenticated user')

  await supabase.from('profiles').upsert({ id: uid }, { onConflict: 'id' })

  return getUser(uid)
}

export const getUser = async (userId: string): Promise<User | null> => {
  const { data: profileRow, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle<ProfileRow>()

  if (error || !profileRow) return null

  const { data: authData } = await supabase.auth.getUser()
  const email = authData.user?.id === userId ? authData.user.email ?? null : null

  return mapProfileRow(profileRow, email)
}

export const updateUser = async (userId: string, userData: { name?: string }) => {
  await supabase
    .from('profiles')
    .update({ display_name: userData.name })
    .eq('id', userId)
}

export const updateUserNickname = async (userId: string, nickname: string) => {
  try {
    const { error } = await supabase
      .from('profiles')
      .update({ display_name: nickname, last_nickname_change: new Date().toISOString() })
      .eq('id', userId)

    if (error) throw error
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error updating user nickname:', error)
    return { success: false, error: error.message }
  }
}

export const canChangeNickname = async (userId: string) => {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('last_nickname_change')
      .eq('id', userId)
      .maybeSingle<{ last_nickname_change: string | null }>()

    if (error) throw error

    if (!data?.last_nickname_change) {
      return { canChange: true, lastChangeDate: null, daysRemaining: 0, error: null }
    }

    const lastChangeDate = toDateRequired(data.last_nickname_change)
    const now = new Date()
    const daysSinceLastChange = Math.floor((now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24))

    return {
      canChange: daysSinceLastChange >= 30,
      lastChangeDate,
      daysRemaining: Math.max(0, 30 - daysSinceLastChange),
      error: null,
    }
  } catch (error: any) {
    console.error('Error checking nickname change eligibility:', error)
    return { canChange: false, lastChangeDate: null, daysRemaining: 0, error: error.message }
  }
}

// =========================================================
// Snap services
// =========================================================

interface CreateSnapInput {
  userId: string
  title: string
  note?: string
  tags?: string[]
  capturedAt?: Date
  imageFile?: File | Blob | null
  audioFile?: File | Blob | null
}

export const createSnap = async (snapData: CreateSnapInput): Promise<Snap> => {
  const id = crypto.randomUUID()

  const [imagePath, audioPath] = await Promise.all([
    snapData.imageFile ? uploadSnapMedia(snapData.userId, id, 'image', snapData.imageFile) : Promise.resolve(undefined),
    snapData.audioFile ? uploadSnapMedia(snapData.userId, id, 'audio', snapData.audioFile) : Promise.resolve(undefined),
  ])

  const { data, error } = await supabase
    .from('snaps')
    .insert({
      id,
      user_id: snapData.userId,
      title: snapData.title,
      note: snapData.note ?? null,
      image_path: imagePath ?? null,
      audio_path: audioPath ?? null,
      tags: snapData.tags ?? [],
      captured_at: (snapData.capturedAt ?? new Date()).toISOString(),
    })
    .select()
    .single<SnapRow>()

  if (error) throw error

  await logUserActivity(snapData.userId, ACTIVITY_ACTIONS.CREATE_SNAP, ACTIVITY_CATEGORIES.CAPTURE, {
    snapId: data.id,
    title: snapData.title,
    hasImage: !!imagePath,
    hasAudio: !!audioPath,
    hasNote: !!snapData.note,
    noteLength: snapData.note?.length || 0,
  })

  const urls = await getSignedUrls({ imagePath, audioPath })
  return mapSnapRow(data, urls)
}

export const getSnaps = async (userId: string, limitCount = 30): Promise<Snap[]> => {
  try {
    const { data, error } = await supabase
      .from('snaps')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limitCount)
      .returns<SnapRow[]>()

    if (error) throw error

    return await Promise.all(
      (data ?? []).map(async (row) => {
        const urls = await getSignedUrls({ imagePath: row.image_path, audioPath: row.audio_path })
        return mapSnapRow(row, urls)
      })
    )
  } catch (error) {
    console.error('Error fetching snaps:', error)
    return []
  }
}

export const getSnap = async (snapId: string): Promise<Snap | null> => {
  const { data, error } = await supabase.from('snaps').select('*').eq('id', snapId).maybeSingle<SnapRow>()
  if (error || !data) return null
  const urls = await getSignedUrls({ imagePath: data.image_path, audioPath: data.audio_path })
  return mapSnapRow(data, urls)
}

export const updateSnap = async (snapId: string, snapData: Partial<Pick<Snap, 'title' | 'note' | 'tags'>>) => {
  const { error } = await supabase
    .from('snaps')
    .update({
      ...(snapData.title !== undefined ? { title: snapData.title } : {}),
      ...(snapData.note !== undefined ? { note: snapData.note } : {}),
      ...(snapData.tags !== undefined ? { tags: snapData.tags } : {}),
    })
    .eq('id', snapId)

  if (error) throw error
}

// 소프트 삭제 (T5: 휴지통). 원본 레코드는 유지하고 deleted_at만 채운다.
export const deleteSnap = async (snapId: string, userId?: string) => {
  const { error } = await supabase.from('snaps').update({ deleted_at: new Date().toISOString() }).eq('id', snapId)
  if (error) throw error
  if (userId) {
    await logUserActivity(userId, ACTIVITY_ACTIONS.DELETE_SNAP, ACTIVITY_CATEGORIES.JOURNAL, { snapId })
  }
}

export const restoreSnap = async (snapId: string, userId?: string) => {
  const { error } = await supabase.from('snaps').update({ deleted_at: null }).eq('id', snapId)
  if (error) throw error
  if (userId) {
    await logUserActivity(userId, ACTIVITY_ACTIONS.RESTORE_ITEM, ACTIVITY_CATEGORIES.JOURNAL, {
      itemType: 'snap',
      snapId,
    })
  }
}

// =========================================================
// Mood Record services
// =========================================================

interface CreateMoodRecordInput {
  userId: string
  mood: MoodLevel
  note?: string
  activities?: string[]
}

export const createMoodRecord = async (moodData: CreateMoodRecordInput): Promise<MoodRecord> => {
  const { data, error } = await supabase
    .from('mood_records')
    .insert({
      user_id: moodData.userId,
      mood_level: moodData.mood,
      note: moodData.note ?? null,
      activities: moodData.activities ?? [],
    })
    .select()
    .single<MoodRecordRow>()

  if (error) throw error

  await logUserActivity(moodData.userId, ACTIVITY_ACTIONS.CREATE_MOOD, ACTIVITY_CATEGORIES.JOURNAL, {
    moodRecordId: data.id,
    mood: moodData.mood,
    noteLength: moodData.note?.length || 0,
  })

  return mapMoodRecordRow(data)
}

export const getMoodRecords = async (userId: string, limitCount = 30): Promise<MoodRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('mood_records')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limitCount)
      .returns<MoodRecordRow[]>()

    if (error) throw error
    return (data ?? []).map(mapMoodRecordRow)
  } catch (error) {
    console.error('Error fetching mood records:', error)
    return []
  }
}

export const deleteMoodRecord = async (moodRecordId: string, userId?: string) => {
  const { error } = await supabase
    .from('mood_records')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', moodRecordId)
  if (error) throw error
  if (userId) {
    await logUserActivity(userId, ACTIVITY_ACTIONS.DELETE_MOOD, ACTIVITY_CATEGORIES.JOURNAL, { moodRecordId })
  }
}

export const restoreMoodRecord = async (moodRecordId: string, userId?: string) => {
  const { error } = await supabase.from('mood_records').update({ deleted_at: null }).eq('id', moodRecordId)
  if (error) throw error
  if (userId) {
    await logUserActivity(userId, ACTIVITY_ACTIONS.RESTORE_ITEM, ACTIVITY_CATEGORIES.JOURNAL, {
      itemType: 'mood',
      moodRecordId,
    })
  }
}

// =========================================================
// Remember Today services
// =========================================================

interface CreateRememberTodayInput {
  userId: string
  mood: MoodLevel
  memorableEvent: string
  reason: string
  cause: string
  improvement: string
  action: string
  summary: string
  selectedDate?: string | Date
  withNotification: boolean
}

export const createRememberToday = async (rememberData: CreateRememberTodayInput): Promise<RememberToday> => {
  const { data, error } = await supabase
    .from('remember_today')
    .insert({
      user_id: rememberData.userId,
      mood_level: rememberData.mood,
      memorable_event: rememberData.memorableEvent,
      reason: rememberData.reason,
      cause: rememberData.cause,
      improvement: rememberData.improvement,
      action: rememberData.action,
      summary: rememberData.summary,
      selected_date: rememberData.selectedDate ? new Date(rememberData.selectedDate).toISOString() : null,
      with_notification: rememberData.withNotification,
    })
    .select()
    .single<RememberTodayRow>()

  if (error) throw error

  await logUserActivity(rememberData.userId, ACTIVITY_ACTIONS.CREATE_REMEMBER, ACTIVITY_CATEGORIES.JOURNAL, {
    rememberId: data.id,
    mood: rememberData.mood,
    summaryLength: rememberData.summary?.length || 0,
    hasSelectedDate: !!rememberData.selectedDate,
    withNotification: rememberData.withNotification,
  })

  return mapRememberTodayRow(data)
}

export const getRememberToday = async (userId: string, limitCount = 30): Promise<RememberToday[]> => {
  try {
    const { data, error } = await supabase
      .from('remember_today')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(limitCount)
      .returns<RememberTodayRow[]>()

    if (error) throw error
    return (data ?? []).map(mapRememberTodayRow)
  } catch (error) {
    console.error('Error fetching remember today records:', error)
    return []
  }
}

export const updateRememberToday = async (rememberTodayId: string, rememberData: Partial<RememberToday>) => {
  const { error } = await supabase
    .from('remember_today')
    .update({
      ...(rememberData.summary !== undefined ? { summary: rememberData.summary } : {}),
      ...(rememberData.withNotification !== undefined ? { with_notification: rememberData.withNotification } : {}),
    })
    .eq('id', rememberTodayId)
  if (error) throw error
}

export const deleteRememberToday = async (rememberTodayId: string, userId?: string) => {
  const { error } = await supabase
    .from('remember_today')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', rememberTodayId)
  if (error) throw error
  if (userId) {
    await logUserActivity(userId, ACTIVITY_ACTIONS.DELETE_REMEMBER, ACTIVITY_CATEGORIES.JOURNAL, {
      rememberTodayId,
    })
  }
}

export const restoreRememberToday = async (rememberTodayId: string, userId?: string) => {
  const { error } = await supabase.from('remember_today').update({ deleted_at: null }).eq('id', rememberTodayId)
  if (error) throw error
  if (userId) {
    await logUserActivity(userId, ACTIVITY_ACTIONS.RESTORE_ITEM, ACTIVITY_CATEGORIES.JOURNAL, {
      itemType: 'remember',
      rememberTodayId,
    })
  }
}

// =========================================================
// 성격 검사 결과 — 도형심리 / 에니어그램 / 생일 인생주기 공통
// =========================================================

interface CreatePersonalityTestResultInput {
  userId: string
  testType: PersonalityTestType
  input: Record<string, unknown>
  resultKey: string
}

export const createPersonalityTestResult = async (
  data: CreatePersonalityTestResultInput
): Promise<PersonalityTestResult> => {
  const { data: row, error } = await supabase
    .from('personality_test_results')
    .insert({
      user_id: data.userId,
      test_type: data.testType,
      input: data.input,
      result_key: data.resultKey,
    })
    .select()
    .single<PersonalityTestResultRow>()

  if (error) throw error

  await logUserActivity(data.userId, ACTIVITY_ACTIONS.CREATE_PERSONALITY_TEST, ACTIVITY_CATEGORIES.JOURNAL, {
    personalityTestResultId: row.id,
    testType: data.testType,
    resultKey: data.resultKey,
  })

  return mapPersonalityTestResultRow(row)
}

export const getPersonalityTestResults = async (
  userId: string,
  testType?: PersonalityTestType
): Promise<PersonalityTestResult[]> => {
  try {
    let query = supabase
      .from('personality_test_results')
      .select('*')
      .eq('user_id', userId)
      .is('deleted_at', null)
      .order('created_at', { ascending: false })

    if (testType) {
      query = query.eq('test_type', testType)
    }

    const { data, error } = await query.returns<PersonalityTestResultRow[]>()

    if (error) throw error
    return (data ?? []).map(mapPersonalityTestResultRow)
  } catch (error) {
    console.error('Error fetching personality test results:', error)
    return []
  }
}

// =========================================================
// 휴지통 (T5): deleted_at 기반 소프트 삭제 조회/복원 - 별도 테이블 없음
// =========================================================

const trashCutoffIso = () => new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString()

export const getTrashItems = async (userId: string): Promise<TrashItem[]> => {
  const cutoff = trashCutoffIso()

  const [snapsRes, moodRes, rememberRes] = await Promise.all([
    supabase
      .from('snaps')
      .select('*')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false })
      .returns<SnapRow[]>(),
    supabase
      .from('mood_records')
      .select('*')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false })
      .returns<MoodRecordRow[]>(),
    supabase
      .from('remember_today')
      .select('*')
      .eq('user_id', userId)
      .not('deleted_at', 'is', null)
      .gte('deleted_at', cutoff)
      .order('deleted_at', { ascending: false })
      .returns<RememberTodayRow[]>(),
  ])

  const items: TrashItem[] = []

  for (const row of snapsRes.data ?? []) {
    const snap = mapSnapRow(row)
    items.push({ id: snap.id, type: 'snap', deletedAt: snap.deletedAt as Date, title: snap.title, data: snap })
  }
  for (const row of moodRes.data ?? []) {
    const record = mapMoodRecordRow(row)
    items.push({
      id: record.id,
      type: 'mood',
      deletedAt: record.deletedAt as Date,
      title: record.note || '마음 기록',
      data: record,
    })
  }
  for (const row of rememberRes.data ?? []) {
    const record = mapRememberTodayRow(row)
    items.push({
      id: record.id,
      type: 'remember',
      deletedAt: record.deletedAt as Date,
      title: record.summary || '오늘 기록',
      data: record,
    })
  }

  items.sort((a, b) => b.deletedAt.getTime() - a.deletedAt.getTime())
  return items
}

export const restoreTrashItem = async (type: TrashItem['type'], id: string, userId?: string) => {
  if (type === 'snap') return restoreSnap(id, userId)
  if (type === 'mood') return restoreMoodRecord(id, userId)
  return restoreRememberToday(id, userId)
}
