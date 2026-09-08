import { supabase } from './supabase'

// 사용자 활동 타입 정의 (T6: IP 수집 중단, userAgent만 유지, 인증된 사용자만 기록)
export interface UserActivity {
  id?: string
  userId: string
  action: string
  category: string
  details?: { [key: string]: any }
  userAgent?: string
  sessionId?: string
  createdAt?: string
}

export const ACTIVITY_CATEGORIES = {
  AUTH: 'auth',
  JOURNAL: 'journal',
  SETTINGS: 'settings',
  CAPTURE: 'capture',
  NAVIGATION: 'navigation',
  ERROR: 'error',
} as const

export const ACTIVITY_ACTIONS = {
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',

  CREATE_SNAP: 'create_snap',
  CREATE_MOOD: 'create_mood',
  CREATE_REMEMBER: 'create_remember',
  CREATE_PERSONALITY_TEST: 'create_personality_test',
  DELETE_SNAP: 'delete_snap',
  DELETE_MOOD: 'delete_mood',
  DELETE_REMEMBER: 'delete_remember',
  RESTORE_ITEM: 'restore_item',
  VIEW_JOURNAL: 'view_journal',

  EDIT_PROFILE: 'edit_profile',
  CHANGE_PASSWORD: 'change_password',
  CHANGE_NICKNAME: 'change_nickname',
  UPDATE_SETTINGS: 'update_settings',

  START_RECORDING: 'start_recording',
  STOP_RECORDING: 'stop_recording',
  UPLOAD_IMAGE: 'upload_image',
  SPEECH_TO_TEXT: 'speech_to_text',

  PAGE_VIEW: 'page_view',
  TAB_SWITCH: 'tab_switch',

  ERROR_OCCURRED: 'error_occurred',
} as const

const generateSessionId = (): string => `session_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`

const getCurrentSessionId = (): string => {
  if (typeof window === 'undefined') return generateSessionId()
  let sessionId = window.localStorage.getItem('mindSnap_sessionId')
  if (!sessionId) {
    sessionId = generateSessionId()
    window.localStorage.setItem('mindSnap_sessionId', sessionId)
  }
  return sessionId
}

// 사용자 활동 로그 저장. 로그인하지 않은(anonymous) 이벤트는 더 이상 기록하지 않는다
// (activity_log 테이블 RLS가 auth.uid() = user_id인 insert만 허용하므로, 실제로도
// 비로그인 상태에서 호출하면 RLS 위반으로 조용히 실패한다).
export const logUserActivity = async (
  userId: string,
  action: string,
  category: string,
  details?: { [key: string]: any }
): Promise<void> => {
  if (!userId || userId === 'anonymous') return

  try {
    const { error } = await supabase.from('activity_log').insert({
      user_id: userId,
      action,
      category,
      details: details || {},
      user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
      session_id: getCurrentSessionId(),
    })
    if (error) throw error
  } catch (error) {
    console.error('Failed to log user activity:', error)
    // 로깅 실패해도 앱 동작에는 영향 없도록 무시한다
  }
}

export const logPageView = async (userId: string, pageName: string, additionalDetails?: any) => {
  if (!userId) return
  await logUserActivity(userId, ACTIVITY_ACTIONS.PAGE_VIEW, ACTIVITY_CATEGORIES.NAVIGATION, {
    page: pageName,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
    referrer: typeof document !== 'undefined' ? document.referrer : undefined,
    ...additionalDetails,
  })
}

export const logError = async (userId: string, error: Error, context?: string) => {
  if (!userId) return
  await logUserActivity(userId, ACTIVITY_ACTIONS.ERROR_OCCURRED, ACTIVITY_CATEGORIES.ERROR, {
    errorMessage: error.message,
    errorStack: error.stack,
    context,
    url: typeof window !== 'undefined' ? window.location.href : undefined,
  })
}

export const logTabSwitch = async (userId: string, fromTab: string, toTab: string) => {
  if (!userId) return
  await logUserActivity(userId, ACTIVITY_ACTIONS.TAB_SWITCH, ACTIVITY_CATEGORIES.NAVIGATION, {
    fromTab,
    toTab,
  })
}
