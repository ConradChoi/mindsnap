import { NextRequest, NextResponse } from 'next/server'
import { createSnap, getSnaps } from '@/lib/firebase-service'
import { CreateSnapReq, CreateSnapRes, ListSnapsRes } from '@/contracts/snaps'

// GET: 최신순 목록 반환
export async function GET(request: NextRequest): Promise<NextResponse<ListSnapsRes>> {
  try {
    // Authorization 헤더에서 사용자 ID 추출
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authHeader.replace('Bearer ', '')
    const snaps = await getSnaps(userId, 30)

    return NextResponse.json({ snaps })
  } catch (error) {
    console.error('Error fetching snaps:', error)
    return NextResponse.json(
      { error: 'Failed to fetch snaps' },
      { status: 500 }
    )
  }
}

// POST: 새 Snap 생성
export async function POST(request: NextRequest): Promise<NextResponse<CreateSnapRes>> {
  try {
    const body: CreateSnapReq = await request.json()
    const { title, note, imageUrl, tags, capturedAt } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Authorization 헤더에서 사용자 ID 추출
    const authHeader = request.headers.get('authorization')
    if (!authHeader) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const userId = authHeader.replace('Bearer ', '')

    const snap = await createSnap({
      title,
      note,
      imageUrl,
      tags: tags || [],
      capturedAt: capturedAt || new Date(),
      userId,
    })

    return NextResponse.json(
      { id: snap.id },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error creating snap:', error)
    return NextResponse.json(
      { error: 'Failed to create snap' },
      { status: 500 }
    )
  }
}
