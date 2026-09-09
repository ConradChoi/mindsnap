'use client'

import { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ChevronLeft, BarChart3, Star, CalendarDays } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createPersonalityTestResult, getPersonalityTestContent } from '@/lib/supabase-service'
import { calculateBirthCard, calculateCurrentAge, calculateFullLifeCycle, MAX_LIFE_CYCLE_AGE } from '@/lib/tarotLifeCycle'
import LifeCycleChart from '@/components/LifeCycleChart'

interface TarotCard {
  title: string
  keywords: string[]
  meaning: string[] // 탄생카드(나의 성향) 설명
  yearCard: string[] // 연도카드(그 해의 흐름) 설명
}

type Step = 'input' | 'result'

export default function LifeCycleTestPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('input')
  const [year, setYear] = useState('')
  const [month, setMonth] = useState('')
  const [day, setDay] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showChart, setShowChart] = useState(false)

  const [birthYear, setBirthYear] = useState<number | null>(null)
  const [birthMonth, setBirthMonth] = useState<number | null>(null)
  const [birthDay, setBirthDay] = useState<number | null>(null)
  const [birthCard, setBirthCard] = useState<number | null>(null)
  const [currentAge, setCurrentAge] = useState(0)
  const [focusAge, setFocusAge] = useState(0)
  const [content, setContent] = useState<Record<string, TarotCard> | null>(null)

  // 콘텐츠는 DB(personality_test_content)에서 조회 — Capacitor 앱 패키징 후에도
  // 문구 수정 시 앱 재빌드 없이 즉시 반영되도록 하기 위함
  useEffect(() => {
    getPersonalityTestContent('life_cycle')
      .then((data) => setContent(data as Record<string, TarotCard>))
      .catch((error) => {
        console.error('Error loading life cycle content:', error)
        setContent({})
      })
  }, [])

  const fullData = useMemo(() => {
    if (birthYear === null || birthMonth === null || birthDay === null) return []
    return calculateFullLifeCycle(birthYear, birthMonth, birthDay)
  }, [birthYear, birthMonth, birthDay])

  const isValidInput = () => {
    const y = Number(year)
    const m = Number(month)
    const d = Number(day)
    const currentYear = new Date().getFullYear()
    return y >= 1900 && y <= currentYear && m >= 1 && m <= 12 && d >= 1 && d <= 31
  }

  const handleSubmit = async () => {
    if (!isValidInput()) {
      alert('생년월일을 정확히 입력해주세요.')
      return
    }
    if (!user?.uid) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    const y = Number(year)
    const m = Number(month)
    const d = Number(day)
    const age = calculateCurrentAge(y, m, d)
    const birthCardValue = calculateBirthCard(y, m, d)
    // 대표 결과값(resultKey)은 나이에 따라 바뀌는 연도카드가 아니라, 평생 변하지 않는
    // 탄생카드로 저장한다 (도형심리/에니어그램과 동일하게 "나의 성향"을 대표값으로 삼는다).
    const resultKey = String(birthCardValue)

    setIsSubmitting(true)
    try {
      await createPersonalityTestResult({
        userId: user.uid,
        testType: 'life_cycle',
        input: { birthYear: y, birthMonth: m, birthDay: d },
        resultKey,
      })
      setBirthYear(y)
      setBirthMonth(m)
      setBirthDay(d)
      setBirthCard(birthCardValue)
      setCurrentAge(age)
      setFocusAge(age)
      setStep('result')
    } catch (error) {
      console.error('Error saving life cycle result:', error)
      alert('결과 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    setYear('')
    setMonth('')
    setDay('')
    setShowChart(false)
    setStep('input')
  }

  const back = () => router.back()

  const focusCard = content?.[String(fullData[focusAge] ?? '')]
  const birthCardContent = birthCard !== null ? content?.[String(birthCard)] : undefined

  const yearAges = [
    { label: '작년', age: Math.max(0, currentAge - 1) },
    { label: '올해', age: currentAge },
    { label: '내년', age: Math.min(MAX_LIFE_CYCLE_AGE, currentAge + 1) },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <button onClick={back} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold flex-1 text-center pr-7">생일로 보는 인생주기</h1>
      </div>

      {step === 'input' && (
        <div className="space-y-6">
          <p className="text-mobile-sm text-muted-foreground">
            생년월일을 입력하면 나이별로 어떤 흐름 속에 있는지 카드로 보여드려요.
          </p>

          <Card>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium">년</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={year}
                    onChange={(e) => setYear(e.target.value)}
                    placeholder="1990"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">월</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={month}
                    onChange={(e) => setMonth(e.target.value)}
                    placeholder="1"
                    className="h-12"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">일</label>
                  <Input
                    type="number"
                    inputMode="numeric"
                    value={day}
                    onChange={(e) => setDay(e.target.value)}
                    placeholder="1"
                    className="h-12"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <Button type="button" disabled={isSubmitting} onClick={handleSubmit} className="w-full h-12 text-lg">
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>계산 중...</span>
              </div>
            ) : (
              '결과보기'
            )}
          </Button>
        </div>
      )}

      {step === 'result' && (
        <div className="space-y-4">
          {/* 탄생 카드 — 생년월일만으로 정해지는, 평생 변하지 않는 나의 성향 */}
          {birthCardContent && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  <span>나의 탄생 카드 · {birthCardContent.title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {birthCardContent.keywords.map((kw, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      #{kw}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                  {birthCardContent.meaning.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* 작년 / 올해 / 내년 카드 (연도카드 — 나이에 따라 달라지는 그 해의 흐름) */}
          <div className="grid grid-cols-3 gap-2">
            {yearAges.map(({ label, age }) => {
              const cardKey = String(fullData[age] ?? '')
              const isCenter = label === '올해'
              const isFocused = focusAge === age
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setFocusAge(age)}
                  className={`rounded-lg border-2 p-3 text-center transition-all ${
                    isFocused ? 'border-primary bg-primary/5' : 'border-border'
                  } ${isCenter ? 'py-5' : 'opacity-80'}`}
                >
                  <div className="text-xs text-muted-foreground mb-1">{label}</div>
                  <div className={`font-semibold ${isCenter ? 'text-lg' : 'text-sm'}`}>
                    {content?.[cardKey]?.title ?? `${cardKey}번`}
                  </div>
                </button>
              )
            })}
          </div>

          {/* 선택된 나이의 연도카드 상세 — 그 해의 흐름 */}
          {focusCard && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CalendarDays className="w-5 h-5 text-primary" />
                  <span>
                    {focusAge}세 · {focusCard.title}
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {focusCard.keywords.map((kw, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-muted text-muted-foreground">
                      #{kw}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                  {focusCard.yearCard.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Button type="button" variant="outline" onClick={() => setShowChart((v) => !v)} className="w-full h-12">
            <BarChart3 className="w-4 h-4 mr-2" />
            {showChart ? '그래프 닫기' : '전체보기 (인생 그래프)'}
          </Button>

          {showChart && fullData.length > 0 && (
            <LifeCycleChart data={fullData} currentAge={currentAge} selectedAge={focusAge} onSelectAge={setFocusAge} />
          )}

          <div className="space-y-3 pt-2">
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
