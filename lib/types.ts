// 앱 화면에서 사용하는 타입. DB(Postgres) 컬럼명과 다를 수 있으며,
// 변환은 lib/mappers.ts에서만 담당한다 (T3: 날짜 변환 단일 계층).

export interface User {
  uid: string
  email: string | null
  displayName: string | null
  createdAt: Date
  updatedAt: Date
}

export interface Snap {
  id: string
  userId: string
  title: string
  note?: string
  imageUrl?: string // Storage signed URL (읽을 때 매번 새로 발급됨, DB에는 경로만 저장)
  audioUrl?: string // Storage signed URL
  tags: string[]
  capturedAt: Date
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// 마음 기록 mood 5단계 (1: 매우 우울 ~ 5: 매우 행복)
export type MoodLevel = 1 | 2 | 3 | 4 | 5

export interface MoodRecord {
  id: string
  userId: string
  mood: MoodLevel
  note?: string
  activities: string[]
  createdAt: Date
  deletedAt?: Date
}

export interface RememberToday {
  id: string
  userId: string
  mood: MoodLevel // daily-mood와 동일한 5단계 척도로 통일
  memorableEvent: string
  reason: string
  cause: string
  improvement: string
  action: string
  summary: string
  selectedDate?: Date
  withNotification: boolean
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

// 휴지통 화면(설정 > 삭제된 기록)에서 사용하는 통합 항목 타입
export type TrashItemType = 'snap' | 'mood' | 'remember'

export interface TrashItem {
  id: string
  type: TrashItemType
  deletedAt: Date
  title: string
  data: Snap | MoodRecord | RememberToday
}
