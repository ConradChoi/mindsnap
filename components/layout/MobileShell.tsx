'use client'

import React, { useEffect, useRef, useState } from 'react'
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

// 로그인 없이 접근할 수 있는 경로.
// 개인정보처리방침은 App Store/Google Play 심사와 법령(개인정보 보호법 제30조: 정보주체가 언제든지
// 쉽게 확인할 수 있도록 공개)상 비로그인 상태에서도 반드시 열람 가능해야 하므로 예외로 둔다.
const PUBLIC_PATHS = ['/login', '/privacy-policy']

// Capacitor 정적 빌드(output: 'export')에서는 경로 끝에 슬래시가 붙는 경우가 있어 비교 전에 정규화한다.
const normalizePath = (path: string) => (path !== '/' && path.endsWith('/') ? path.slice(0, -1) : path)

const isPublicPath = (path: string) => PUBLIC_PATHS.includes(normalizePath(path))

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

  // 하단 탭바를 "스크롤 중" 또는 "키보드가 열려있음" 둘 중 하나라도 해당하면 숨긴다.
  // 두 조건을 별도 상태로 추적해서 하나가 먼저 끝나도 다른 조건이 남아있으면 계속 숨겨진다.
  const mainRef = useRef<HTMLElement>(null)
  const [isScrolling, setIsScrolling] = useState(false)
  const [isKeyboardOpen, setIsKeyboardOpen] = useState(false)
  const navVisible = !isScrolling && !isKeyboardOpen

  useEffect(() => {
    const mainEl = mainRef.current
    if (!mainEl) return

    // 스크롤 중엔 숨기고, 스크롤이 멈춘 뒤(200ms 동안 추가 스크롤 없음) 다시 보여준다.
    let scrollTimeout: ReturnType<typeof setTimeout>
    const handleScroll = () => {
      setIsScrolling(true)
      clearTimeout(scrollTimeout)
      scrollTimeout = setTimeout(() => setIsScrolling(false), 200)
    }

    // 텍스트 입력에 포커스가 가는 순간(키보드가 뜨기 시작하기 전) 바로 숨긴다 —
    // 키보드 표시/숨김 애니메이션과 fixed 요소의 위치 재계산이 겹치는 상황 자체를
    // 만들지 않기 위함(iOS WKWebView에서 둘이 겹치면 위치가 흔들리던 과거 이슈 회피).
    const isTextInput = (el: EventTarget | null) =>
      el instanceof HTMLElement &&
      (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)
    const handleFocusIn = (e: FocusEvent) => {
      if (isTextInput(e.target)) setIsKeyboardOpen(true)
    }
    const handleFocusOut = (e: FocusEvent) => {
      if (isTextInput(e.target)) setIsKeyboardOpen(false)
    }

    mainEl.addEventListener('scroll', handleScroll, { passive: true })
    document.addEventListener('focusin', handleFocusIn)
    document.addEventListener('focusout', handleFocusOut)

    return () => {
      clearTimeout(scrollTimeout)
      mainEl.removeEventListener('scroll', handleScroll)
      document.removeEventListener('focusin', handleFocusIn)
      document.removeEventListener('focusout', handleFocusOut)
    }
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

  // 인증되지 않은 사용자를 로그인 페이지로 리다이렉트 (공개 경로는 제외)
  useEffect(() => {
    if (!loading && !user && !isPublicPath(pathname)) {
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
  if (normalizePath(pathname) === '/login') {
    return <>{children}</>
  }

  // 비로그인 상태에서 공개 경로(개인정보처리방침 등)에 접근한 경우:
  // 하단 탭 네비게이션 없이 콘텐츠만 스크롤 가능한 형태로 보여준다.
  // (스토어 심사자/미가입자도 로그인 없이 방침 전문을 볼 수 있어야 한다.)
  if (!user && isPublicPath(pathname)) {
    return (
      <div className="min-h-screen bg-background pt-safe-top pb-safe-bottom">
        <div className="container px-4 py-6">{children}</div>
      </div>
    )
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

      {/* 메인 콘텐츠 — 이 영역만 스크롤된다.
          하단 탭바가 fixed 오버레이라 그 높이(약 4.5rem)만큼 pb를 더 줘서
          탭바가 보일 때 마지막 콘텐츠를 가리지 않게 한다. */}
      <main ref={mainRef} className="flex-1 min-h-0 overflow-y-auto container px-4 py-6 pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      {/* 하단 탭 네비게이션 — 화면 가장자리에서 띄운 플로팅 바.
          스크롤 중이거나 텍스트 입력 포커스(키보드 열림) 중엔 translateY로 감춘다.
          과거 iOS WKWebView에서 position: fixed가 "키보드 표시/숨김 애니메이션"과
          겹칠 때 위치가 흔들리던 문제가 있었는데, 포커스 시점에 키보드 애니메이션보다
          먼저 숨겨버려서 그 두 조건이 동시에 일어나는 상황 자체를 만들지 않는다. */}
      <nav
        className={cn(
          'fixed left-4 right-4 bottom-nav-floating z-40',
          'bg-background border rounded-2xl shadow-lg',
          'transition-transform duration-200 ease-out',
          navVisible ? 'translate-y-0' : 'translate-y-[calc(100%+1rem)]'
        )}
      >
        <div className="flex justify-around">
          {navItems.map(({ href, icon: Icon, label }) => {
            const isActive = pathname === href
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center min-h-touch py-2 px-3 flex-1 transition-colors rounded-2xl",
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
