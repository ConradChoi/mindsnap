'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Bell, Calendar, Sparkles } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getSentimentAnalysisPreference, updateSentimentAnalysisPreference } from '@/lib/supabase-service'

export default function AppSettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  
  // 알림 설정 상태
  const [rememberTodayNotification, setRememberTodayNotification] = useState(true)

  // AI 감정 분석 옵트아웃 토글 — 기본값은 true(켜짐), DB(profiles.sentiment_analysis_enabled)에서 불러온다
  const [sentimentEnabled, setSentimentEnabled] = useState(true)
  const [sentimentLoading, setSentimentLoading] = useState(false)

  useEffect(() => {
    if (user) {
      // 사용자의 알림 설정을 불러오기 (로컬 스토리지에서)
      const savedNotificationSetting = localStorage.getItem('rememberTodayNotification')
      if (savedNotificationSetting !== null) {
        setRememberTodayNotification(JSON.parse(savedNotificationSetting))
      }

      if (user.uid) {
        getSentimentAnalysisPreference(user.uid)
          .then(setSentimentEnabled)
          .catch((error) => console.error('감정 분석 설정 조회 오류:', error))
      }
    }
  }, [user])

  const handleNotificationToggle = async () => {
    setIsLoading(true)
    
    try {
      const newValue = !rememberTodayNotification
      setRememberTodayNotification(newValue)
      
      // 로컬 스토리지에 저장
      localStorage.setItem('rememberTodayNotification', JSON.stringify(newValue))
      
      // 성공 메시지
      alert(`알림이 ${newValue ? '활성화' : '비활성화'}되었습니다.`)
    } catch (error) {
      console.error('알림 설정 변경 오류:', error)
      alert('알림 설정 변경 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSentimentToggle = async () => {
    if (!user?.uid) return
    setSentimentLoading(true)

    try {
      const newValue = !sentimentEnabled
      await updateSentimentAnalysisPreference(user.uid, newValue)
      setSentimentEnabled(newValue)
    } catch (error) {
      console.error('감정 분석 설정 변경 오류:', error)
      alert('설정 변경 중 오류가 발생했습니다.')
    } finally {
      setSentimentLoading(false)
    }
  }

  const handleCancel = () => {
    router.back()
  }

  return (
    <div className="space-y-6 pb-28">
      {/* 헤더 */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={handleCancel}
          className="p-2"
        >
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">앱 설정</h1>
          <p className="text-muted-foreground text-mobile-sm">
            앱 사용 환경을 설정하세요
          </p>
        </div>
      </div>

      {/* 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-primary" />
            <span>알림 설정</span>
          </CardTitle>
          <CardDescription>
            앱에서 받을 알림을 설정하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 오늘을 기억할래 알림 설정 */}
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Calendar className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">오늘을 기억할래</p>
              </div>
            </div>
            <button
              onClick={handleNotificationToggle}
              disabled={isLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                rememberTodayNotification ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  rememberTodayNotification ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* AI 감정 분석 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>AI 감정 분석</span>
          </CardTitle>
          <CardDescription>
            기록한 글을 바탕으로 감정과 키워드를 분석해서 보여드려요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">감정 분석 사용</p>
                <p className="text-xs text-muted-foreground">
                  끄면 이후 작성하는 기록은 분석되지 않아요
                </p>
              </div>
            </div>
            <button
              onClick={handleSentimentToggle}
              disabled={sentimentLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                sentimentEnabled ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  sentimentEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>

      {/* 추가 설정 영역 (향후 확장용) */}
      <Card>
        <CardHeader>
          <CardTitle>기타 설정</CardTitle>
          <CardDescription>
            추가 설정 기능은 준비 중입니다
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <Bell className="w-8 h-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground">
              더 많은 설정 옵션이 곧 추가될 예정입니다
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 버튼 영역 */}
      <div className="flex space-x-3 pt-4">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="flex-1"
        >
          완료
        </Button>
      </div>
    </div>
  )
}
