import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'
import { getAuth } from 'firebase/auth'
import { getStorage } from 'firebase/storage'

// Firebase 환경 변수 확인
const hasFirebaseConfig = process.env.NEXT_PUBLIC_FIREBASE_API_KEY && 
                         process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN && 
                         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

let app: any = null
let db: any = null
let auth: any = null
let storage: any = null

if (hasFirebaseConfig) {
  const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  }

  console.log('Firebase config found:', {
    apiKey: firebaseConfig.apiKey ? '***' + firebaseConfig.apiKey.slice(-4) : 'undefined',
    authDomain: firebaseConfig.authDomain,
    projectId: firebaseConfig.projectId
  })

  try {
    // Initialize Firebase
    app = initializeApp(firebaseConfig)
    console.log('Firebase app initialized successfully')

    // Initialize Firebase services
    db = getFirestore(app)
    auth = getAuth(app)
    storage = getStorage(app)
    
    // Firebase Auth 설정 - 발신자 이메일 설정
    if (auth) {
      auth.settings.appVerificationDisabledForTesting = false
      // 발신자 이메일을 jhc@ylia.io로 설정하려면 Firebase Console에서 설정 필요
      console.log('Firebase Auth initialized with custom settings')
    }
    
    console.log('Firebase services initialized:', { db: !!db, auth: !!auth, storage: !!storage })
  } catch (error) {
    console.error('Firebase initialization error:', error)
  }
} else {
  console.warn('Firebase configuration not found. Some features may not work.')
  console.log('Available env vars:', {
    apiKey: !!process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: !!process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: !!process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  })
}

export { db, auth, storage }
export default app
