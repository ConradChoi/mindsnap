'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { getSentimentAnalysisForUser } from '@/lib/supabase-service'
import { SentimentAnalysis } from '@/lib/types'
import SentimentTrendChart from '@/components/SentimentTrendChart'

export default function JournalInsightsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState<SentimentAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    getSentimentAnalysisForUser(user.uid, 500)
      .then(setAnalyses)
      .catch((error) => console.error('감정 인사이트 조회 오류:', error))
      .finally(() => setIsLoading(false))
  }, [user?.uid])

  const completed = analyses.filter((a) => a.status === 'completed')

  const trendPoints = [...completed]
    .filter((a) => a.sentimentScore !== undefined)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((a) => ({ date: a.createdAt, score: a.sentimentScore as number }))

  const entityCounts = new Map<string, number>()
  for (const analysis of completed) {
    for (const entity of analysis.entities) {
      entityCounts.set(entity.name, (entityCounts.get(entity.name) ?? 0) + 1)
    }
  }
  const topEntities = Array.from(entityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">감정 인사이트</h1>
          <p className="text-muted-foreground text-mobile-sm">기록에 담긴 감정과 키워드를 모아봤어요</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>감정 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <SentimentTrendChart points={trendPoints} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>자주 언급된 키워드</CardTitle>
            </CardHeader>
            <CardContent>
              {topEntities.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 데이터가 충분하지 않아요</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topEntities.map(([name, count]) => (
                    <span key={name} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                      {name} <span className="text-muted-foreground">{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
