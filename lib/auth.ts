import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  fetchSignInMethodsForEmail,
  User as FirebaseUser
} from 'firebase/auth'
import { auth } from './firebase'
import { createUser, getUser } from './firebase-service'

// 인증 상태 관리
export const subscribeToAuthChanges = (callback: (user: FirebaseUser | null) => void) => {
  return onAuthStateChanged(auth, callback)
}

// 이메일/비밀번호로 로그인
export const signInWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password)
    return { user: userCredential.user, error: null }
  } catch (error: any) {
    return { user: null, error: error.message }
  }
}

// 이메일/비밀번호로 회원가입
export const signUpWithEmail = async (email: string, password: string) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password)
    
    // 이메일 인증 메일 발송
    await sendEmailVerification(userCredential.user)
    
    // 사용자 정보를 Firestore에 저장
    await createUser({
      email: userCredential.user.email!,
      name: null,
      image: null,
    })
    
    return { user: userCredential.user, error: null }
  } catch (error: any) {
    return { user: null, error: error.message }
  }
}

// 비밀번호 재설정 이메일 발송
export const sendPasswordReset = async (email: string) => {
  try {
    await sendPasswordResetEmail(auth, email)
    return { error: null }
  } catch (error: any) {
    return { error: error.message }
  }
}

// 로그아웃
export const signOutUser = async () => {
  try {
    await signOut(auth)
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
    // Firebase Auth에서 이메일 존재 여부 확인
    const methods = await fetchSignInMethodsForEmail(auth, email)
    return methods.length > 0
  } catch (error) {
    console.error('Error checking email existence:', error)
    return false
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
