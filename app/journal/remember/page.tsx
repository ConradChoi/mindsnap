// app/journal/remember/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Smile, Meh, Frown, Angry, Laugh } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getRememberTodayItem } from '@/lib/supabase-service'
import { MoodLevel, RememberToday } from '@/lib/types'

// 5단계 기분 척도 (1: 매우 우울 ~ 5: 매우 행복) - app/daily-mood/page.tsx와 동일한 값
const moodOptions: { value: MoodLevel; label: string; icon: typeof Smile; color: string }[] = [
  { value: 1, label: '매우 우울', icon: Angry, color: 'text-red-500' },
  { value: 2, label: '우울', icon: Frown, color: 'text-blue-500' },
  { value: 3, label: '보통', icon: Meh, color: 'text-yellow-500' },
  { value: 4, label: '행복', icon: Smile, color: 'text-green-500' },
  { value: 5, label: '매우 행복', icon: Laugh, color: 'text-emerald-500' },
]

const FIELDS: { key: keyof RememberToday; label: string }[] = [
  { key: 'memorableEvent', label: '기억에 남는 일' },
  { key: 'reason', label: '이유' },
  { key: 'cause', label: '원인' },
  { key: 'improvement', label: '개선할 점' },
  { key: 'action', label: '행동' },
  { key: 'summary', label: '요약' },
]

export default function RememberTodayDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [record, setRecord] = useState<RememberToday | null | undefined>(undefined)

  useEffect(() => {
    if (!id) {
      setRecord(null)
      return
    }
    getRememberTodayItem(id)
      .then((result) => setRecord(result && !result.deletedAt ? result : null))
      .catch((error) => {
        console.error('오늘을 기억할래 조회 오류:', error)
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
        <h1 className="text-2xl font-bold">오늘을 기억할래</h1>
      </div>

      {record === undefined ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : record === null ? (
        <div className="text-center py-12 text-muted-foreground">기록을 찾을 수 없어요</div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-5">
            {moodOption && MoodIcon && (
              <div className={`flex items-center space-x-2 ${moodOption.color}`}>
                <MoodIcon className="w-6 h-6" />
                <span className="font-medium">{moodOption.label}</span>
              </div>
            )}
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <div className="text-sm font-medium text-foreground">{label}</div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record[key] as string}</p>
              </div>
            ))}
            {record.selectedDate && (
              <div className="text-sm text-muted-foreground">선택한 날짜: {formatDate(record.selectedDate)}</div>
            )}
            <div className="text-sm text-muted-foreground">작성일시: {formatDate(record.createdAt)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
