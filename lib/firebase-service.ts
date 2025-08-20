import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  limit,
  serverTimestamp 
} from 'firebase/firestore'
import { db } from './firebase'
import { User, Snap, MoodRecord, PersonalityTest, RememberToday } from './types'

// User services
export const createUser = async (userData: Omit<User, 'id' | 'createdAt' | 'updatedAt'>) => {
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

export const updateUser = async (userId: string, userData: Partial<User>) => {
  const docRef = doc(db, 'users', userId)
  await updateDoc(docRef, {
    ...userData,
    updatedAt: serverTimestamp(),
  })
}

// Snap services
export const createSnap = async (snapData: Omit<Snap, 'id' | 'createdAt' | 'updatedAt'>) => {
  const docRef = await addDoc(collection(db, 'snaps'), {
    ...snapData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })
  return { id: docRef.id, ...snapData }
}

export const getSnaps = async (userId: string, limitCount = 30) => {
  const q = query(
    collection(db, 'snaps'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Snap[]
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

// Mood Record services
export const createMoodRecord = async (moodData: Omit<MoodRecord, 'id' | 'createdAt'>) => {
  const docRef = await addDoc(collection(db, 'moodRecords'), {
    ...moodData,
    createdAt: serverTimestamp(),
  })
  return { id: docRef.id, ...moodData }
}

export const getMoodRecords = async (userId: string, limitCount = 30) => {
  const q = query(
    collection(db, 'moodRecords'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as MoodRecord[]
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
  return { id: docRef.id, ...rememberData }
}

export const getRememberToday = async (userId: string, limitCount = 30) => {
  const q = query(
    collection(db, 'rememberToday'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  )
  const querySnapshot = await getDocs(q)
  return querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as RememberToday[]
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
