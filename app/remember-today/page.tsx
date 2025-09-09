'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Heart, Calendar, Smile, Meh, Frown, ArrowLeft, ArrowRight, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createRememberToday } from '@/lib/firebase-service'
import { useAuth } from '@/contexts/AuthContext'

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
  const { user } = useAuth()
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
  
  // 알림 설정 확인 함수
  const getNotificationSetting = () => {
    const savedSetting = localStorage.getItem('rememberTodayNotification')
    return savedSetting !== null ? JSON.parse(savedSetting) : true
  }
  
  // 날짜 선택 시 알림 표시 함수
  const showDateSelectionNotification = (date: string) => {
    if (!getNotificationSetting()) return
    
    const formattedDate = formatDate(date)
    if (formattedDate) {
      // 브라우저 알림 API 사용
      if ('Notification' in window) {
        if (Notification.permission === 'granted') {
          new Notification('날짜 선택 완료', {
            body: `선택한 날짜: ${formattedDate}`,
            icon: '/mindsnap_logo.png'
          })
        } else if (Notification.permission !== 'denied') {
          Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
              new Notification('날짜 선택 완료', {
                body: `선택한 날짜: ${formattedDate}`,
                icon: '/mindsnap_logo.png'
              })
            }
          })
        }
      }
      
      // 브라우저 알림이 지원되지 않는 경우 alert 사용
      if (!('Notification' in window)) {
        alert(`날짜가 선택되었습니다: ${formattedDate}`)
      }
    }
  }
  
  // 날짜 형식을 YYYY-MM-DD로 변환하는 함수
  const formatDate = (dateString: string) => {
    if (!dateString) return ''
    
    // 이미 YYYY-MM-DD 형식인 경우 그대로 반환
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
      return dateString
    }
    
    // 다른 형식의 날짜를 YYYY-MM-DD로 변환
    const date = new Date(dateString)
    if (isNaN(date.getTime())) return dateString
    
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    
    return `${year}-${month}-${day}`
  }
  
  // 날짜 입력 처리 (수동 입력용)
  const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    // YYYY-MM-DD 형식 검증
    if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      setSelectedDate(value)
    } else if (value === '') {
      setSelectedDate('')
    }
    // 다른 형식은 무시
  }
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
    if (!user?.uid) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    // 알림 설정이 OFF인 경우 확인 메시지 표시
    if (withNotification && !getNotificationSetting()) {
      const shouldProceed = confirm('현재 알림이 꺼져 있습니다. 저장 시 알림은 자동으로 활성화 됩니다.\n계속하시겠습니까?')
      if (!shouldProceed) {
        // 취소 선택 시 저장 중단
        return
      } else {
        // 확인 선택 시 알림 설정을 자동으로 활성화
        localStorage.setItem('rememberTodayNotification', JSON.stringify(true))
      }
    }

    setIsSubmitting(true)
    try {
      const rememberData = {
        userId: user.uid,
        mood: data.step1.mood,
        memorableEvent: data.step1.memorableEvent,
        reason: data.step2.reason,
        cause: data.step3.cause,
        improvement: data.step4.improvement,
        action: data.step5.action,
        summary: data.step6.summary,
        selectedDate: selectedDate || null,
        withNotification,
      }

      const result = await createRememberToday(rememberData)
      console.log('기억하기 저장 성공:', result)

      // 성공 시 저널 > 오늘 탭으로 이동
      setTimeout(() => {
        router.push('/journal?tab=remember')
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
            className={`w-full h-24 px-3 py-2 border rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              data.step1.memorableEvent.length > 0 && data.step1.memorableEvent.length < 10
                ? 'border-red-300 focus:ring-red-200'
                : data.step1.memorableEvent.length >= 10
                ? 'border-green-300 focus:ring-green-200'
                : 'border-input'
            }`}
            maxLength={500}
          />
          <div className="flex items-center justify-between text-xs">
            <div className={`${
              data.step1.memorableEvent.length > 0 && data.step1.memorableEvent.length < 10
                ? 'text-red-500'
                : data.step1.memorableEvent.length >= 10
                ? 'text-green-500'
                : 'text-muted-foreground'
            }`}>
              {data.step1.memorableEvent.length < 10 
                ? `최소 10글자 이상 입력해주세요 (${data.step1.memorableEvent.length}/10)`
                : `글자 수: ${data.step1.memorableEvent.length}/500`
              }
            </div>
            {data.step1.memorableEvent.length >= 10 && (
              <div className="text-green-500">✓</div>
            )}
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
            className={`w-full h-24 px-3 py-2 border rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              data.step2.reason.length > 0 && data.step2.reason.length < 10
                ? 'border-red-300 focus:ring-red-200'
                : data.step2.reason.length >= 10
                ? 'border-green-300 focus:ring-green-200'
                : 'border-input'
            }`}
            maxLength={500}
          />
          <div className="flex items-center justify-between text-xs">
            <div className={`${
              data.step2.reason.length > 0 && data.step2.reason.length < 10
                ? 'text-red-500'
                : data.step2.reason.length >= 10
                ? 'text-green-500'
                : 'text-muted-foreground'
            }`}>
              {data.step2.reason.length < 10 
                ? `최소 10글자 이상 입력해주세요 (${data.step2.reason.length}/10)`
                : `글자 수: ${data.step2.reason.length}/500`
              }
            </div>
            {data.step2.reason.length >= 10 && (
              <div className="text-green-500">✓</div>
            )}
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
            className={`w-full h-24 px-3 py-2 border rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${
              data.step6.summary.length > 0 && data.step6.summary.length < 5
                ? 'border-red-300 focus:ring-red-200'
                : data.step6.summary.length >= 5
                ? 'border-green-300 focus:ring-green-200'
                : 'border-input'
            }`}
            maxLength={100}
          />
          <div className="flex items-center justify-between text-xs">
            <div className={`${
              data.step6.summary.length > 0 && data.step6.summary.length < 5
                ? 'text-red-500'
                : data.step6.summary.length >= 5
                ? 'text-green-500'
                : 'text-muted-foreground'
            }`}>
              {data.step6.summary.length < 5 
                ? `최소 5글자 이상 입력해주세요 (${data.step6.summary.length}/5)`
                : `글자 수: ${data.step6.summary.length}/100`
              }
            </div>
            {data.step6.summary.length >= 5 && (
              <div className="text-green-500">✓</div>
            )}
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
          <div className="relative">
            {/* 실제 date input */}
            <input
              id="selectedDate"
              type="date"
              value={selectedDate}
              onChange={(e) => {
                if (e.target.value) {
                  setSelectedDate(e.target.value)
                  // 날짜 선택 시 알림 표시
                  showDateSelectionNotification(e.target.value)
                }
              }}
              className="w-full h-12 px-3 py-2 border border-input rounded-md bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 pr-12"
              required
            />
            {/* 달력 아이콘 */}
            <button
              type="button"
              onClick={() => {
                const dateInput = document.getElementById('selectedDate') as HTMLInputElement
                if (dateInput) {
                  // showPicker가 지원되는 경우 사용, 아니면 click 사용
                  if (dateInput.showPicker) {
                    dateInput.showPicker()
                  } else {
                    dateInput.click()
                  }
                }
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground hover:scale-110 transition-transform"
            >
              <Calendar className="w-5 h-5" />
            </button>
          </div>
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
