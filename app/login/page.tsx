'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Mail, Lock, Eye, EyeOff, ArrowRight, CheckCircle } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { signInWithEmail, signUpWithEmail, signInWithProvider, type SocialProvider } from '@/lib/auth'
import EmailFindModal from '@/components/EmailFindModal'
import { useAuth } from '@/contexts/AuthContext'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'

// 카카오는 이메일 동의항목이 "비즈 앱 전환" 후에만 신청 가능해(카카오 정책) 현재 Supabase에서
// 비활성화 상태다. 코드는 남겨두고 버튼만 숨긴다 — 비즈 앱 전환 완료되면 이 값만 true로 바꾸면 된다.
const SHOW_KAKAO_LOGIN = false

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isSignUp, setIsSignUp] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [autoLogin, setAutoLogin] = useState(false)
  const [isEmailFindModalOpen, setIsEmailFindModalOpen] = useState(false)
  const [isPasswordResetModalOpen, setIsPasswordResetModalOpen] = useState(false)
  const [modalMode, setModalMode] = useState<'email-find' | 'password-reset'>('email-find')

  // 로그인 성공 시 홈으로 이동. 웹에서는 페이지 전체 리다이렉트로 화면이 새로 열려서
  // 이 처리가 원래 필요 없었지만, 네이티브 앱의 소셜 로그인은 시스템 브라우저 →
  // 커스텀 URL 스킴 딥링크로 돌아오는 방식이라 페이지가 리로드되지 않는다.
  // AuthContext의 user 상태가 바뀌는 시점(딥링크로 세션 발급 완료)에 맞춰 직접 이동시킨다.
  useEffect(() => {
    if (user) {
      router.push('/')
    }
  }, [user, router])

  // 네이티브 앱: 시스템 브라우저가 닫히는 시점(로그인 완료로 우리가 직접 닫은 경우든,
  // 사용자가 로그인 도중 브라우저를 취소한 경우든)에 항상 발생하는 이벤트.
  // 로그인이 성공했다면 위 user useEffect가 곧 홈으로 이동시키고, 실패/취소라면
  // 이 리스너가 "로그인 중..." 버튼을 원래 상태로 되돌려 화면이 멈춰있지 않게 한다.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listenerHandle = Browser.addListener('browserFinished', () => {
      setIsLoading(false)
    })

    return () => {
      listenerHandle.then((handle) => handle.remove())
    }
  }, [])

  // 이메일 인증 완료 상태 확인
  useEffect(() => {
    const verified = searchParams.get('verified')
    if (verified === 'true') {
      setSuccess('이메일 인증이 완료되었습니다. 로그인해주세요.')
      // URL에서 verified 파라미터 제거
      router.replace('/login')
    }
  }, [searchParams, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email || !password) {
      setError('이메일과 비밀번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      if (isSignUp) {
        // 회원가입
        const result = await signUpWithEmail(email, password)
        if (result.error) {
          setError(result.error)
        } else if (result.session) {
          // Supabase의 "Confirm email"이 꺼져 있으면 가입과 동시에 로그인 상태가 된다.
          setSuccess('회원가입이 완료되었습니다. 바로 이용하실 수 있어요.')
          setTimeout(() => {
            router.push('/')
          }, 1000)
        } else {
          // Confirm email이 켜져 있는 경우에만 인증 메일 확인 안내가 필요하다.
          setSuccess('회원가입이 완료되었습니다. 이메일을 확인하여 인증을 완료해주세요.')
          // 회원가입 성공 후 입력 필드 초기화
          setEmail('')
          setPassword('')
          setShowPassword(false)
          setIsSignUp(false)
        }
      } else {
        // 로그인
        const result = await signInWithEmail(email, password)
        if (result.error) {
          // lib/auth.ts의 translateAuthError가 이미 한글 메시지로 변환해서 반환한다
          setError(result.error)
        } else {
          setSuccess('로그인되었습니다.')
          setTimeout(() => {
            router.push('/')
          }, 1000)
        }
      }
    } catch (error) {
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleSocialLogin = async (provider: SocialProvider) => {
    setError('')
    setSuccess('')
    setIsLoading(true)
    const result = await signInWithProvider(provider)
    // 웹: 성공 시 Supabase가 즉시 페이지 자체를 리다이렉트하므로 별도 처리가 필요 없다.
    // 네이티브: 성공 시 시스템 브라우저가 뜬 상태라, 로그인 완료/취소 여부는 아래
    // browserFinished 리스너와 위쪽의 user 상태 useEffect가 각각 처리한다.
    if (result.error) {
      setError(result.error)
      setIsLoading(false)
    }
  }

  const toggleSignUpMode = () => {
    setIsSignUp(!isSignUp)
    setError('')
    setSuccess('')
    // 모드 전환 시 입력 필드 초기화
    setEmail('')
    setPassword('')
    setShowPassword(false)
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 pt-16">
      <div className="w-full max-w-md space-y-8">
        {/* 로고 및 타이틀 */}
        <div className="text-center space-y-4">
          <div className="w-32 h-16 mx-auto mb-4">
            <img src="/mindsnap_logo.png" alt="MindSnap Logo" className="w-full h-full object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-foreground">MindSnap</h1>
          <p className="text-muted-foreground text-lg">마음을 기록하고 성장하는 시간</p>
        </div>

        {/* 로그인/회원가입 폼 */}
        <Card>
          <CardHeader>
            <CardTitle className="text-center">
              {isSignUp ? '회원가입' : '로그인'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {/* SNS 로그인 — 각 플랫폼 개발자 계정 등록 및 Supabase 연결 전까지는 클릭 시 에러가 표시된다 */}
            <div className="space-y-2">
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => handleSocialLogin('google')}
                className="w-full h-12 bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              >
                Google로 계속하기
              </Button>
              <Button
                type="button"
                variant="outline"
                disabled={isLoading}
                onClick={() => handleSocialLogin('apple')}
                className="w-full h-12 bg-black text-white border-black hover:bg-gray-900 hover:text-white"
              >
                Apple로 계속하기
              </Button>
              {SHOW_KAKAO_LOGIN && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={isLoading}
                  onClick={() => handleSocialLogin('kakao')}
                  className="w-full h-12 bg-[#FEE500] text-black border-[#FEE500] hover:bg-[#FDD800] hover:text-black"
                >
                  카카오로 계속하기
                </Button>
              )}
            </div>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">또는 이메일로 계속하기</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 이메일 입력 */}
              <div className="space-y-2">
                <label htmlFor="email" className="text-sm font-medium">
                  이메일
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="이메일을 입력하세요"
                    className="pl-10 h-12"
                    required
                  />
                </div>
              </div>

              {/* 비밀번호 입력 */}
              <div className="space-y-2">
                <label htmlFor="password" className="text-sm font-medium">
                  비밀번호
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="비밀번호를 입력하세요"
                    className="pl-10 pr-10 h-12"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* 에러 메시지 */}
              {error && (
                <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                  {error}
                </div>
              )}

              {/* 성공 메시지 */}
              {success && (
                <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md flex items-center space-x-2">
                  <CheckCircle className="w-4 h-4" />
                  <span>{success}</span>
                </div>
              )}

              {/* 제출 버튼 */}
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full h-12 text-lg"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>{isSignUp ? '가입 중...' : '로그인 중...'}</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <span>{isSignUp ? '회원가입' : '로그인'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </div>
                )}
              </Button>

              {/* 자동로그인 및 찾기 링크 (로그인 모드에서만 표시) */}
              {!isSignUp && (
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="autoLogin"
                      checked={autoLogin}
                      onCheckedChange={(checked) => setAutoLogin(checked as boolean)}
                    />
                    <label htmlFor="autoLogin" className="text-muted-foreground cursor-pointer">
                      자동로그인
                    </label>
                  </div>
                  <div className="flex items-center space-x-4">
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        setModalMode('email-find')
                        setIsEmailFindModalOpen(true)
                      }}
                    >
                      이메일 찾기
                    </button>
                    <span className="text-muted-foreground">|</span>
                    <button
                      type="button"
                      className="text-muted-foreground hover:text-foreground transition-colors"
                      onClick={() => {
                        setModalMode('password-reset')
                        setIsEmailFindModalOpen(true)
                      }}
                    >
                      비밀번호 찾기
                    </button>
                  </div>
                </div>
              )}

              {/* 모드 전환 버튼 */}
              <Button
                type="button"
                variant="outline"
                onClick={toggleSignUpMode}
                className="w-full h-12"
              >
                {isSignUp ? '이미 계정이 있으신가요? 로그인' : '계정이 없으신가요? 회원가입'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* 이메일 찾기/비밀번호 찾기 모달 */}
      <EmailFindModal
        isOpen={isEmailFindModalOpen}
        onClose={() => setIsEmailFindModalOpen(false)}
        mode={modalMode}
      />
    </div>
  )
}
