'use client'

import React, { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Camera, BookOpen, Settings, Home, PenTool, LogOut } from 'lucide-react'
import { cn } from '@/lib/utils'
import { EventBanner } from '@/components/ui/banner'
import { useAuth } from '@/contexts/AuthContext'
import { signOutUser } from '@/lib/auth'
import { useRouter } from 'next/navigation'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'

interface MobileShellProps {
  children: React.ReactNode
}

const MobileShell: React.FC<MobileShellProps> = ({ children }) => {
  const pathname = usePathname()
  const { user, loading } = useAuth()
  const router = useRouter()

  // 공지 배너 상태 — localStorage에서 로드하기 전까지는 렌더링하지 않는다(bannerLoaded).
  // 이렇게 안 하면 Banner가 기본값(풀배너)으로 먼저 마운트된 뒤 저장된 상태로 바뀌면서
  // 화면이 한 번 깜빡이게 된다.
  const [bannerLoaded, setBannerLoaded] = useState(false)
  const [bannerCollapsed, setBannerCollapsed] = useState(false)
  const [bannerHidden, setBannerHidden] = useState(false)

  useEffect(() => {
    setBannerHidden(localStorage.getItem('mindsnap_banner_hidden') === 'true')
    setBannerCollapsed(localStorage.getItem('mindsnap_banner_closed') === 'true')
    setBannerLoaded(true)
  }, [])

  // 배너 "닫기" — 풀배너를 접어서 작은 "공지사항 보기" 링크로 바꾼다
  const handleBannerClose = () => {
    localStorage.setItem('mindsnap_banner_closed', 'true')
  }

  // "공지사항 보기" 링크의 X — 그 링크마저 완전히 숨긴다
  const handleBannerDismiss = () => {
    localStorage.setItem('mindsnap_banner_hidden', 'true')
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

  // Android 하드웨어 뒤로가기 버튼 처리.
  // 홈('/')에서는 이 앱의 최상위 화면이므로 바로 종료하고, 그 외 화면에서는 브라우저 히스토리가
  // 있으면 뒤로 이동, 없으면(딥링크로 바로 진입한 경우 등) 홈으로 보낸다.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listenerHandle = CapacitorApp.addListener('backButton', ({ canGoBack }) => {
      if (pathname === '/') {
        CapacitorApp.exitApp()
      } else if (canGoBack) {
        router.back()
      } else {
        router.push('/')
      }
    })

    return () => {
      listenerHandle.then((handle) => handle.remove())
    }
  }, [pathname, router])

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
    // h-dvh + overflow-hidden: 이 컨테이너 자체는 화면 높이에 고정되고 스크롤되지 않는다.
    // 배너/탭바는 이 안의 일반 flex 자식이라 항상 제자리에 있고, 아래 <main>만 내부적으로
    // 스크롤된다 — position: fixed 없이도 탭바가 스크롤 중에 계속 화면에 보이게 하는 구조.
    // (position: fixed는 iOS WKWebView에서 콘텐츠 높이/키보드 표시 등에 따라 위치가
    // 흔들리는 오래된 문제가 있어 피한다.)
    <div className="h-dvh bg-background flex flex-col pt-safe-top overflow-hidden">
      {/* 상단 배너 영역 */}
      {bannerLoaded && (
        <EventBanner
          title="🎉 새로운 기능이 추가되었습니다!"
          description="마음 기록과 성격 검사 기능을 체험해보세요"
          onClose={handleBannerClose}
          onDismissReopen={handleBannerDismiss}
          initiallyCollapsed={bannerCollapsed}
          initiallyHidden={bannerHidden}
        />
      )}

      {/* 메인 콘텐츠 — 이 영역만 스크롤된다 */}
      <main className="flex-1 min-h-0 overflow-y-auto container px-4 py-6 pb-safe-bottom">
        {children}
      </main>

      {/* 하단 탭 네비게이션
          iOS WKWebView에서 position: fixed가 콘텐츠 높이/키보드 표시 등에 따라 위치가
          흔들리는 문제가 있어(오래된 WebView 이슈), fixed 대신 flex 레이아웃의 자연스러운
          배치(부모가 min-h-screen + flex-col, main이 flex-1이라 nav는 항상 화면 하단에 위치)를
          사용한다. shrink-0로 main이 커져도 눌리지 않게 한다. */}
      <nav className="shrink-0 bg-background border-t pb-safe-bottom">
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

    </div>
  )
}

export default MobileShell
