// app/journal/snap/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSnap } from '@/lib/supabase-service'
import { Snap } from '@/lib/types'

export default function SnapDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  // undefined = 로딩 중, null = 찾을 수 없음(id 없음/조회 실패/삭제됨)
  const [snap, setSnap] = useState<Snap | null | undefined>(undefined)

  useEffect(() => {
    if (!id) {
      setSnap(null)
      return
    }
    getSnap(id)
      .then((result) => setSnap(result && !result.deletedAt ? result : null))
      .catch((error) => {
        console.error('스냅 조회 오류:', error)
        setSnap(null)
      })
  }, [id])

  const formatDate = (date: Date) =>
    date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">스냅</h1>
      </div>

      {snap === undefined ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : snap === null ? (
        <div className="text-center py-12 text-muted-foreground">기록을 찾을 수 없어요</div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{snap.title}</h2>
            {snap.imageUrl && (
              <img src={snap.imageUrl} alt={snap.title} className="w-full rounded-lg" />
            )}
            {snap.audioUrl && <audio controls src={snap.audioUrl} className="w-full" />}
            {snap.note && <p className="text-sm text-foreground whitespace-pre-wrap">{snap.note}</p>}
            {snap.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {snap.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="text-sm text-muted-foreground">{formatDate(snap.capturedAt)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
