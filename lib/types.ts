export interface User {
  id: string
  email: string
  name?: string
  image?: string
  createdAt: Date
  updatedAt: Date
}

export interface Snap {
  id: string
  userId: string
  title: string
  note?: string
  imageUrl?: string
  tags: string[]
  capturedAt: Date
  createdAt: Date
  updatedAt: Date
}

export interface MoodRecord {
  id: string
  userId: string
  mood: number // 1-10 scale
  note?: string
  activities: string[]
  createdAt: Date
}

export interface PersonalityTest {
  id: string
  userId: string
  answers: Record<string, number>
  result: {
    type: string
    description: string
    traits: string[]
  }
  createdAt: Date
}

export interface RememberToday {
  id: string
  userId: string
  mood: string // 'happy', 'neutral', 'sad'
  memorableEvent: string
  reason: string
  cause: string
  improvement: string
  action: string
  summary: string
  selectedDate?: string
  withNotification: boolean
  createdAt: Date
  updatedAt: Date
}
