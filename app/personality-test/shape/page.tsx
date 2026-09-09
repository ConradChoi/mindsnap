'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Circle, Triangle, Square, Sparkles, ThumbsUp, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createPersonalityTestResult, getPersonalityTestContent } from '@/lib/supabase-service'
import { ShapeId } from '@/lib/types'

interface ShapeContent {
  title: string
  traits: string[]
  strengths: string[]
  improvements: string[]
}

const SHAPES: { id: ShapeId; label: string }[] = [
  { id: 'circle', label: '원' },
  { id: 'triangle', label: '세모' },
  { id: 'square', label: '네모' },
  { id: 's', label: 'S' },
]

const ShapeIcon = ({ id }: { id: ShapeId }) => {
  switch (id) {
    case 'circle':
      return <Circle className="w-10 h-10" strokeWidth={1.5} />
    case 'triangle':
      return <Triangle className="w-10 h-10" strokeWidth={1.5} />
    case 'square':
      return <Square className="w-10 h-10" strokeWidth={1.5} />
    case 's':
      return <span className="text-3xl font-semibold">S</span>
  }
}

export default function ShapePsychologyTestPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [order, setOrder] = useState<ShapeId[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<ShapeContent | null>(null)
  const [content, setContent] = useState<Record<string, ShapeContent> | null>(null)

  // 콘텐츠는 DB(personality_test_content)에서 조회 — Capacitor 앱 패키징 후에도
  // 문구 수정 시 앱 재빌드 없이 즉시 반영되도록 하기 위함
  useEffect(() => {
    getPersonalityTestContent('shape')
      .then((data) => setContent(data as Record<string, ShapeContent>))
      .catch((error) => {
        console.error('Error loading shape psychology content:', error)
        setContent({})
      })
  }, [])

  const toggleShape = (id: ShapeId) => {
    if (result) return // 결과 화면에서는 선택 변경 불가 (다시하기로 초기화해야 함)
    setOrder((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < 4 ? [...prev, id] : prev))
  }

  const handleSubmit = async () => {
    if (order.length !== 4 || !content) return
    if (!user?.uid) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    const resultKey = order[0]
    const resultContent = content[resultKey]

    setIsSubmitting(true)
    try {
      await createPersonalityTestResult({
        userId: user.uid,
        testType: 'shape',
        input: { order },
        resultKey,
      })
      setResult(resultContent)
    } catch (error) {
      console.error('Error saving shape psychology result:', error)
      alert('결과 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    setOrder([])
    setResult(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <button onClick={() => router.back()} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold flex-1 text-center pr-7">도형심리</h1>
      </div>

      {!result ? (
        <>
          <p className="text-mobile-sm text-muted-foreground">원하는 도형을 순서대로 선택해 주세요.</p>

          <div className="grid grid-cols-2 gap-3">
            {SHAPES.map((shape) => {
              const rank = order.indexOf(shape.id)
              const selected = rank !== -1
              return (
                <button
                  key={shape.id}
                  type="button"
                  onClick={() => toggleShape(shape.id)}
                  className={`relative aspect-square flex items-center justify-center border-2 rounded-lg transition-all ${
                    selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
                  }`}
                >
                  {selected && (
                    <span className="absolute top-2 left-2 w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center">
                      {rank + 1}
                    </span>
                  )}
                  <ShapeIcon id={shape.id} />
                </button>
              )
            })}
          </div>

          <Button
            type="button"
            disabled={order.length !== 4 || isSubmitting || !content}
            onClick={handleSubmit}
            className="w-full h-12 text-lg"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>결과 계산 중...</span>
              </div>
            ) : (
              '결과보기'
            )}
          </Button>
        </>
      ) : (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <ShapeIcon id={order[0]} />
                <span>{result.title}</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>기본 특징</span>
                </div>
                <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                  {result.traits.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <ThumbsUp className="w-4 h-4 text-green-500" />
                  <span>장점</span>
                </div>
                <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                  {result.strengths.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <TrendingUp className="w-4 h-4 text-blue-500" />
                  <span>보완점</span>
                </div>
                <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                  {result.improvements.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button type="button" variant="outline" onClick={handleRetry} className="w-full h-12">
              다시 검사하기
            </Button>
            <Button type="button" onClick={() => router.push('/journal?tab=personality')} className="w-full h-12">
              내 성향 기록 보기
            </Button>
          </div>
        </div>
      )}

      <div className="h-12"></div>
    </div>
  )
}
