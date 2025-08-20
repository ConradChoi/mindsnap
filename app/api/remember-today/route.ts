import { NextRequest, NextResponse } from 'next/server'
import { createRememberToday, getRememberToday } from '@/lib/firebase-service'

// GET: "오늘을 기억할래" 기록 목록 조회
export async function GET() {
  try {
    // TODO: 인증 시스템 구현 시 실제 userId 사용
    const TEMP_USER_ID = "TEMP_USER"
    
    const records = await getRememberToday(TEMP_USER_ID, 30)
    
    return NextResponse.json({ records })
  } catch (error) {
    console.error('Error fetching remember today records:', error)
    return NextResponse.json(
      { error: 'Failed to fetch remember today records' },
      { status: 500 }
    )
  }
}

// POST: 새 "오늘을 기억할래" 기록 생성
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { 
      mood, 
      memorableEvent, 
      reason, 
      cause, 
      improvement, 
      action, 
      summary,
      selectedDate,
      withNotification 
    } = body

    if (!mood || !memorableEvent || !reason || !cause || !improvement || !action || !summary) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      )
    }

    // TODO: 인증 시스템 구현 시 실제 userId 사용
    const TEMP_USER_ID = "TEMP_USER"

    const record = await createRememberToday({
      userId: TEMP_USER_ID,
      mood,
      memorableEvent,
      reason,
      cause,
      improvement,
      action,
      summary,
      selectedDate: selectedDate || null,
      withNotification: withNotification || false,
    })

    return NextResponse.json(
      { id: record.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating remember today record:', error)
    return NextResponse.json(
      { error: 'Failed to create remember today record' },
      { status: 500 }
    )
  }
}
