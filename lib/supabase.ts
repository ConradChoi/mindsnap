import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.SUPABASE_URL!
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY!

// Server-side Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

// Client-side Supabase client (for future use)
export const createClientComponentClient = () => {
  return createClient(supabaseUrl, supabaseAnonKey)
}

// TODO: 인증 시스템 구현 시 사용할 함수들
// export const signInWithEmail = async (email: string, password: string) => {
//   const { data, error } = await supabase.auth.signInWithPassword({
//     email,
//     password,
//   })
//   return { data, error }
// }

// export const signUpWithEmail = async (email: string, password: string) => {
//   const { data, error } = await supabase.auth.signUp({
//     email,
//     password,
//   })
//   return { data, error }
// }

// export const signOut = async () => {
//   const { error } = await supabase.auth.signOut()
//   return { error }
// }
