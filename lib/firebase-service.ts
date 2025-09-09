import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp,
  onSnapshot,
  Unsubscribe
} from 'firebase/firestore'
import { db } from './firebase'
import { User, Snap, MoodRecord, PersonalityTest, RememberToday } from './types'
import { logUserActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } from './analytics'

// Firebase 연결 상태 확인
const checkFirebaseConnection = () => {
  if (!db) {
    throw new Error('Firebase is not configured. Please check your environment variables.')
  }
}

// User services
export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
  checkFirebaseConnection()
  const docRef = await addDoc(collection(db, 'users'), {
    ...userData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: docRef.id, ...userData }
}

export const getUser = async (userId: string) => {
  const docRef = doc(db, 'users', userId)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as User
  }
  return null
}

// 이메일로 사용자 찾기
export const getUserByEmail = async (email: string) => {
  try {
    checkFirebaseConnection()
    
    const q = query(
      collection(db, 'users'),
      where('email', '==', email),
      limit(1)
    )
    
    const querySnapshot = await getDocs(q)
    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0]
      return { id: doc.id, ...doc.data() } as User
    }
    return null
  } catch (error) {
    console.error('Error getting user by email:', error)
    return null
  }
}

export const updateUser = async (userId: string, userData: Partial<User>) => {
  const docRef = doc(db, 'users', userId)
  await updateDoc(docRef, {
    ...userData,
    updatedAt: serverTimestamp(),
  })
}

// Snap services
export const createSnap = async (snapData: Omit<Snap, 'id' | 'createdAt' | 'updatedAt'>) => {
  // null 값을 가진 필드들을 제거
  const cleanData = Object.fromEntries(
    Object.entries(snapData).filter(([_, value]) => value !== null)
  )
  
  const docRef = await addDoc(collection(db, 'snaps'), {
    ...cleanData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  
  // 스냅 생성 로깅
  await logUserActivity(
    snapData.userId,
    ACTIVITY_ACTIONS.CREATE_SNAP,
    ACTIVITY_CATEGORIES.CAPTURE,
    {
      snapId: docRef.id,
      title: snapData.title,
      hasImage: !!snapData.imageUrl,
      hasAudio: !!snapData.audioUrl,
      hasNote: !!snapData.note,
      noteLength: snapData.note?.length || 0,
      timestamp: new Date().toISOString()
    }
  )
  
  return { id: docRef.id, ...snapData }
}

export const getSnaps = async (userId: string, limitCount = 30) => {
  try {
    // 단순 쿼리로 변경하여 인덱스 에러 방지
    const q = query(
      collection(db, 'snaps'),
      where('userId', '==', userId),
      limit(limitCount)
    )
    const querySnapshot = await getDocs(q)
    const snaps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Snap[]
    
    // 클라이언트에서 정렬
    return snaps.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })
  } catch (error: any) {
    console.error('Error fetching snaps:', error)
    return []
  }
}

export const getSnap = async (snapId: string) => {
  const docRef = doc(db, 'snaps', snapId)
  const docSnap = await getDoc(docRef)
  if (docSnap.exists()) {
    return { id: docSnap.id, ...docSnap.data() } as Snap
  }
  return null
}

export const updateSnap = async (snapId: string, snapData: Partial<Snap>) => {
  const docRef = doc(db, 'snaps', snapId)
  await updateDoc(docRef, {
    ...snapData,
    updatedAt: serverTimestamp(),
  })
}

export const deleteSnap = async (snapId: string) => {
  const docRef = doc(db, 'snaps', snapId)
  await deleteDoc(docRef)
}

// 실시간 리스너 함수들
export const subscribeToSnaps = (
  userId: string, 
  callback: (snaps: Snap[]) => void,
  errorCallback?: (error: any) => void,
  limitCount = 50
): Unsubscribe => {
  try {
    console.log('Setting up snaps subscription for user:', userId)
    
    const q = query(
      collection(db, 'snaps'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    return onSnapshot(q, (querySnapshot) => {
      const snaps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Snap[]
      console.log('Snaps snapshot received:', snaps.length, 'documents')
      callback(snaps)
    }, (error) => {
      if (errorCallback) {
        errorCallback(error)
      }
      console.error('Error in snaps subscription:', error)
      // 인덱스 에러인 경우 단순 쿼리로 재시도
      if (error.code === 'failed-precondition') {
        console.log('Retrying snaps subscription without orderBy')
        const simpleQuery = query(
          collection(db, 'snaps'),
          where('userId', '==', userId),
          limit(limitCount)
        )
        
        return onSnapshot(simpleQuery, (querySnapshot) => {
          const snaps = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Snap[]
          // 클라이언트에서 정렬
          const sortedSnaps = snaps.sort((a, b) => {
            const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
            const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
            return dateB.getTime() - dateA.getTime()
          })
          callback(sortedSnaps)
        }, (retryError) => {
          console.error('Error in retry snaps subscription:', retryError)
          callback([])
        })
      } else {
        // 다른 에러의 경우 빈 배열 반환
        console.log('Non-index error, returning empty array')
        callback([])
      }
    })
  } catch (error) {
    console.error('Error setting up snaps subscription:', error)
    callback([])
    return () => {} // 빈 unsubscribe 함수 반환
  }
}

// Mood Record services
export const createMoodRecord = async (moodData: Omit<MoodRecord, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'moodRecords'), {
    ...moodData,
    createdAt: serverTimestamp(),
  })
  
  // 마음 기록 생성 로깅
  await logUserActivity(
    moodData.userId,
    ACTIVITY_ACTIONS.CREATE_MOOD,
    ACTIVITY_CATEGORIES.JOURNAL,
    {
      moodRecordId: docRef.id,
      mood: moodData.mood,
      noteLength: moodData.note?.length || 0,
      timestamp: new Date().toISOString()
    }
  )
  
  return { id: docRef.id, ...moodData }
}

export const getMoodRecords = async (userId: string, limitCount = 30) => {
  try {
    // 단순 쿼리로 변경하여 인덱스 에러 방지
    const q = query(
      collection(db, 'moodRecords'),
      where('userId', '==', userId),
      limit(limitCount)
    )
    const querySnapshot = await getDocs(q)
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MoodRecord[]
    
    // 클라이언트에서 정렬
    return records.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
    })
  } catch (error: any) {
    console.error('Error fetching mood records:', error)
    return []
  }
}

// Personality Test services
export const createPersonalityTest = async (testData: Omit<PersonalityTest, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'personalityTests'), {
    ...testData,
    createdAt: serverTimestamp(),
  })
  return { id: docRef.id, ...testData }
}

export const getPersonalityTests = async (userId: string) => {
  const q = query(
    collection(db, 'personalityTests'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as PersonalityTest[]
}

// Remember Today services
export const createRememberToday = async (rememberData: Omit<RememberToday, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'rememberToday'), {
    ...rememberData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  
  // 오늘을 기억할래 생성 로깅
  await logUserActivity(
    rememberData.userId,
    ACTIVITY_ACTIONS.CREATE_REMEMBER,
    ACTIVITY_CATEGORIES.JOURNAL,
    {
      rememberId: docRef.id,
      mood: rememberData.mood,
      memorableEvent: rememberData.memorableEvent,
      summaryLength: rememberData.summary?.length || 0,
      hasSelectedDate: !!rememberData.selectedDate,
      withNotification: rememberData.withNotification,
      timestamp: new Date().toISOString()
    }
  )
  
  return { id: docRef.id, ...rememberData }
}

export const getRememberToday = async (userId: string, limitCount = 30) => {
  try {
    // 단순 쿼리로 변경하여 인덱스 에러 방지
    const q = query(
      collection(db, 'rememberToday'),
      where('userId', '==', userId),
      limit(limitCount)
    )
    const querySnapshot = await getDocs(q)
    const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RememberToday[]
    
    // 클라이언트에서 정렬
    return records.sort((a, b) => {
      const dateA = a.createdAt instanceof Date ? a.createdAt : new Date(a.createdAt)
      const dateB = b.createdAt instanceof Date ? b.createdAt : new Date(b.createdAt)
      return dateB.getTime() - dateA.getTime()
      })
  } catch (error: any) {
    console.error('Error fetching remember today records:', error)
    return []
  }
}

export const updateRememberToday = async (rememberTodayId: string, rememberData: Partial<RememberToday>) => {
  const docRef = doc(db, 'rememberToday', rememberTodayId)
  await updateDoc(docRef, {
    ...rememberData,
    updatedAt: serverTimestamp(),
  })
}

export const deleteRememberToday = async (rememberTodayId: string) => {
  const docRef = doc(db, 'rememberToday', rememberTodayId)
  await deleteDoc(docRef)
}

// 마음 기록 실시간 리스너
export const subscribeToMoodRecords = (
  userId: string, 
  callback: (records: MoodRecord[]) => void,
  errorCallback?: (error: any) => void,
  limitCount = 50
): Unsubscribe => {
  try {
    console.log('Setting up mood records subscription for user:', userId)
    
    const q = query(
      collection(db, 'moodRecords'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    return onSnapshot(q, (querySnapshot) => {
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MoodRecord[]
      console.log('Mood records snapshot received:', records.length, 'documents')
      callback(records)
    }, (error) => {
      if (errorCallback) {
        errorCallback(error)
      }
      console.error('Error in mood records subscription:', error)
      // 인덱스 에러인 경우 단순 쿼리로 재시도
      if (error.code === 'failed-precondition') {
        console.log('Retrying mood records subscription without orderBy')
        const simpleQuery = query(
          collection(db, 'moodRecords'),
          where('userId', '==', userId),
          limit(limitCount)
        )
        
        return onSnapshot(simpleQuery, (querySnapshot) => {
          const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MoodRecord[]
          // 클라이언트에서 정렬
          const sortedRecords = records.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
            return dateB.getTime() - dateA.getTime()
          })
          callback(sortedRecords)
        }, (retryError) => {
          console.error('Error in retry mood records subscription:', retryError)
          callback([])
        })
      } else {
        // 다른 에러의 경우 빈 배열 반환
        console.log('Non-index error, returning empty array')
        callback([])
      }
    })
  } catch (error) {
    console.error('Error setting up mood records subscription:', error)
    callback([])
    return () => {} // 빈 unsubscribe 함수 반환
  }
}

// 오늘을 기억할래 실시간 리스너
export const subscribeToRememberToday = (
  userId: string, 
  callback: (records: RememberToday[]) => void,
  errorCallback?: (error: any) => void,
  limitCount = 50
): Unsubscribe => {
  try {
    console.log('Setting up remember today subscription for user:', userId)
    
    const q = query(
      collection(db, 'rememberToday'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    )
    
    return onSnapshot(q, (querySnapshot) => {
      const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RememberToday[]
      console.log('Remember today snapshot received:', records.length, 'documents')
      callback(records)
    }, (error) => {
      if (errorCallback) {
        errorCallback(error)
      }
      console.error('Error in remember today subscription:', error)
      // 인덱스 에러인 경우 단순 쿼리로 재시도
      if (error.code === 'failed-precondition') {
        console.log('Retrying remember today subscription without orderBy')
        const simpleQuery = query(
          collection(db, 'rememberToday'),
          where('userId', '==', userId),
          limit(limitCount)
        )
        
        return onSnapshot(simpleQuery, (querySnapshot) => {
          const records = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RememberToday[]
          // 클라이언트에서 정렬
          const sortedRecords = records.sort((a, b) => {
            const dateA = a.createdAt?.toDate?.() || new Date(a.createdAt)
            const dateB = b.createdAt?.toDate?.() || new Date(b.createdAt)
            return dateB.getTime() - dateA.getTime()
          })
          callback(sortedRecords)
        }, (retryError) => {
          console.error('Error in retry remember today subscription:', retryError)
          callback([])
        })
      } else {
        // 다른 에러의 경우 빈 배열 반환
        console.log('Non-index error, returning empty array')
        callback([])
      }
    })
  } catch (error) {
    console.error('Error setting up remember today subscription:', error)
    callback([])
    return () => {} // 빈 unsubscribe 함수 반환
  }
}

// 닉네임 변경 관련 함수들
export const updateUserNickname = async (userId: string, nickname: string) => {
  try {
    checkFirebaseConnection()
    
    const userRef = doc(db, 'users', userId)
    
    // 사용자 문서가 존재하는지 확인
    const userSnap = await getDoc(userRef)
    
    if (userSnap.exists()) {
      // 문서가 존재하면 업데이트
      await updateDoc(userRef, {
        displayName: nickname,
        lastNicknameChange: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    } else {
      // 문서가 존재하지 않으면 새로 생성
      await setDoc(userRef, {
        displayName: nickname,
        lastNicknameChange: serverTimestamp(),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      })
    }
    
    return { success: true, error: null }
  } catch (error: any) {
    console.error('Error updating user nickname:', error)
    return { success: false, error: error.message }
  }
}

export const canChangeNickname = async (userId: string) => {
  try {
    checkFirebaseConnection()
    
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    
    if (!userSnap.exists()) {
      return { canChange: true, lastChangeDate: null, error: null }
    }
    
    const userData = userSnap.data()
    const lastNicknameChange = userData.lastNicknameChange
    
    if (!lastNicknameChange) {
      return { canChange: true, lastChangeDate: null, error: null }
    }
    
    // 마지막 변경일로부터 30일이 지났는지 확인
    const lastChangeDate = lastNicknameChange instanceof Date ? lastNicknameChange : new Date(lastNicknameChange)
    const now = new Date()
    const daysSinceLastChange = Math.floor((now.getTime() - lastChangeDate.getTime()) / (1000 * 60 * 60 * 24))
    
    return { 
      canChange: daysSinceLastChange >= 30, 
      lastChangeDate: lastChangeDate,
      daysRemaining: Math.max(0, 30 - daysSinceLastChange),
      error: null 
    }
  } catch (error: any) {
    console.error('Error checking nickname change eligibility:', error)
    return { canChange: false, lastChangeDate: null, error: error.message }
  }
}
