'use client'

import { useEffect, useRef, useState } from 'react'
import { getSentimentAnalysisForUser } from '@/lib/supabase-service'
import { SentimentAnalysis } from '@/lib/types'

export const sentimentKey = (table: string, id: string) => `${table}:${id}`

// 기록 저장 직후엔 백그라운드 분석이 아직 안 끝났을 수 있다(status: 'pending').
// pending 행이 하나라도 있는 동안만 3초 간격으로 다시 조회해서, 분석이 끝나면
// 화면이 자동으로 갱신되게 한다. 최대 20회(약 1분) 시도 후엔 조용히 멈춘다 —
// 이 프로젝트는 과거 Supabase Realtime 구독을 버그 진원지로 지목하고 제거한
// 이력이 있어(lib/supabase-service.ts 상단 주석 참고) 같은 효과를 폴링으로 낸다.
export const useSentimentMap = (userId: string | undefined) => {
  const [map, setMap] = useState<Record<string, SentimentAnalysis>>({})
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const fetchOnce = async () => {
      let rows: SentimentAnalysis[] = []
      try {
        rows = await getSentimentAnalysisForUser(userId)
      } catch (error) {
        console.error('감정 분석 결과 조회 오류:', error)
        return
      }
      if (cancelled) return

      const nextMap: Record<string, SentimentAnalysis> = {}
      let hasPending = false
      for (const row of rows) {
        nextMap[sentimentKey(row.sourceTable, row.sourceId)] = row
        if (row.status === 'pending') hasPending = true
      }
      setMap(nextMap)

      attemptsRef.current += 1
      if (hasPending && attemptsRef.current < 20) {
        timeoutId = setTimeout(fetchOnce, 3000)
      }
    }

    fetchOnce()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [userId])

  return map
}
