'use client'

import React, { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Camera, BookOpen, Settings, Home, PenTool, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EventBanner } from '@/components/ui/banner'
import { useAuth } from '@/contexts/AuthContext'
import { signOutUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'

interface MobileShellProps {
  children: React.ReactNode
}

const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const router = useRouter()

  // 배너 닫기 처리 (로컬 스토리지에 상태 저장)
  const handleBannerClose = () => {
    localStorage.setItem('mindsnap_banner_closed', 'true')
  }

  // 로그아웃 처리
  const handleLogout = async () => {
    try {
      await signOutUser()
      router.push('/login')
    } catch (error) {
      console.error('로그아웃 실패:', error)
    }
  }

  const navItems = [
    { href: '/', icon: Home, label: '홈' },
    { href: '/records', icon: PenTool, label: '기록' },
    { href: '/journal', icon: BookOpen, label: '저널' },
    { href: '/settings', icon: Settings, label: '설정' },
  ]

  // 인증되지 않은 사용자를 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user && pathname !== '/login') {
      router.push('/login')
    }
  }, [loading, user, pathname, router])

  // 로딩 중일 때는 로딩 화면 표시
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Your life is alive</p>
        </div>
      </div>
    )
  }

  // 로그인 페이지인 경우 네비게이션 없이 렌더링
  if (pathname === '/login') {
    return <>{children}</>
  }

  // 인증되지 않은 사용자는 아무것도 렌더링하지 않음 (useEffect에서 리다이렉트 처리)
  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* 상단 배너 영역 */}
      <EventBanner
        title="🎉 새로운 기능이 추가되었습니다!"
        description="마음 기록과 성격 검사 기능을 체험해보세요"
        onClose={handleBannerClose}
      />

      {/* 메인 콘텐츠 */}
      <main className="flex-1 container px-4 py-6 pb-safe-bottom">
        {children}
      </main>

      {/* 하단 탭 네비게이션 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t pb-safe-bottom">
        <div className="flex justify-around">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center min-h-touch py-2 px-3 flex-1 transition-colors",
                  isActive
                    ? "text-primary bg-primary/5"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon className="w-6 h-6 mb-1" />
                <span className="text-xs font-medium">{label}</span>
              </Link>
            )
          })}
        </div>
      </nav>

      {/* 로그아웃 버튼 (설정 페이지에서만 표시) */}
      {pathname === '/settings' && (
        <div className="fixed top-4 right-4 z-50">
          <button
            onClick={handleLogout}
            className="p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
            title="로그아웃"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  )
}

export default MobileShell
