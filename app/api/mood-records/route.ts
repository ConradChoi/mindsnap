import { NextRequest, NextResponse } from 'next/server'
import { createMoodRecord, getMoodRecords } from '@/lib/firebase-service'

// GET: 마음 기록 목록 조회
export async function GET() {
  try {
    // TODO: 인증 시스템 구현 시 실제 userId 사용
    const TEMP_USER_ID = "TEMP_USER"
    
    const records = await getMoodRecords(TEMP_USER_ID, 30)
    
    return NextResponse.json({ records })
  } catch (error) {
    console.error('Error fetching mood records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch mood records' },
      { status: 500 }
    )
  }
}

// POST: 새 마음 기록 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { mood, note, activities = [] } = body

    if (!mood) {
      return NextResponse.json(
        { error: 'Mood is required' },
        { status: 400 }
      )
    }

    // TODO: 인증 시스템 구현 시 실제 userId 사용
    const TEMP_USER_ID = "TEMP_USER"

    const record = await createMoodRecord({
      userId: TEMP_USER_ID,
      mood: parseInt(mood),
      note,
      activities,
    })

    return NextResponse.json(
      { id: record.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating mood record:', error)
    return NextResponse.json(
      { error: 'Failed to create mood record' },
      { status: 500 }
    )
  }
}
