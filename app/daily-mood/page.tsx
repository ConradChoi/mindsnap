'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Heart, Calendar, Smile, Meh, Frown } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function DailyMoodPage() {
  const router = useRouter()
  const [mood, setMood] = useState('')
  const [note, setNote] = useState('')
  const [selectedMood, setSelectedMood] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const moodOptions = [
    { value: 'happy', label: '행복', icon: Smile, color: 'text-green-500' },
    { value: 'neutral', label: '보통', icon: Meh, color: 'text-yellow-500' },
    { value: 'sad', label: '우울', icon: Frown, color: 'text-blue-500' },
  ]

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMood) return

    setIsSubmitting(true)
    try {
      // 마음 기록 API 호출
      const response = await fetch('/api/mood-records', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mood: selectedMood === 'happy' ? 8 : selectedMood === 'neutral' ? 5 : 2,
          note: note || mood,
          activities: [],
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save mood record')
      }

      const result = await response.json()
      console.log('마음 기록 저장 성공:', result)
      
      // 성공 시 홈으로 이동
      setTimeout(() => {
        router.push('/')
      }, 1000)
    } catch (error) {
      console.error('Error saving mood:', error)
      alert('마음 기록 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">오늘의 마음 기록</h1>
        <p className="text-muted-foreground text-mobile-sm">
          오늘 하루는 어떠셨나요?
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Heart className="w-5 h-5 text-red-500" />
              <span>마음 상태</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 기분 선택 */}
            <div className="space-y-3">
              <label className="text-sm font-medium">오늘의 기분을 선택하세요 *</label>
              <div className="grid grid-cols-3 gap-3">
                {moodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setSelectedMood(option.value)}
                    className={`p-4 border-2 rounded-lg text-center transition-all ${
                      selectedMood === option.value
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                  >
                    <option.icon className={`w-8 h-8 mx-auto mb-2 ${option.color}`} />
                    <div className="text-sm font-medium">{option.label}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* 마음 제목 */}
            <div className="space-y-2">
              <label htmlFor="mood" className="text-sm font-medium">
                마음 제목
              </label>
              <Input
                id="mood"
                value={mood}
                onChange={(e) => setMood(e.target.value)}
                placeholder="오늘의 마음을 한 줄로 표현해보세요"
                className="h-12 text-mobile-base"
              />
            </div>

            {/* 마음 메모 */}
            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                마음 메모
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="오늘 하루의 마음 상태나 감정을 자세히 기록해보세요"
                className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
              />
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          <Button
            id="save-button"
            type="submit"
            disabled={!selectedMood || isSubmitting}
            className="w-full h-12 text-lg bg-primary text-primary-foreground"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>저장 중...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Heart className="w-5 h-5" />
                <span>마음 기록 저장</span>
              </div>
            )}
          </Button>

                           <Button
                   id="remember-button"
                   type="button"
                   variant="outline"
                   onClick={() => router.push('/remember-today')}
                   className="w-full h-12 text-lg bg-blue-50 border-blue-200 text-blue-700"
                 >
                   오늘을 기억할래
                 </Button>

          <Button
            id="cancel-button"
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full h-12 text-lg bg-red-50 border-red-200 text-red-700"
          >
            취소
          </Button>
        </div>
      </form>

      {/* 하단 네비게이션과 겹치지 않도록 여백 추가 */}
      <div className="h-12"></div>
    </div>
  )
}
