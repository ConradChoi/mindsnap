'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'
import { App as CapacitorApp } from '@capacitor/app'
import { subscribeToAuthChanges, handleNativeAuthDeepLink } from '@/lib/auth'

// 화면 코드(9개 페이지, 58곳)가 Firebase의 `user.uid` 형태에 의존하고 있어,
// Supabase User(`user.id`)를 그대로 노출하지 않고 얇은 shim으로 감싸서 페이지 변경을
// 최소화한다. 이 shim 밖에서는 절대 Supabase User를 직접 다루지 않는다.
export interface AppUser {
  uid: string
  email: string | null
  displayName: string | null
}

const toAppUser = (user: SupabaseUser | null): AppUser | null => {
  if (!user) return null
  return {
    uid: user.id,
    email: user.email ?? null,
    displayName: (user.user_metadata?.display_name as string | undefined) ?? null,
  }
}

interface AuthContextType {
  user: AppUser | null
  loading: boolean
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
})

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AppUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    try {
      const unsubscribe = subscribeToAuthChanges((supabaseUser) => {
        setUser(toAppUser(supabaseUser))
        setLoading(false)
      })

      return () => unsubscribe()
    } catch (error) {
      console.warn('Supabase auth not configured, using empty auth state', error)
      setUser(null)
      setLoading(false)
    }
  }, [])

  // 네이티브 앱(iOS/Android)에서 소셜 로그인 완료 후 시스템 브라우저가 커스텀 URL 스킴으로
  // 앱에 돌아올 때 발생하는 이벤트를 수신한다. 세션이 발급되면 위 subscribeToAuthChanges가
  // 자동으로 user 상태를 갱신한다.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    const listenerHandle = CapacitorApp.addListener('appUrlOpen', ({ url }) => {
      handleNativeAuthDeepLink(url)
    })

    return () => {
      listenerHandle.then((handle) => handle.remove())
    }
  }, [])

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}
