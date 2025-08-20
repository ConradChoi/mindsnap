// Snap 생성 요청 타입
export interface CreateSnapReq {
  title: string
  note?: string
  imageUrl?: string
  tags?: string[]
  capturedAt?: Date
}

// Snap 생성 응답 타입
export interface CreateSnapRes {
  id: string
}

// Snap 목록 응답 타입
export interface ListSnapsRes {
  snaps: {
    id: string
    title: string
    note?: string
    imageUrl?: string
    capturedAt: Date
    tags: string[]
  }[]
}

// Snap 상세 정보 타입
export interface SnapDetail {
  id: string
  title: string
  note?: string
  imageUrl?: string
  tags: string[]
  capturedAt: Date
  createdAt: Date
  updatedAt: Date
}
