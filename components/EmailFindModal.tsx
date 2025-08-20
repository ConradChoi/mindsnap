'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { checkEmailExists, generateVerificationCode, verifyCode } from '@/lib/auth'

interface EmailFindModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function EmailFindModal({ isOpen, onClose }: EmailFindModalProps) {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [verificationCode, setVerificationCode] = useState('')
  const [step, setStep] = useState<'email' | 'verification' | 'result'>('email')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [foundEmail, setFoundEmail] = useState('')
  const [storedVerificationCode, setStoredVerificationCode] = useState('')

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      setError('이메일을 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Firebase에서 이메일 존재 여부 확인
      const emailExists = await checkEmailExists(email)
      
      if (emailExists) {
        // 인증번호 생성 및 저장 (실제로는 서버에서 이메일 발송)
        const verificationCode = generateVerificationCode()
        setStoredVerificationCode(verificationCode)
        
        // TODO: 실제 이메일 발송 로직 (서버에서 처리)
        console.log('인증번호:', verificationCode) // 개발용 로그
        
        setSuccess('인증번호가 발송되었습니다.')
        setStep('verification')
      } else {
        setError('가입된 이메일이 없습니다.')
      }
    } catch (error) {
      console.error('Error checking email:', error)
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleVerificationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!verificationCode) {
      setError('인증번호를 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // 인증번호 검증
      if (verifyCode(verificationCode, storedVerificationCode)) {
        setFoundEmail(email)
        setStep('result')
      } else {
        setError('인증번호가 올바르지 않습니다.')
      }
    } catch (error) {
      console.error('Error verifying code:', error)
      setError('오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setEmail('')
    setVerificationCode('')
    setStep('email')
    setError('')
    setSuccess('')
    setFoundEmail('')
    setStoredVerificationCode('')
    onClose()
  }

  const maskEmail = (email: string) => {
    const [localPart, domain] = email.split('@')
    if (localPart.length <= 3) {
      return email
    }
    const maskedLocal = localPart.substring(0, 3) + '*'.repeat(localPart.length - 3)
    return `${maskedLocal}@${domain}`
  }

  const handleLogin = () => {
    handleClose()
    router.push('/login')
  }

  const handleSignUp = () => {
    handleClose()
    router.push('/login')
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {step === 'email' && '이메일 찾기'}
            {step === 'verification' && '인증번호 입력'}
            {step === 'result' && '이메일 확인'}
          </DialogTitle>
        </DialogHeader>

        {step === 'email' && (
          <form onSubmit={handleEmailSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="findEmail" className="text-sm font-medium">
                가입한 이메일
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  id="findEmail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="가입한 이메일을 입력하세요"
                  className="pl-10 h-12"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12"
            >
              {isLoading ? (
                <div className="flex items-center space-x-2">
                  <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  <span>확인 중...</span>
                </div>
              ) : (
                '확인'
              )}
            </Button>
          </form>
        )}

        {step === 'verification' && (
          <form onSubmit={handleVerificationSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="verificationCode" className="text-sm font-medium">
                인증번호
              </label>
              <Input
                id="verificationCode"
                type="text"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value)}
                placeholder="인증번호를 입력하세요"
                className="h-12"
                maxLength={6}
                required
              />
              <p className="text-xs text-muted-foreground">
                {email}로 발송된 인증번호를 입력해주세요.
              </p>
            </div>

            {error && (
              <div className="text-red-600 text-sm bg-red-50 p-3 rounded-md">
                {error}
              </div>
            )}

            {success && (
              <div className="text-green-600 text-sm bg-green-50 p-3 rounded-md flex items-center space-x-2">
                <CheckCircle className="w-4 h-4" />
                <span>{success}</span>
              </div>
            )}

            <div className="flex space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setStep('email')}
                className="flex-1 h-12"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                이전
              </Button>
              <Button
                type="submit"
                disabled={isLoading}
                className="flex-1 h-12"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                    <span>확인 중...</span>
                  </div>
                ) : (
                  '확인'
                )}
              </Button>
            </div>
          </form>
        )}

        {step === 'result' && (
          <div className="space-y-4">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h3 className="text-lg font-medium">이메일을 찾았습니다</h3>
              <p className="text-sm text-muted-foreground">
                가입하신 이메일 주소입니다
              </p>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <p className="text-lg font-medium text-gray-900">
                {maskEmail(foundEmail)}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                개인정보보호를 위해 일부가 마스킹 처리되었습니다
              </p>
            </div>

            <div className="flex space-x-2">
              <Button
                onClick={handleLogin}
                className="flex-1 h-12"
              >
                로그인 하기
              </Button>
              <Button
                onClick={handleSignUp}
                variant="outline"
                className="flex-1 h-12"
              >
                회원가입 하기
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
