'use client'

import { useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { User, Settings, Info, LogOut, Trash2, ChevronRight, RotateCcw } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { signOutUser, deleteAccount } from '@/lib/auth'
import packageJson from '@/package.json'

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

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

  const handleDeleteAccount = async () => {
    // 계정과 모든 기록(스냅, 마음 기록, 오늘을 기억할래, 심리 검사 결과, 첨부 파일)이
    // 영구 삭제되고 복구할 수 없다는 점을 확인 절차로 명확히 알린다(휴지통 복구 대상이 아님).
    const confirmed = confirm(
      '정말로 회원탈퇴를 하시겠습니까?\n계정과 모든 기록(사진, 음성, 마음 기록 등)이 영구적으로 삭제되며 복구할 수 없습니다.'
    )
    if (!confirmed) return

    setIsLoading(true)
    try {
      const { error } = await deleteAccount()
      if (error) {
        alert(error)
        return
      }
      router.push('/login')
    } catch (error) {
      console.error('회원탈퇴 오류:', error)
      alert('회원탈퇴 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
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
      title: '삭제된 기록',
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
              <p className="text-sm text-muted-foreground">{packageJson.version}</p>
            </div>
          </div>
          {/* 개인정보처리방침 — 앱 내에서 언제든 확인할 수 있어야 한다
              (개인정보 보호법 제30조 공개 의무 / App Store·Google Play 심사 요건) */}
          <Link
            href="/privacy-policy"
            className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/70 transition-colors"
          >
            <div>
              <p className="font-medium">개인정보처리방침</p>
              <p className="text-sm text-muted-foreground">수집 항목, 보유기간, 이용자 권리 안내</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </Link>
        </CardContent>
      </Card>

      {/* 로그아웃 및 회원탈퇴 텍스트 */}
      <div className="pt-4">
        <div className="flex justify-between">
          <button
            onClick={handleLogout}
            disabled={isLoading}
            className="text-muted-foreground hover:text-foreground transition-colors text-sm disabled:opacity-50"
          >
            로그아웃
          </button>
          <button
            onClick={handleDeleteAccount}
            disabled={isLoading}
            className="text-red-500 hover:text-red-600 transition-colors text-sm disabled:opacity-50"
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
