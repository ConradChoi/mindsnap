'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Settings, Info, LogOut, Trash2, ChevronRight, RotateCcw } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { signOutUser } from '@/lib/auth'
import { useAuth } from '@/contexts/AuthContext'

export default function SettingsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [deletedItemsCount, setDeletedItemsCount] = useState(0)

  // 삭제된 항목 개수 계산
  const calculateDeletedItemsCount = () => {
    if (!user?.uid) return 0

    try {
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      
      let count = 0
      
      // 스냅 삭제된 항목 개수
      const deletedSnapsData = localStorage.getItem(`deletedSnaps_${user.uid}`)
      if (deletedSnapsData) {
        try {
          const data = JSON.parse(deletedSnapsData)
          if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach(itemId => {
              const deletedAt = new Date(data[itemId].deletedAt)
              if (deletedAt >= twoWeeksAgo) {
                count++
              }
            })
          } else if (Array.isArray(data)) {
            count += data.length
          }
        } catch (e) {
          console.error('Error parsing deleted snaps data:', e)
        }
      }
      
      // 마음 기록 삭제된 항목 개수
      const deletedMoodData = localStorage.getItem(`deletedMoodRecords_${user.uid}`)
      if (deletedMoodData) {
        try {
          const data = JSON.parse(deletedMoodData)
          if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach(itemId => {
              const deletedAt = new Date(data[itemId].deletedAt)
              if (deletedAt >= twoWeeksAgo) {
                count++
              }
            })
          } else if (Array.isArray(data)) {
            count += data.length
          }
        } catch (e) {
          console.error('Error parsing deleted mood data:', e)
        }
      }
      
      // 오늘을 기억할래 삭제된 항목 개수
      const deletedRememberData = localStorage.getItem(`deletedRememberRecords_${user.uid}`)
      if (deletedRememberData) {
        try {
          const data = JSON.parse(deletedRememberData)
          if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach(itemId => {
              const deletedAt = new Date(data[itemId].deletedAt)
              if (deletedAt >= twoWeeksAgo) {
                count++
              }
            })
          } else if (Array.isArray(data)) {
            count += data.length
          }
        } catch (e) {
          console.error('Error parsing deleted remember data:', e)
        }
      }
      
      return count
    } catch (error) {
      console.error('Error calculating deleted items count:', error)
      return 0
    }
  }

  // 컴포넌트 마운트 시 삭제된 항목 개수 계산
  useEffect(() => {
    if (user?.uid) {
      const count = calculateDeletedItemsCount()
      setDeletedItemsCount(count)
    }
  }, [user])

  // 페이지 포커스 시 삭제된 항목 개수 새로고침
  useEffect(() => {
    const handleFocus = () => {
      if (user?.uid) {
        const count = calculateDeletedItemsCount()
        setDeletedItemsCount(count)
      }
    }

    window.addEventListener('focus', handleFocus)
    return () => window.removeEventListener('focus', handleFocus)
  }, [user])

  const handleLogout = async () => {
    setIsLoading(true)
    try {
      await signOutUser()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 오류:', error)
      alert('로그아웃 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDeleteAccount = () => {
    if (confirm('정말로 회원탈퇴를 하시겠습니까?\n이 작업은 되돌릴 수 없습니다.')) {
      // TODO: 회원탈퇴 로직 구현
      alert('회원탈퇴 기능은 준비 중입니다.')
    }
  }


  // 메뉴 항목들을 동적으로 생성
  const getMenuItems = () => [
    {
      title: '내 정보 수정',
      description: '프로필 정보 및 개인 설정',
      icon: User,
      onClick: () => {
        router.push('/settings/edit-profile')
      }
    },
    {
      title: '설정',
      description: '앱 사용 환경 설정',
      icon: Settings,
      onClick: () => {
        router.push('/settings/app-settings')
      }
    },
    {
      title: `삭제된 기록 (${deletedItemsCount})`,
      description: '2주 이내 삭제한 항목들을 복구',
      icon: RotateCcw,
      onClick: () => {
        router.push('/settings/restore-deleted')
      }
    },
    {
      title: '로그아웃',
      description: '현재 계정에서 로그아웃',
      icon: LogOut,
      onClick: handleLogout
    },
    {
      title: '회원탈퇴',
      description: '계정을 영구적으로 삭제',
      icon: Trash2,
      onClick: handleDeleteAccount
    }
  ]

  const menuItems = getMenuItems()

  return (
    <div className="space-y-6 pb-28">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground text-mobile-sm">
          계정 및 앱 설정을 관리하세요
        </p>
      </div>

      {/* 메뉴 목록 */}
      <div className="space-y-2">
        {menuItems.slice(0, 3).map((item, index) => (
          <Card key={index} className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={item.onClick}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <item.icon className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{item.title}</p>
                    <p className="text-sm text-muted-foreground">{item.description}</p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* 앱 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-primary" />
            <span>앱 정보</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">앱 버전</p>
              <p className="text-sm text-muted-foreground">1.00</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">최신 업데이트</p>
              <p className="text-sm text-muted-foreground">2024-01-26</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 로그아웃 및 회원탈퇴 텍스트 */}
      <div className="pt-4">
        <div className="flex justify-between">
          <button
            onClick={handleLogout}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm"
          >
            로그아웃
          </button>
          <button
            onClick={handleDeleteAccount}
            className="text-red-500 hover:text-red-600 transition-colors text-sm"
          >
            회원탈퇴
          </button>
        </div>
      </div>

      {/* 로딩 상태 */}
      {isLoading && (
        <div className="text-center py-4">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-sm text-muted-foreground mt-2">처리 중...</p>
        </div>
      )}
    </div>
  )
}
