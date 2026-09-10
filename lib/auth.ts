import type { Session, User as SupabaseUser } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { supabase } from './supabase'
import { updateUserNickname } from './supabase-service'
import { logUserActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } from './analytics'

// 네이티브 앱(Capacitor) 소셜 로그인 완료 후 시스템 브라우저가 돌아오는 커스텀 URL 스킴.
// Supabase 대시보드(Authentication > URL Configuration > Redirect URLs)에 동일한 값이
// 등록되어 있어야 한다.
const NATIVE_AUTH_REDIRECT_URL = 'io.ylia.mindsnap://auth-callback'

// Supabase Auth 에러 메시지를 한글 안내 문구로 변환한다.
// Supabase가 반환하는 원문 메시지는 영어 고정이라(버전에 따라 표현이 조금씩 다를 수 있어
// 정확히 일치하는 문자열보다는 핵심 키워드로 매칭한다), 화면에는 이 함수를 거친 값만 노출한다.
const translateAuthError = (error: { message?: string } | null | undefined): string => {
  const original = error?.message ?? ''

  // 이미 한글 메시지(우리 코드에서 throw한 Error 등)라면 그대로 둔다 —
  // 안 그러면 알려진 패턴에 안 걸릴 때 아래 기본 문구로 덮어써서 오히려 정보가 사라진다.
  if (/[가-힣]/.test(original)) {
    return original
  }

  const message = original.toLowerCase()

  if (message.includes('invalid login credentials')) {
    return '이메일 또는 비밀번호가 올바르지 않습니다.'
  }
  if (message.includes('email rate limit') || message.includes('over_email_send_rate_limit')) {
    return '이메일 발송 요청이 너무 많습니다. 잠시 후 다시 시도해주세요.'
  }
  if (message.includes('for security purposes') && message.includes('seconds')) {
    return '보안을 위해 잠시 후 다시 시도해주세요.'
  }
  if (message.includes('user already registered') || message.includes('already registered')) {
    return '이미 가입된 이메일입니다.'
  }
  if (message.includes('email not confirmed')) {
    return '이메일 인증이 완료되지 않았습니다. 메일함을 확인해주세요.'
  }
  if (message.includes('password should be at least')) {
    return '비밀번호는 최소 6자 이상이어야 합니다.'
  }
  if (message.includes('unable to validate email address') || message.includes('invalid email')) {
    return '올바른 이메일 형식이 아닙니다.'
  }
  if (message.includes('new password should be different')) {
    return '새 비밀번호는 이전 비밀번호와 달라야 합니다.'
  }
  if (message.includes('network') || message.includes('fetch failed')) {
    return '네트워크 연결을 확인해주세요.'
  }

  return '요청 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.'
}

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
    return { user: null, error: translateAuthError(error) }
  }

  await logUserActivity(data.user.id, ACTIVITY_ACTIONS.LOGIN, ACTIVITY_CATEGORIES.AUTH, {
    email,
    loginMethod: 'email_password',
  })

  return { user: data.user, error: null }
}

// SNS(OAuth) 로그인/회원가입 — Google/Apple/Kakao 공통.
// Supabase가 세 provider 모두 기본 지원하지만, 각 플랫폼(Google Cloud Console / Apple Developer /
// Kakao Developers)에서 앱을 등록하고 발급받은 키를 Supabase 대시보드(Authentication > Providers)에
// 연결해야 실제로 동작한다. 코드는 그 등록 여부와 무관하게 미리 준비해두는 것.
// 리다이렉트 방식이라 여기서 로그인 성공 여부를 바로 알 수 없다 — 세션 발급은 페이지 복귀 후
// AuthContext의 onAuthStateChange(subscribeToAuthChanges)가 처리한다.
export type SocialProvider = 'google' | 'apple' | 'kakao'

export const signInWithProvider = async (provider: SocialProvider) => {
  // 네이티브 앱: Google이 임베디드 웹뷰 내 OAuth 로그인을 정책상 차단하기 때문에(Apple도 동일하게
  // 권장), Capacitor WebView 안에서 바로 리다이렉트하지 않고 시스템 브라우저(SFSafariViewController/
  // Custom Tabs)를 띄운다. 로그인 완료 후에는 커스텀 URL 스킴 딥링크로 앱에 돌아오고,
  // handleNativeAuthDeepLink()가 code를 세션으로 교환한다.
  if (Capacitor.isNativePlatform()) {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: NATIVE_AUTH_REDIRECT_URL,
        skipBrowserRedirect: true,
      },
    })

    if (error || !data.url) {
      return { error: translateAuthError(error) }
    }

    await Browser.open({ url: data.url, presentationStyle: 'popover' })
    return { error: null }
  }

  // 웹: 기존과 동일하게 현재 페이지 자체가 리다이렉트된다.
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined

  const { error } = await supabase.auth.signInWithOAuth({
    provider,
    options: { redirectTo },
  })

  if (error) {
    return { error: translateAuthError(error) }
  }

  return { error: null }
}

// 네이티브 앱에서 소셜 로그인 완료 후 돌아온 딥링크(io.ylia.mindsnap://auth-callback?code=...)를
// 처리한다. AuthContext가 @capacitor/app의 appUrlOpen 이벤트에서 호출한다.
// 반환값은 "이 URL이 우리 딥링크였는지" 여부 — appUrlOpen은 다른 목적의 딥링크에도 발생할 수 있어
// 호출부에서 이 값으로 추가 처리(예: 다른 라우팅) 여부를 판단할 수 있게 한다.
export const handleNativeAuthDeepLink = async (url: string): Promise<boolean> => {
  if (!url.startsWith(NATIVE_AUTH_REDIRECT_URL)) {
    return false
  }

  try {
    const code = new URL(url).searchParams.get('code')
    if (!code) {
      console.warn('네이티브 로그인 딥링크에 code 파라미터가 없습니다:', url)
      return true
    }

    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error) {
      console.error('네이티브 로그인 세션 교환 실패:', translateAuthError(error))
    }
  } catch (error) {
    console.error('네이티브 로그인 딥링크 처리 중 오류:', error)
  } finally {
    // 시스템 브라우저(SFSafariViewController/Custom Tabs)가 열려 있었다면 닫는다.
    // 이미 닫혀 있는 경우(사용자가 직접 닫음)에도 에러 없이 무시된다.
    await Browser.close().catch(() => undefined)
  }

  return true
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
    return { user: null, session: null, error: translateAuthError(error) }
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

  // Supabase 프로젝트의 "Confirm email"이 꺼져 있으면 signUp 시점에 session이 바로 발급된다
  // (이메일 인증 없이 즉시 로그인 상태). 켜져 있으면 session이 null이라 인증 메일을 눌러야 한다.
  // 화면에서는 이 값을 보고 "인증 메일을 확인하라"는 안내를 보여줄지 결정한다.
  return { user: data.user, session: data.session, error: null }
}

// 비밀번호 재설정 이메일 발송
// Supabase는 이메일 존재 여부와 무관하게 항상 성공 응답을 준다(계정 존재 여부 노출 방지).
export const sendPasswordReset = async (email: string) => {
  try {
    const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/login?reset=true` : undefined
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })
    if (error) return { error: translateAuthError(error) }
    return { error: null }
  } catch (error: any) {
    console.error('Error sending password reset email:', error)
    return { error: translateAuthError(error) }
  }
}

// 로그아웃
export const signOutUser = async () => {
  try {
    const { data } = await supabase.auth.getUser()
    const user = data.user

    // activity_log에 로그는 반드시 signOut 전에 남겨야 한다. RLS 정책(activity_log_insert_own)이
    // "본인 인증된 사용자만 insert 가능"이라, signOut 이후에는 세션이 이미 사라져서
    // 이 insert가 항상 RLS 위반으로 실패한다.
    if (user) {
      await logUserActivity(user.id, ACTIVITY_ACTIONS.LOGOUT, ACTIVITY_CATEGORIES.AUTH, { email: user.email })
    }

    const { error } = await supabase.auth.signOut()
    if (error) return { error: translateAuthError(error) }

    return { error: null }
  } catch (error: any) {
    return { error: translateAuthError(error) }
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
      return { error: translateAuthError(updateError) }
    }

    await logUserActivity(user.id, ACTIVITY_ACTIONS.CHANGE_PASSWORD, ACTIVITY_CATEGORIES.SETTINGS, {
      email: user.email,
      success: true,
    })

    return { error: null }
  } catch (error: any) {
    console.error('비밀번호 업데이트 오류:', error)
    return { error: error.message ? translateAuthError(error) : '비밀번호 변경 중 오류가 발생했습니다.' }
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
    return { error: translateAuthError(error) }
  }
}
