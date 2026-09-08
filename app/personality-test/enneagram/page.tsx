'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ChevronLeft, Users, Sparkles, ThumbsUp, ThumbsDown, TrendingUp } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createPersonalityTestResult } from '@/lib/supabase-service'
import enneagramContent from '@/data/enneagram-content.json'

interface EnneagramType {
  title: string
  traits: string[]
  strengths: string[]
  weaknesses: string[]
  growthGuide: string[]
}

type Group1Choice = 'A' | 'B' | 'C'
type Group2Choice = 'X' | 'Y' | 'Z'
type Step = 'intro' | 'group1' | 'group2' | 'result'

// Figma 디자인의 실제 문항 텍스트 (고정 콘텐츠 — data/enneagram-content.json에서 관리하지 않음)
const GROUP1_QUESTIONS: { id: Group1Choice; text: string }[] = [
  {
    id: 'A',
    text: '나는 독립적이고, 자기 주장을 잘한다.\n나는 정면돌파를 할 때 삶이 잘 풀린다고 느낀다.\n나는 목표를 설정하고 일을 추진하고, 성취하는 것을 원한다.\n나는 가만히 앉아 있는걸 좋아하지 않는다.\n나는 큰 일을 성취하고, 영향을 행사할 수 있기를 원한다.\n사람들이 나를 통제하는 것을 좋아하지 않는다.\n나는 내가 원하는 것을 잘 알고 있다.\n나는 일도 노는 것도 열심히 한다.',
  },
  {
    id: 'B',
    text: '나는 조용한 것을 좋아한다.\n나는 내 의견을 강하게 주장하지 않는다.\n나는 앞에 나서거나 경쟁하는 것을 좋아하지 않는다.\n사람들은 나를 몽상가라고 말한다.\n내 상상의 세계 안에서는 흥미로운 것들이 많다.\n나는 조용한 성격이다.',
  },
  {
    id: 'C',
    text: '나는 책임감이 강하고, 헌신적이다.\n내 의무를 다하지 못할 때 기분이 나쁘다.\n나를 필요로 할 때 그 자리에 있다는 것을 알아줬으면 좋겠다.\n나는 그들을 위해 최선을 다할 것이다.\n사람들이 안알아줘도 그들을 위해 큰 희생을 한다.\n나는 내 자신을 제대로 돌보지 않는다.\n해야 할 일을 하고, 쉬거나 내가 원하는 일을 한다.',
  },
]

const GROUP2_QUESTIONS: { id: Group2Choice; text: string }[] = [
  {
    id: 'X',
    text: '나는 긍정적으로 생활하며, 모든 일이 나에게 유리한 쪽으로 풀린다고 느낀다.\n나는 나의 열정을 쏟을 수 있는 여러 가지 방법을 찾는다.\n나는 사람들과 함께하고, 행복해지도록 돕는 것을 좋아한다.\n나는 나와 같이 사람들도 잘 지내기를 바란다. (항상 기분 좋은건 아님)\n나는 항상 긍정적으로 보이려고 노력한다.\n때로는 내 자신의 문제를 다루는 것을 미루기도 한다.',
  },
  {
    id: 'Y',
    text: '나는 대부분의 상황에 대해 강한 감정을 갖는다.\n사람들은 내가 모든 것에 불만을 갖고 있다고 생각한다.\n나는 감정을 억제하지만 남들이 생각하는 것보다 더 민감하다.\n사람들과 함께 있을 때 어떤 사람인지, 무엇을 기대할 수 있는지를 알기 원한다.\n어떤 일에 내가 화가 났을 때 나는 사람들이 그것에 대해 반응하고 나만큼 그 일을 해결하려고 노력해 주기를 원한다.\n나는 규칙을 알고 있다. 하지만 사람들이 내게 지시하는 것을 좋아하지 않는다.\n나는 내 스스로 결정하기를 원한다.',
  },
  {
    id: 'Z',
    text: '나는 스스로를 잘 통제하고 논리적이다.\n나는 느낌을 다루는 것을 편안해하지 않는다.\n나는 효율적이고 완벽하게 일을 처리하며, 혼자 일하는 것을 좋아한다.\n문제나 개인적인 갈등이 있을 때 나는 그 상황에 감정이 끼어들지 않도록 한다.\n어떤 일이 사람들은 내가 너무 차고 초연하다고 말하지만 나는 감정 때문에 중요한 일을 그르치고 싶지 않다.\n나는 사람들이 나를 화나게 할 때 대부분의 경우 반응을 보이지 않는다.',
  },
]

export default function EnneagramTestPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [step, setStep] = useState<Step>('intro')
  const [group1, setGroup1] = useState<Group1Choice | null>(null)
  const [group2, setGroup2] = useState<Group2Choice | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [result, setResult] = useState<{ typeKey: string; content: EnneagramType } | null>(null)

  const handleSubmit = async () => {
    if (!group1 || !group2) return
    if (!user?.uid) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    const gridMap = (enneagramContent as any).gridMap as Record<string, string>
    const types = (enneagramContent as any).types as Record<string, EnneagramType>
    const gridKey = `${group1}-${group2}`
    const typeKey = gridMap[gridKey]
    const content = types[typeKey]

    if (!content) {
      alert('아직 결과 콘텐츠가 준비되지 않았습니다. data/enneagram-content.json을 채워 넣은 후 다시 시도해주세요.')
      return
    }

    setIsSubmitting(true)
    try {
      await createPersonalityTestResult({
        userId: user.uid,
        testType: 'enneagram',
        input: { group1, group2 },
        resultKey: typeKey,
      })
      setResult({ typeKey, content })
      setStep('result')
    } catch (error) {
      console.error('Error saving enneagram result:', error)
      alert('결과 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleRetry = () => {
    setGroup1(null)
    setGroup2(null)
    setResult(null)
    setStep('intro')
  }

  const back = () => {
    if (step === 'group1') setStep('intro')
    else if (step === 'group2') setStep('group1')
    else router.back()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center space-x-2">
        <button onClick={back} className="p-1 -ml-1">
          <ChevronLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-bold flex-1 text-center pr-7">에니어그램</h1>
      </div>

      {step === 'intro' && (
        <div className="space-y-6">
          <p className="text-mobile-sm text-muted-foreground">에니어그램 기본 심플 검사 입니다.</p>
          <p className="text-mobile-base leading-relaxed">
            에니어그램은 성격 유형을 이해하고 분류하는 심리검사입니다.
            <br />
            개인의 내적 동기와 행동 패턴을 파악하는 데 사용됩니다.
            <br />
            에니어그램은 9가지 유형(타입)으로 분류되며, 각 유형은 특정한 특성과 성향을 가지고 있습니다. 이를 통해 자기
            이해와 대인 관계에서의 원활한 소통을 돕습니다.
          </p>
          <Button type="button" onClick={() => setStep('group1')} className="w-full h-12 text-lg">
            시작하기
          </Button>
        </div>
      )}

      {step === 'group1' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-mobile-sm text-muted-foreground">아래 문항 중 나에게 해당되는 문항을 선택해주세요.</p>
            <span className="text-mobile-sm text-muted-foreground shrink-0">1/2</span>
          </div>
          {GROUP1_QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setGroup1(q.id)}
              className={`block w-full text-left p-4 border-2 rounded-lg whitespace-pre-line text-mobile-sm transition-all ${
                group1 === q.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              {q.text}
            </button>
          ))}
          <Button type="button" disabled={!group1} onClick={() => setStep('group2')} className="w-full h-12 text-lg">
            다음
          </Button>
        </div>
      )}

      {step === 'group2' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-mobile-sm text-muted-foreground">아래 문항 중 나에게 해당되는 문항을 선택해주세요.</p>
            <span className="text-mobile-sm text-muted-foreground shrink-0">2/2</span>
          </div>
          {GROUP2_QUESTIONS.map((q) => (
            <button
              key={q.id}
              type="button"
              onClick={() => setGroup2(q.id)}
              className={`block w-full text-left p-4 border-2 rounded-lg whitespace-pre-line text-mobile-sm transition-all ${
                group2 === q.id ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'
              }`}
            >
              {q.text}
            </button>
          ))}
          <div className="flex space-x-3">
            <Button type="button" variant="outline" onClick={() => setStep('group1')} className="flex-1 h-12">
              이전
            </Button>
            <Button type="button" disabled={!group2 || isSubmitting} onClick={handleSubmit} className="flex-1 h-12">
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
        </div>
      )}

      {step === 'result' && result && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="w-5 h-5 text-purple-500" />
                <span>당신은 [{result.content.title}]일 가능성이 높습니다.</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <div className="flex items-center space-x-2 text-sm font-medium">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>기본 특징</span>
                </div>
                <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                  {result.content.traits.map((line, i) => (
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
                  {result.content.strengths.map((line, i) => (
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
                  {result.content.weaknesses.map((line, i) => (
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
                  {result.content.growthGuide.map((line, i) => (
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
