'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { subscribeToAuthChanges } from '@/lib/auth'

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

  return <AuthContext.Provider value={{ user, loading }}>{children}</AuthContext.Provider>
}
