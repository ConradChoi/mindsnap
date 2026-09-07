import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { supabase } from './supabase'
import { updateUserNickname } from './supabase-service'
import { logUserActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } from './analytics'

// 인증 상태 관리 (Supabase는 onAuthStateChange로 세션 변화를 알려준다)
export const subscribeToAuthChanges = (callback: (user: SupabaseUser | null) => void) => {
  const { data: listener } = supabase.auth.onAuthStateChange((_event, session: Session | null) => {
    callback(session?.user ?? null)
  })

  // Firebase의 onAuthStateChanged와 동일하게 "unsubscribe 함수"를 반환한다
  return () => listener.subscription.unsubscribe()
}

// 이메일/비밀번호로 로그인
export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    return { user: null, error: error.message }
  }

  await logUserActivity(data.user.id, ACTIVITY_ACTIONS.LOGIN, ACTIVITY_CATEGORIES.AUTH, {
    email,
    loginMethod: 'email_password',
  })

  return { user: data.user, error: null }
}

// 이메일/비밀번호로 회원가입
export const signUpWithEmail = async (email: string, password: string) => {
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login?verified=true` : undefined

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectTo },
  })

  if (error) {
    return { user: null, error: error.message }
  }

  // profiles row는 DB 트리거(on_auth_user_created)가 자동 생성한다.
  // 이메일 확인이 필요한 프로젝트 설정이면 이 시점에는 아직 세션이 없을 수 있어
  // 활동 로그는 best-effort로만 남긴다.
  if (data.user) {
    await logUserActivity(data.user.id, ACTIVITY_ACTIONS.REGISTER, ACTIVITY_CATEGORIES.AUTH, {
      email,
      registrationMethod: 'email_password',
    })
  }

  return { user: data.user, error: null }
}

// 비밀번호 재설정 이메일 발송
// Supabase는 이메일 존재 여부와 무관하게 항상 성공 응답을 준다(계정 존재 여부 노출 방지).
export const sendPasswordReset = async (email: string) => {
  try {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login?reset=true` : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return { error: error.message }
    return { error: null }
  } catch (error: any) {
    console.error('Error sending password reset email:', error)
    return { error: error.message }
  }
}

// 로그아웃
export const signOutUser = async () => {
  try {
    const { data } = await supabase.auth.getUser()
    const user = data.user

    const { error } = await supabase.auth.signOut()
    if (error) return { error: error.message }

    if (user) {
      await logUserActivity(user.id, ACTIVITY_ACTIONS.LOGOUT, ACTIVITY_CATEGORIES.AUTH, { email: user.email })
    }

    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

// 현재 사용자 가져오기 (Supabase는 세션 조회가 비동기라 Firebase와 달리 Promise를 반환한다)
export const getCurrentUser = async (): Promise<SupabaseUser | null> => {
  const { data } = await supabase.auth.getUser()
  return data.user
}

export const isUserAuthenticated = async (): Promise<boolean> => {
  return !!(await getCurrentUser())
}

// 이메일 찾기 기능은 Supabase 구조상 안전하게 구현할 수 없어 비활성화한다.
// (RLS로 보호되는 anon 클라이언트에서 "이 이메일이 가입되어 있는가"를 조회하는 것 자체가
//  계정 존재 여부를 노출하는 이메일 enumeration 취약점이 되기 때문. 기존 Firebase 구현도
//  브라우저에 인증번호를 그대로 표시하는 방식이라 실질적인 보안 기능은 아니었음.)
// 대안: "비밀번호 찾기"만 지원한다 (sendPasswordReset은 계정 존재 여부를 노출하지 않는다).
export const checkEmailExists = async (_email: string): Promise<boolean> => {
  return false
}

export const sendVerificationEmail = async (_email: string) => {
  return {
    success: false,
    error: '이메일 찾기 기능은 보안상 지원되지 않습니다. 비밀번호 찾기를 이용해주세요.',
    verificationCode: null as string | null,
  }
}

export const generateVerificationCode = () => Math.floor(100000 + Math.random() * 900000).toString()

export const verifyCode = (inputCode: string, storedCode: string) => inputCode === storedCode

// 비밀번호 업데이트 (현재 비밀번호 재검증 후 변경)
export const updatePassword = async (currentPassword: string, newPassword: string) => {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user || !user.email) {
      throw new Error('사용자 정보를 찾을 수 없습니다.')
    }

    // 현재 비밀번호 재검증 (Firebase의 reauthenticateWithCredential에 대응)
    const { error: reauthError } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    })
    if (reauthError) {
      return { error: '현재 비밀번호가 올바르지 않습니다.' }
    }

    const { error: updateError } = await supabase.auth.updateUser({ password: newPassword })
    if (updateError) {
      await logUserActivity(user.id, ACTIVITY_ACTIONS.CHANGE_PASSWORD, ACTIVITY_CATEGORIES.SETTINGS, {
        email: user.email,
        success: false,
        error: updateError.message,
      })
      return { error: updateError.message || '비밀번호 변경 중 오류가 발생했습니다.' }
    }

    await logUserActivity(user.id, ACTIVITY_ACTIONS.CHANGE_PASSWORD, ACTIVITY_CATEGORIES.SETTINGS, {
      email: user.email,
      success: true,
    })

    return { error: null }
  } catch (error: any) {
    console.error('비밀번호 업데이트 오류:', error)
    return { error: error.message || '비밀번호 변경 중 오류가 발생했습니다.' }
  }
}

// 프로필(닉네임) 업데이트
export const updateProfile = async (profileData: { displayName?: string; photoURL?: string }) => {
  try {
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user
    if (!user) {
      throw new Error('사용자 정보를 찾을 수 없습니다.')
    }

    // Supabase Auth의 user_metadata에도 반영 (세션에서 바로 읽을 수 있도록)
    const { error: authError } = await supabase.auth.updateUser({
      data: { display_name: profileData.displayName },
    })
    if (authError) throw authError

    if (profileData.displayName) {
      const result = await updateUserNickname(user.id, profileData.displayName)
      if (!result.success) {
        console.error('닉네임 업데이트 실패:', result.error)
      }

      await logUserActivity(user.id, ACTIVITY_ACTIONS.CHANGE_NICKNAME, ACTIVITY_CATEGORIES.SETTINGS, {
        email: user.email,
        newNickname: profileData.displayName,
        success: result.success,
      })
    }

    await logUserActivity(user.id, ACTIVITY_ACTIONS.EDIT_PROFILE, ACTIVITY_CATEGORIES.SETTINGS, {
      email: user.email,
      updatedFields: Object.keys(profileData),
      success: true,
    })

    return { error: null }
  } catch (error: any) {
    console.error('프로필 업데이트 오류:', error)
    return { error: error.message }
  }
}
