'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Heart, Calendar, Smile, Meh, Frown, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'

interface RememberData {
  step1: {
    mood: string
    memorableEvent: string
  }
  step2: {
    reason: string
  }
  step3: {
    cause: string
  }
  step4: {
    improvement: string
  }
  step5: {
    action: string
  }
  step6: {
    summary: string
  }
}

export default function RememberTodayPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [data, setData] = useState<RememberData>({
    step1: { mood: '', memorableEvent: '' },
    step2: { reason: '' },
    step3: { cause: '' },
    step4: { improvement: '' },
    step5: { action: '' },
    step6: { summary: '' }
  })
  const [selectedDate, setSelectedDate] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const moodOptions = [
    { value: 'happy', label: '행복', icon: Smile, color: 'text-green-500' },
    { value: 'neutral', label: '보통', icon: Meh, color: 'text-yellow-500' },
    { value: 'sad', label: '우울', icon: Frown, color: 'text-blue-500' },
  ]

  const updateData = (step: keyof RememberData, field: string, value: string) => {
    setData(prev => ({
      ...prev,
      [step]: {
        ...prev[step],
        [field]: value
      }
    }))
  }

  const canProceed = (step: number) => {
    switch (step) {
      case 1:
        return data.step1.mood && data.step1.memorableEvent.length >= 10
      case 2:
        return data.step2.reason.length >= 10
      case 3:
        return data.step3.cause.length >= 10
      case 4:
        return data.step4.improvement.length >= 10
      case 5:
        return data.step5.action.length >= 10
      case 6:
        return data.step6.summary.length >= 5
      default:
        return false
    }
  }

  const handleNext = () => {
    if (canProceed(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 6))
    }
  }

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1))
  }

  const handleSubmit = async (withNotification: boolean) => {
    // 알림 설정 후 저장하기의 경우에만 날짜 선택 필수
    if (withNotification && !selectedDate) return

    setIsSubmitting(true)
    try {
      // "오늘을 기억할래" API 호출
      const response = await fetch('/api/remember-today', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mood: data.step1.mood,
          memorableEvent: data.step1.memorableEvent,
          reason: data.step2.reason,
          cause: data.step3.cause,
          improvement: data.step4.improvement,
          action: data.step5.action,
          summary: data.step6.summary,
          selectedDate: selectedDate || null,
          withNotification,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to save remember today record')
      }

      const result = await response.json()
      console.log('기억하기 저장 성공:', result)

      // 성공 시 홈으로 이동
      setTimeout(() => {
        router.push('/')
      }, 2000)
    } catch (error) {
      console.error('Error saving memory:', error)
      alert('기억하기 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const renderStep1 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Heart className="w-5 h-5 text-red-500" />
          <span>Today is</span>
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
                onClick={() => updateData('step1', 'mood', option.value)}
                className={`p-4 border-2 rounded-lg text-center transition-all ${
                  data.step1.mood === option.value
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

        {/* 인상깊은 일 */}
        <div className="space-y-2">
          <label htmlFor="memorableEvent" className="text-sm font-medium">
            오늘 하루 중 인상깊은 일을 적어보세요 *
          </label>
          <textarea
            id="memorableEvent"
            value={data.step1.memorableEvent}
            onChange={(e) => updateData('step1', 'memorableEvent', e.target.value)}
            placeholder="오늘 하루 중 가장 인상깊었던 일을 자세히 적어보세요 (10글자 이상)"
            className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {data.step1.memorableEvent.length}/500
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep2 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="text-2xl">🤔</span>
          <span>Why</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="reason" className="text-sm font-medium">
            어떤 이유로 인상 깊었을까요? *
          </label>
          <textarea
            id="reason"
            value={data.step2.reason}
            onChange={(e) => updateData('step2', 'reason', e.target.value)}
            placeholder="그 일이 왜 인상깊었는지 생각해보세요 (10글자 이상)"
            className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {data.step2.reason.length}/500
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep3 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="text-2xl">🔍</span>
          <span>What</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="cause" className="text-sm font-medium">
            무엇이 그렇게 만들었을까요? *
          </label>
          <textarea
            id="cause"
            value={data.step3.cause}
            onChange={(e) => updateData('step3', 'cause', e.target.value)}
            placeholder="그런 감정이나 생각을 만든 원인을 찾아보세요 (10글자 이상)"
            className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {data.step3.cause.length}/500
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep4 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="text-2xl">💡</span>
          <span>How</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="improvement" className="text-sm font-medium">
            어떻게 하면 더 나아질까요? *
          </label>
          <textarea
            id="improvement"
            value={data.step4.improvement}
            onChange={(e) => updateData('step4', 'improvement', e.target.value)}
            placeholder="앞으로 더 나은 방향으로 나아갈 방법을 생각해보세요 (10글자 이상)"
            className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {data.step4.improvement.length}/500
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep5 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="text-2xl">🚀</span>
          <span>Action</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="action" className="text-sm font-medium">
            바로 실행해봐요 *
          </label>
          <textarea
            id="action"
            value={data.step5.action}
            onChange={(e) => updateData('step5', 'action', e.target.value)}
            placeholder="지금 당장 할 수 있는 구체적인 행동을 적어보세요 (10글자 이상)"
            className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            maxLength={500}
          />
          <div className="text-xs text-muted-foreground text-right">
            {data.step5.action.length}/500
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderStep6 = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <span className="text-2xl">✨</span>
          <span>한줄평</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="summary" className="text-sm font-medium">
            오늘의 기록을 한줄로 표현한다면? *
          </label>
          <textarea
            id="summary"
            value={data.step6.summary}
            onChange={(e) => updateData('step6', 'summary', e.target.value)}
            placeholder="오늘 하루를 한 문장으로 요약해보세요 (5글자 이상)"
            className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            maxLength={100}
          />
          <div className="text-xs text-muted-foreground text-right">
            {data.step6.summary.length}/100
          </div>
        </div>
      </CardContent>
    </Card>
  )

  const renderFinal = () => (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2 text-center justify-center">
          <CheckCircle className="w-8 h-8 text-green-500" />
          <span>완성!</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <div className="space-y-2">
          <p className="text-lg font-medium">오늘 나의 하루가 기록되었어요.</p>
          <p className="text-muted-foreground">알림을 통해 실행한 내용을 확인해볼까요?</p>
        </div>

        {/* 날짜 선택 */}
        <div className="space-y-2">
          <label htmlFor="selectedDate" className="text-sm font-medium">
            년월일 선택 *
          </label>
          <Input
            id="selectedDate"
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-12 text-mobile-base"
            required
          />
        </div>

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          <Button
            id="save-with-notification"
            onClick={() => handleSubmit(true)}
            disabled={!selectedDate || isSubmitting}
            className="w-full h-12 text-lg bg-primary text-primary-foreground"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>저장 중...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>알림 설정 후 저장하기</span>
              </div>
            )}
          </Button>

          <Button
            id="save-without-notification"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            variant="outline"
            className="w-full h-12 text-lg bg-blue-50 border-blue-200 text-blue-700"
          >
            알림 설정 없이 저장하기
          </Button>
        </div>
      </CardContent>
    </Card>
  )

  const renderStepContent = () => {
    switch (currentStep) {
      case 1: return renderStep1()
      case 2: return renderStep2()
      case 3: return renderStep3()
      case 4: return renderStep4()
      case 5: return renderStep5()
      case 6: return renderStep6()
      default: return null
    }
  }

  const renderNavigation = () => {
    if (currentStep === 7) return null // Final step

    return (
      <div className="flex space-x-3">
        {currentStep > 1 && (
          <Button
            onClick={handlePrevious}
            variant="outline"
            className="flex-1 h-12 text-lg bg-gray-50 border-gray-200 text-gray-700"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            이전
          </Button>
        )}
        
        {currentStep < 6 ? (
          <Button
            onClick={handleNext}
            disabled={!canProceed(currentStep)}
            className="flex-1 h-12 text-lg bg-primary text-primary-foreground"
          >
            다음
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        ) : (
          <Button
            onClick={() => setCurrentStep(7)}
            disabled={!canProceed(currentStep)}
            className="w-full h-12 text-lg bg-primary text-primary-foreground"
          >
            작성 마치기
            <CheckCircle className="w-5 h-5 ml-2" />
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">오늘을 기억할래</h1>
        <p className="text-muted-foreground text-mobile-sm">
          {currentStep <= 6 ? `Step ${currentStep}` : '완성!'}
        </p>
      </div>

      {/* 진행 단계 표시 */}
      {currentStep <= 6 && (
        <div className="flex space-x-2">
          {[1, 2, 3, 4, 5, 6].map((step) => (
            <div
              key={step}
              className={`flex-1 h-2 rounded-full transition-colors ${
                step <= currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      )}

             {/* 단계별 콘텐츠 */}
       {currentStep <= 6 ? renderStepContent() : renderFinal()}

       {/* 네비게이션 버튼 */}
       {currentStep <= 6 && renderNavigation()}

      {/* 취소 버튼 (Step 1에서만) */}
      {currentStep === 1 && (
        <Button
          onClick={() => router.back()}
          variant="outline"
          className="w-full h-12 text-lg bg-red-50 border-red-200 text-red-700"
        >
          취소
        </Button>
      )}

      {/* 하단 네비게이션과 겹치지 않도록 여백 추가 */}
      <div className="h-12"></div>
    </div>
  )
}
