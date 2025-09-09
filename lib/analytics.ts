import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from './firebase'

// 사용자 활동 타입 정의
export interface UserActivity {
  id?: string
  userId: string
  action: string // 'login', 'logout', 'create_snap', 'create_mood', 'create_remember', 'delete_item', 'edit_profile', etc.
  category: string // 'auth', 'journal', 'settings', 'capture', etc.
  details?: {
    [key: string]: any
  }
  timestamp: any
  userAgent?: string
  ipAddress?: string
  sessionId?: string
}

// 활동 카테고리 정의
export const ACTIVITY_CATEGORIES = {
  AUTH: 'auth',
  JOURNAL: 'journal', 
  SETTINGS: 'settings',
  CAPTURE: 'capture',
  NAVIGATION: 'navigation',
  ERROR: 'error'
} as const

// 활동 액션 정의
export const ACTIVITY_ACTIONS = {
  // 인증 관련
  LOGIN: 'login',
  LOGOUT: 'logout',
  REGISTER: 'register',
  EMAIL_VERIFICATION: 'email_verification',
  PASSWORD_RESET: 'password_reset',
  
  // 저널 관련
  CREATE_SNAP: 'create_snap',
  CREATE_MOOD: 'create_mood',
  CREATE_REMEMBER: 'create_remember',
  DELETE_SNAP: 'delete_snap',
  DELETE_MOOD: 'delete_mood',
  DELETE_REMEMBER: 'delete_remember',
  RESTORE_ITEM: 'restore_item',
  VIEW_JOURNAL: 'view_journal',
  
  // 설정 관련
  EDIT_PROFILE: 'edit_profile',
  CHANGE_PASSWORD: 'change_password',
  CHANGE_NICKNAME: 'change_nickname',
  UPDATE_SETTINGS: 'update_settings',
  
  // 캡처 관련
  START_RECORDING: 'start_recording',
  STOP_RECORDING: 'stop_recording',
  UPLOAD_IMAGE: 'upload_image',
  SPEECH_TO_TEXT: 'speech_to_text',
  
  // 네비게이션
  PAGE_VIEW: 'page_view',
  TAB_SWITCH: 'tab_switch',
  
  // 오류
  ERROR_OCCURRED: 'error_occurred'
} as const

// 세션 ID 생성
const generateSessionId = (): string => {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// 현재 세션 ID 가져오기 (localStorage에서)
const getCurrentSessionId = (): string => {
  let sessionId = localStorage.getItem('mindSnap_sessionId')
  if (!sessionId) {
    sessionId = generateSessionId()
    localStorage.setItem('mindSnap_sessionId', sessionId)
  }
  return sessionId
}

// 사용자 활동 로그 저장
export const logUserActivity = async (
  userId: string,
  action: string,
  category: string,
  details?: { [key: string]: any }
): Promise<void> => {
  try {
    const activity: Omit<UserActivity, 'id'> = {
      userId,
      action,
      category,
      details: details || {},
      timestamp: serverTimestamp(),
      userAgent: navigator.userAgent,
      sessionId: getCurrentSessionId()
    }

    await addDoc(collection(db, 'userActivities'), activity)
    console.log('User activity logged:', { action, category, details })
  } catch (error) {
    console.error('Failed to log user activity:', error)
    // 로깅 실패해도 앱 동작에는 영향 없도록
  }
}

// 사용자 활동 로그 조회
export const getUserActivities = async (
  userId: string,
  limitCount: number = 100
): Promise<UserActivity[]> => {
  try {
    const q = query(
      collection(db, 'userActivities'),
      where('userId', '==', userId),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    const activities: UserActivity[] = []
    
    querySnapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data()
      } as UserActivity)
    })
    
    return activities
  } catch (error) {
    console.error('Failed to fetch user activities:', error)
    return []
  }
}

// 특정 기간의 활동 로그 조회
export const getUserActivitiesByDateRange = async (
  userId: string,
  startDate: Date,
  endDate: Date,
  limitCount: number = 100
): Promise<UserActivity[]> => {
  try {
    const q = query(
      collection(db, 'userActivities'),
      where('userId', '==', userId),
      where('timestamp', '>=', startDate),
      where('timestamp', '<=', endDate),
      orderBy('timestamp', 'desc'),
      limit(limitCount)
    )
    
    const querySnapshot = await getDocs(q)
    const activities: UserActivity[] = []
    
    querySnapshot.forEach((doc) => {
      activities.push({
        id: doc.id,
        ...doc.data()
      } as UserActivity)
    })
    
    return activities
  } catch (error) {
    console.error('Failed to fetch user activities by date range:', error)
    return []
  }
}

// 활동 통계 조회
export const getActivityStats = async (userId: string): Promise<{
  totalActivities: number
  activitiesByCategory: { [category: string]: number }
  activitiesByAction: { [action: string]: number }
  lastActivityDate?: Date
}> => {
  try {
    const activities = await getUserActivities(userId, 1000) // 최근 1000개 활동
    
    const stats = {
      totalActivities: activities.length,
      activitiesByCategory: {} as { [category: string]: number },
      activitiesByAction: {} as { [action: string]: number },
      lastActivityDate: activities.length > 0 ? activities[0].timestamp?.toDate() : undefined
    }
    
    activities.forEach(activity => {
      // 카테고리별 통계
      stats.activitiesByCategory[activity.category] = 
        (stats.activitiesByCategory[activity.category] || 0) + 1
      
      // 액션별 통계
      stats.activitiesByAction[activity.action] = 
        (stats.activitiesByAction[activity.action] || 0) + 1
    })
    
    return stats
  } catch (error) {
    console.error('Failed to get activity stats:', error)
    return {
      totalActivities: 0,
      activitiesByCategory: {},
      activitiesByAction: {}
    }
  }
}

// React Hook for user activity logging
export const useUserActivity = () => {
  const logActivity = async (
    action: string,
    category: string,
    details?: { [key: string]: any }
  ) => {
    // 현재 사용자 ID 가져오기 (AuthContext에서)
    const user = JSON.parse(localStorage.getItem('user') || 'null')
    if (user?.uid) {
      await logUserActivity(user.uid, action, category, details)
    }
  }

  return { logActivity }
}

// 자동 로깅을 위한 유틸리티 함수들
export const logPageView = async (userId: string, pageName: string, additionalDetails?: any) => {
  await logUserActivity(
    userId,
    ACTIVITY_ACTIONS.PAGE_VIEW,
    ACTIVITY_CATEGORIES.NAVIGATION,
    {
      page: pageName,
      url: window.location.href,
      referrer: document.referrer,
      ...additionalDetails
    }
  )
}

export const logError = async (userId: string, error: Error, context?: string) => {
  await logUserActivity(
    userId,
    ACTIVITY_ACTIONS.ERROR_OCCURRED,
    ACTIVITY_CATEGORIES.ERROR,
    {
      errorMessage: error.message,
      errorStack: error.stack,
      context,
      url: window.location.href
    }
  )
}

export const logTabSwitch = async (userId: string, fromTab: string, toTab: string) => {
  await logUserActivity(
    userId,
    ACTIVITY_ACTIONS.TAB_SWITCH,
    ACTIVITY_CATEGORIES.NAVIGATION,
    {
      fromTab,
      toTab
    }
  )
}
