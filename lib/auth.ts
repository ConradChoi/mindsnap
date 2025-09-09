import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  deleteUser,
  updatePassword as firebaseUpdatePassword,
  updateProfile as firebaseUpdateProfile,
  reauthenticateWithCredential,
  EmailAuthProvider,
  User as FirebaseUser
} from 'firebase/auth'
import { auth } from './firebase'
import { createUser, getUser } from './firebase-service'
import { logUserActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } from './analytics'

// Firebase 연결 상태 확인
const checkFirebaseConnection = () => {
  if (!auth) {
    throw new Error('Firebase is not configured. Please check your environment variables.')
  }
}

// 인증 상태 관리
export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
  checkFirebaseConnection()
  return onAuthStateChanged(auth, callback)
}

// 이메일/비밀번호로 로그인
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    
    // 로그인 성공 로깅
    await logUserActivity(
      userCredential.user.uid,
      ACTIVITY_ACTIONS.LOGIN,
      ACTIVITY_CATEGORIES.AUTH,
      {
        email: email,
        loginMethod: 'email_password',
        timestamp: new Date().toISOString()
      }
    )
    
    return { user: userCredential.user, error: null }
  } catch (error: any) {
    // 로그인 실패 로깅 (사용자 ID가 없으므로 이메일로 로깅)
    await logUserActivity(
      'anonymous',
      ACTIVITY_ACTIONS.LOGIN,
      ACTIVITY_CATEGORIES.AUTH,
      {
        email: email,
        loginMethod: 'email_password',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    )
    
    return { user: null, error: error.message }
  }
}

// 이메일/비밀번호로 회원가입
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // 이메일 인증 메일 발송 (커스텀 설정)
    await sendEmailVerification(userCredential.user, {
      // Firebase Console에서 설정한 발신자 정보 사용
      // 발신자 이메일: jhc@ylia.io
      // 발신자명: MindSnap
      url: `${window.location.origin}/login?verified=true`,
      handleCodeInApp: true,
    })
    
    // 사용자 정보를 Firestore에 저장
    await createUser({
      email: userCredential.user.email!,
      name: null,
      image: null,
    })
    
    // 회원가입 성공 로깅
    await logUserActivity(
      userCredential.user.uid,
      ACTIVITY_ACTIONS.REGISTER,
      ACTIVITY_CATEGORIES.AUTH,
      {
        email: email,
        registrationMethod: 'email_password',
        emailVerified: false,
        timestamp: new Date().toISOString()
      }
    )
    
    return { user: userCredential.user, error: null }
  } catch (error: any) {
    // 회원가입 실패 로깅
    await logUserActivity(
      'anonymous',
      ACTIVITY_ACTIONS.REGISTER,
      ACTIVITY_CATEGORIES.AUTH,
      {
        email: email,
        registrationMethod: 'email_password',
        success: false,
        error: error.message,
        timestamp: new Date().toISOString()
      }
    )
    
    return { user: null, error: error.message }
  }
}

// 비밀번호 재설정 이메일 발송
export const sendPasswordReset = async (email: string) => {
  try {
    if (!auth) {
      throw new Error('Firebase is not configured')
    }
    
    console.log('Sending password reset email to:', email)
    
    // Firebase Auth를 통해 비밀번호 재설정 이메일 발송
    await sendPasswordResetEmail(auth, email, {
      url: `${window.location.origin}/login?reset=true`,
      handleCodeInApp: true,
    })
    
    console.log('Password reset email sent successfully')
    return { error: null }
  } catch (error: any) {
    console.error('Error sending password reset email:', error)
    return { error: error.message }
  }
}

// 로그아웃
export const signOutUser = async () => {
  try {
    const user = auth.currentUser
    const userId = user?.uid
    
    await signOut(auth)
    
    // 로그아웃 로깅
    if (userId) {
      await logUserActivity(
        userId,
        ACTIVITY_ACTIONS.LOGOUT,
        ACTIVITY_CATEGORIES.AUTH,
        {
          email: user?.email,
          timestamp: new Date().toISOString()
        }
      )
    }
    
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

// 현재 사용자 가져오기
export const getCurrentUser = () => {
  return auth.currentUser
}

// 사용자 인증 상태 확인
export const isUserAuthenticated = () => {
  return !!auth.currentUser
}

// 이메일 찾기 - 가입된 이메일인지 확인
export const checkEmailExists = async (email: string) => {
  try {
    console.log('checkEmailExists called with email:', email)
    console.log('Firebase auth object:', auth)
    
    if (!auth) {
      console.error('Firebase auth is not available')
      throw new Error('Firebase is not configured')
    }
    
    // 방법 1: fetchSignInMethodsForEmail 사용
    try {
      const methods = await fetchSignInMethodsForEmail(auth, email)
      console.log('Sign-in methods found:', methods)
      if (methods.length > 0) {
        return true
      }
    } catch (fetchError) {
      console.log('fetchSignInMethodsForEmail failed, trying alternative method:', fetchError)
    }
    
    // 방법 2: Firestore에서 사용자 확인 (백업 방법)
    try {
      const { getUserByEmail } = await import('./firebase-service')
      const user = await getUserByEmail(email)
      console.log('User found in Firestore:', user)
      return !!user
    } catch (firestoreError) {
      console.log('Firestore check failed:', firestoreError)
    }
    
    // 방법 3: Firestore에서 사용자 확인 (가장 안정적)
    try {
      const { getUserByEmail } = await import('./firebase-service')
      const user = await getUserByEmail(email)
      console.log('User found in Firestore (method 3):', user)
      return !!user
    } catch (firestoreError) {
      console.log('Firestore check failed (method 3):', firestoreError)
      return false
    }
    
  } catch (error) {
    console.error('Error checking email existence:', error)
    return false
  }
}

// 이메일 찾기용 인증 이메일 전송 (임시 해결책)
export const sendVerificationEmail = async (email: string) => {
  try {
    if (!auth) {
      throw new Error('Firebase is not configured')
    }
    
    console.log('Sending verification email to:', email)
    
    // TODO: 실제 서버에서 이메일 발송 필요
    // 현재는 개발용으로 인증번호를 반환하여 화면에 표시
    
    // 6자리 인증번호 생성
    const verificationCode = generateVerificationCode()
    
    // 개발용: 실제로는 서버에서 이메일 발송
    console.log('이메일 찾기 - 인증번호:', verificationCode)
    
    // 인증번호를 반환하여 모달에서 표시
    return { 
      success: true, 
      error: null, 
      verificationCode: verificationCode 
    }
  } catch (error: any) {
    console.error('Error sending verification email:', error)
    return { success: false, error: error.message, verificationCode: null }
  }
}

// 인증번호 생성 및 저장 (실제로는 서버에서 처리해야 함)
export const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// 인증번호 검증 (실제로는 서버에서 처리해야 함)
export const verifyCode = (inputCode: string, storedCode: string) => {
  return inputCode === storedCode
}

// 비밀번호 업데이트
export const updatePassword = async (currentPassword: string, newPassword: string) => {
  try {
    checkFirebaseConnection()
    
    const user = auth.currentUser
    if (!user) {
      throw new Error('사용자 정보를 찾을 수 없습니다.')
    }

    if (!user.email) {
      throw new Error('사용자 이메일 정보를 찾을 수 없습니다.')
    }

    console.log('Attempting to reauthenticate user:', user.email)

    // 현재 사용자 재인증
    const credential = EmailAuthProvider.credential(user.email, currentPassword)
    console.log('Credential created, attempting reauthentication...')
    
    await reauthenticateWithCredential(user, credential)
    console.log('Reauthentication successful')

    // 비밀번호 업데이트
    console.log('Updating password...')
    await firebaseUpdatePassword(user, newPassword)
    console.log('Password updated successfully')
    
    // 비밀번호 변경 성공 로깅
    await logUserActivity(
      user.uid,
      ACTIVITY_ACTIONS.CHANGE_PASSWORD,
      ACTIVITY_CATEGORIES.SETTINGS,
      {
        email: user.email,
        success: true,
        timestamp: new Date().toISOString()
      }
    )
    
    return { error: null }
  } catch (error: any) {
    console.error('비밀번호 업데이트 오류:', error)
    
    // 비밀번호 변경 실패 로깅
    const user = auth.currentUser
    if (user) {
      await logUserActivity(
        user.uid,
        ACTIVITY_ACTIONS.CHANGE_PASSWORD,
        ACTIVITY_CATEGORIES.SETTINGS,
        {
          email: user.email,
          success: false,
          error: error.message,
          errorCode: error.code,
          timestamp: new Date().toISOString()
        }
      )
    }
    
    // 더 구체적인 에러 메시지 제공
    if (error.code === 'auth/invalid-credential') {
      return { error: '현재 비밀번호가 올바르지 않습니다.' }
    } else if (error.code === 'auth/weak-password') {
      return { error: '새 비밀번호가 너무 약합니다.' }
    } else if (error.code === 'auth/requires-recent-login') {
      return { error: '보안을 위해 다시 로그인해주세요.' }
    } else {
      return { error: error.message || '비밀번호 변경 중 오류가 발생했습니다.' }
    }
  }
}

// 프로필 업데이트
export const updateProfile = async (profileData: { displayName?: string; photoURL?: string }) => {
  try {
    checkFirebaseConnection()
    
    const user = auth.currentUser
    if (!user) {
      throw new Error('사용자 정보를 찾을 수 없습니다.')
    }

    // Firebase Auth 프로필 업데이트
    await firebaseUpdateProfile(user, profileData)
    
    // 닉네임이 변경된 경우 Firestore에도 업데이트
    if (profileData.displayName) {
      const { updateUserNickname } = await import('./firebase-service')
      const result = await updateUserNickname(user.uid, profileData.displayName)
      if (!result.success) {
        console.error('Firestore 닉네임 업데이트 실패:', result.error)
      }
      
      // 닉네임 변경 로깅
      await logUserActivity(
        user.uid,
        ACTIVITY_ACTIONS.CHANGE_NICKNAME,
        ACTIVITY_CATEGORIES.SETTINGS,
        {
          email: user.email,
          oldNickname: user.displayName,
          newNickname: profileData.displayName,
          success: result.success,
          timestamp: new Date().toISOString()
        }
      )
    }
    
    // 프로필 업데이트 성공 로깅
    await logUserActivity(
      user.uid,
      ACTIVITY_ACTIONS.EDIT_PROFILE,
      ACTIVITY_CATEGORIES.SETTINGS,
      {
        email: user.email,
        updatedFields: Object.keys(profileData),
        success: true,
        timestamp: new Date().toISOString()
      }
    )
    
    return { error: null }
  } catch (error: any) {
    console.error('프로필 업데이트 오류:', error)
    
    // 프로필 업데이트 실패 로깅
    const user = auth.currentUser
    if (user) {
      await logUserActivity(
        user.uid,
        ACTIVITY_ACTIONS.EDIT_PROFILE,
        ACTIVITY_CATEGORIES.SETTINGS,
        {
          email: user.email,
          success: false,
          error: error.message,
          timestamp: new Date().toISOString()
        }
      )
    }
    
    return { error: error.message }
  }
}
