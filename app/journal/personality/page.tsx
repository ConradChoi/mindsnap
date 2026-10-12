'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Sparkles, Star, ThumbsDown, ThumbsUp, TrendingUp } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPersonalityTestContent, getPersonalityTestResultById } from '@/lib/supabase-service'
import { PersonalityTestResult, TEST_TYPE_LABELS } from '@/lib/types'

interface ShapeContent {
  title: string
  traits: string[]
  strengths: string[]
  improvements: string[]
}

interface EnneagramContent {
  title: string
  traits: string[]
  strengths: string[]
  weaknesses: string[]
  growthGuide: string[]
}

interface LifeCycleContent {
  title: string
  keywords: string[]
  meaning: string[]
}

export default function PersonalityResultDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [result, setResult] = useState<PersonalityTestResult | null | undefined>(undefined)
  const [content, setContent] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    if (!id) {
      setResult(null)
      return
    }
    getPersonalityTestResultById(id)
      .then((r) => setResult(r && !r.deletedAt ? r : null))
      .catch((error) => {
        console.error('성격검사결과 조회 오류:', error)
        setResult(null)
      })
  }, [id])

  useEffect(() => {
    if (!result) return
    getPersonalityTestContent(result.testType)
      .then(setContent)
      .catch((error) => console.error('성격검사 콘텐츠 조회 오류:', error))
  }, [result])

  const formatDate = (date: Date) =>
    date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const resultContent = result && content ? content[result.resultKey] : undefined

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">성격검사결과</h1>
      </div>

      {result === undefined ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : result === null ? (
        <div className="text-center py-12 text-muted-foreground">기록을 찾을 수 없어요</div>
      ) : !resultContent ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{TEST_TYPE_LABELS[result.testType] ?? result.testType}</p>

          {result.testType === 'shape' && (
            <Card>
              <CardHeader>
                <CardTitle>{(resultContent as ShapeContent).title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>기본 특징</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as ShapeContent).traits.map((line, i) => (
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
                    {(resultContent as ShapeContent).strengths.map((line, i) => (
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
                    {(resultContent as ShapeContent).improvements.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {result.testType === 'enneagram' && (
            <Card>
              <CardHeader>
                <CardTitle>당신은 [{(resultContent as EnneagramContent).title}]일 가능성이 높습니다.</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>기본 특징</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as EnneagramContent).traits.map((line, i) => (
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
                    {(resultContent as EnneagramContent).strengths.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <ThumbsDown className="w-4 h-4 text-red-400" />
                    <span>단점</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as EnneagramContent).weaknesses.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span>바라봐야 할 방향 / 성장 가이드</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as EnneagramContent).growthGuide.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {result.testType === 'life_cycle' && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  <span>나의 탄생 카드 · {(resultContent as LifeCycleContent).title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {(resultContent as LifeCycleContent).keywords.map((kw, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      #{kw}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                  {(resultContent as LifeCycleContent).meaning.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="text-sm text-muted-foreground">{formatDate(result.createdAt)}</div>
        </div>
      )}
    </div>
  )
}
