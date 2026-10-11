// app/journal/mood/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Smile, Meh, Frown, Angry, Laugh } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getMoodRecord } from '@/lib/supabase-service'
import { MoodLevel, MoodRecord } from '@/lib/types'

// 5단계 기분 척도 (1: 매우 우울 ~ 5: 매우 행복) - app/daily-mood/page.tsx와 동일한 값
const moodOptions: { value: MoodLevel; label: string; icon: typeof Smile; color: string }[] = [
  { value: 1, label: '매우 우울', icon: Angry, color: 'text-red-500' },
  { value: 2, label: '우울', icon: Frown, color: 'text-blue-500' },
  { value: 3, label: '보통', icon: Meh, color: 'text-yellow-500' },
  { value: 4, label: '행복', icon: Smile, color: 'text-green-500' },
  { value: 5, label: '매우 행복', icon: Laugh, color: 'text-emerald-500' },
]

export default function MoodRecordDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [record, setRecord] = useState<MoodRecord | null | undefined>(undefined)

  useEffect(() => {
    if (!id) {
      setRecord(null)
      return
    }
    getMoodRecord(id)
      .then((result) => setRecord(result && !result.deletedAt ? result : null))
      .catch((error) => {
        console.error('마음기록 조회 오류:', error)
        setRecord(null)
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

  const moodOption = record ? moodOptions.find((o) => o.value === record.mood) : undefined
  const MoodIcon = moodOption?.icon

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">마음 기록</h1>
      </div>

      {record === undefined ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : record === null ? (
        <div className="text-center py-12 text-muted-foreground">기록을 찾을 수 없어요</div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            {moodOption && MoodIcon && (
              <div className={`flex items-center space-x-2 ${moodOption.color}`}>
                <MoodIcon className="w-6 h-6" />
                <span className="font-medium">{moodOption.label}</span>
              </div>
            )}
            {record.note && <p className="text-sm text-foreground whitespace-pre-wrap">{record.note}</p>}
            {record.activities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {record.activities.map((activity) => (
                  <span key={activity} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    {activity}
                  </span>
                ))}
              </div>
            )}
            <div className="text-sm text-muted-foreground">{formatDate(record.createdAt)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
