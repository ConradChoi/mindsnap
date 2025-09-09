'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ArrowLeft, User, Mail, Lock, Save, X } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { updatePassword, updateProfile } from '@/lib/auth'
import { canChangeNickname as checkNicknameChangeEligibility } from '@/lib/firebase-service'

export default function EditProfilePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [isLoading, setIsLoading] = useState(false)
  const [isPasswordLoading, setIsPasswordLoading] = useState(false)
  
  // 폼 상태
  const [nickname, setNickname] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // 에러 상태
  const [passwordError, setPasswordError] = useState('')
  const [nicknameError, setNicknameError] = useState('')
  
  // 닉네임 변경 제한 상태
  const [canChangeNickname, setCanChangeNickname] = useState(true)
  const [daysRemaining, setDaysRemaining] = useState(0)
  const [lastChangeDate, setLastChangeDate] = useState<Date | null>(null)
  
  // 비밀번호 유효성 검사 상태
  const [passwordValidation, setPasswordValidation] = useState({
    minLength: false,
    hasUpperCase: false,
    hasLowerCase: false,
    hasNumber: false,
    hasSpecialChar: false,
    noConsecutive: false
  })

  useEffect(() => {
    if (user) {
      // 사용자 정보가 있으면 닉네임 설정 (랜덤 닉네임 생성)
      if (!user.displayName) {
        const randomNickname = generateRandomNickname()
        setNickname(randomNickname)
      } else {
        setNickname(user.displayName)
      }
      
      // 닉네임 변경 가능 여부 확인
      checkNicknameEligibility()
    }
  }, [user])

  // 닉네임 변경 가능 여부 확인 함수
  const checkNicknameEligibility = async () => {
    if (!user) return
    
    try {
      const result = await checkNicknameChangeEligibility(user.uid)
      setCanChangeNickname(result.canChange)
      setDaysRemaining(result.daysRemaining || 0)
      setLastChangeDate(result.lastChangeDate)
    } catch (error) {
      console.error('닉네임 변경 가능 여부 확인 오류:', error)
    }
  }

  // 랜덤 닉네임 생성 함수
  const generateRandomNickname = () => {
    const adjectives = ['행복한', '밝은', '따뜻한', '상냥한', '활발한', '차분한', '용감한', '지혜로운']
    const nouns = ['고양이', '강아지', '나비', '별', '꽃', '바람', '물', '산']
    const numbers = Math.floor(Math.random() * 999) + 1
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)]
    const noun = nouns[Math.floor(Math.random() * nouns.length)]
    
    return `${adjective}${noun}${numbers}`
  }

  // 비밀번호 유효성 검사 함수
  const validatePassword = (password: string) => {
    const validation = {
      minLength: password.length >= 8 && password.length <= 20,
      hasUpperCase: /[A-Z]/.test(password),
      hasLowerCase: /[a-z]/.test(password),
      hasNumber: /[0-9]/.test(password),
      hasSpecialChar: /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password),
      noConsecutive: !/(.)\1{2,}/.test(password) // 동일한 문자 3개 이상 연속 사용 불가
    }
    
    setPasswordValidation(validation)
    return Object.values(validation).every(Boolean)
  }

  const handleNicknameUpdate = async () => {
    if (!nickname.trim()) {
      setNicknameError('닉네임을 입력해주세요.')
      return
    }

    if (nickname.length < 2 || nickname.length > 10) {
      setNicknameError('닉네임은 2-10자 사이로 입력해주세요.')
      return
    }

    if (!canChangeNickname) {
      setNicknameError(`닉네임은 월 1회 변경 가능합니다. ${daysRemaining}일 후에 다시 시도해주세요.`)
      return
    }

    setIsLoading(true)
    setNicknameError('')

    try {
      await updateProfile({ displayName: nickname })
      alert('닉네임이 성공적으로 변경되었습니다.')
      // 닉네임 변경 후 상태 업데이트
      await checkNicknameEligibility()
    } catch (error) {
      console.error('닉네임 변경 오류:', error)
      setNicknameError('닉네임 변경 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  const handlePasswordUpdate = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('모든 필드를 입력해주세요.')
      return
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('새 비밀번호가 일치하지 않습니다.')
      return
    }

    // 비밀번호 유효성 검사
    if (!validatePassword(newPassword)) {
      setPasswordError('비밀번호가 조건을 만족하지 않습니다.')
      return
    }

    setIsPasswordLoading(true)
    setPasswordError('')

    try {
      const result = await updatePassword(currentPassword, newPassword)
      
      if (result.error) {
        setPasswordError(result.error)
        return
      }
      
      alert('비밀번호가 성공적으로 변경되었습니다.')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      // 비밀번호 유효성 검사 상태 초기화
      setPasswordValidation({
        minLength: false,
        hasUpperCase: false,
        hasLowerCase: false,
        hasNumber: false,
        hasSpecialChar: false,
        noConsecutive: false
      })
    } catch (error: any) {
      console.error('비밀번호 변경 오류:', error)
      setPasswordError('비밀번호 변경 중 예상치 못한 오류가 발생했습니다.')
    } finally {
      setIsPasswordLoading(false)
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
          <h1 className="text-2xl font-bold">내 정보 수정</h1>
          <p className="text-muted-foreground text-mobile-sm">
            프로필 정보 및 개인 설정을 변경하세요
          </p>
        </div>
      </div>

      {/* 가입한 이메일 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Mail className="w-5 h-5 text-primary" />
            <span>가입한 이메일</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="p-3 bg-muted rounded-lg">
            <p className="font-medium">{user?.email || '이메일 정보 없음'}</p>
            <p className="text-sm text-muted-foreground mt-1">
              이메일은 변경할 수 없습니다
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 닉네임 수정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <User className="w-5 h-5 text-primary" />
            <span>닉네임</span>
          </CardTitle>
          <CardDescription>
            다른 사용자에게 표시되는 이름입니다
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* 안내 문구 */}
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              닉네임은 월 1회 변경 가능합니다.
            </p>
            {!canChangeNickname && daysRemaining > 0 && (
              <p className="text-sm text-blue-600 mt-1">
                다음 변경 가능일까지 {daysRemaining}일 남았습니다.
              </p>
            )}
          </div>
          
          <div>
            <Input
              type="text"
              placeholder="닉네임을 입력하세요"
              value={nickname}
              onChange={(e) => {
                setNickname(e.target.value)
                setNicknameError('')
              }}
              className={nicknameError ? 'border-red-500' : ''}
              disabled={!canChangeNickname}
            />
            {nicknameError && (
              <p className="text-sm text-red-500 mt-1">{nicknameError}</p>
            )}
          </div>
          <Button 
            onClick={handleNicknameUpdate}
            disabled={isLoading || !canChangeNickname}
            className="w-full"
          >
            {isLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            닉네임 수정
          </Button>
        </CardContent>
      </Card>

      {/* 비밀번호 변경 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Lock className="w-5 h-5 text-primary" />
            <span>비밀번호 변경</span>
          </CardTitle>
          <CardDescription>
            보안을 위해 정기적으로 비밀번호를 변경하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Input
              type="password"
              placeholder="현재 비밀번호"
              value={currentPassword}
              onChange={(e) => {
                setCurrentPassword(e.target.value)
                setPasswordError('')
              }}
              className={passwordError ? 'border-red-500' : ''}
            />
          </div>
          <div>
            <Input
              type="password"
              placeholder="새 비밀번호"
              value={newPassword}
              onChange={(e) => {
                setNewPassword(e.target.value)
                setPasswordError('')
                validatePassword(e.target.value)
              }}
              className={passwordError ? 'border-red-500' : ''}
            />
            
            {/* 비밀번호 조건 표시 */}
            {newPassword && (
              <div className="mt-3 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-2">비밀번호 조건:</p>
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${passwordValidation.minLength ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-xs ${passwordValidation.minLength ? 'text-green-600' : 'text-gray-500'}`}>
                      8자리 이상 20자리 이하
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${passwordValidation.hasUpperCase && passwordValidation.hasLowerCase && passwordValidation.hasNumber && passwordValidation.hasSpecialChar ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-xs ${passwordValidation.hasUpperCase && passwordValidation.hasLowerCase && passwordValidation.hasNumber && passwordValidation.hasSpecialChar ? 'text-green-600' : 'text-gray-500'}`}>
                      영문 대/소문자 + 숫자 + 특수문자 사용
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className={`w-2 h-2 rounded-full ${passwordValidation.noConsecutive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className={`text-xs ${passwordValidation.noConsecutive ? 'text-green-600' : 'text-gray-500'}`}>
                      동일한 문자 및 숫자 연속 사용불가
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div>
            <Input
              type="password"
              placeholder="새 비밀번호 재입력"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value)
                setPasswordError('')
              }}
              className={passwordError ? 'border-red-500' : ''}
            />
            {passwordError && (
              <p className="text-sm text-red-500 mt-1">{passwordError}</p>
            )}
          </div>
          <Button 
            onClick={handlePasswordUpdate}
            disabled={isPasswordLoading || !Object.values(passwordValidation).every(Boolean)}
            className="w-full"
          >
            {isPasswordLoading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <Lock className="w-4 h-4 mr-2" />
            )}
            비밀번호 변경
          </Button>
        </CardContent>
      </Card>

      {/* 버튼 영역 */}
      <div className="flex space-x-3 pt-4">
        <Button
          variant="outline"
          onClick={handleCancel}
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          취소
        </Button>
      </div>
    </div>
  )
}
