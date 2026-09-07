import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 브라우저에서 직접 호출되는 클라이언트 (RLS로 보호됨, anon key만 사용)
// 서버 라우트/서비스 롤 키는 이 프로젝트에서 사용하지 않는다 (2단계 Capacitor 정적 빌드 전환 대비,
// app/api/* 서버 라우트를 두지 않고 화면에서 Supabase JS SDK를 직접 호출하는 구조를 유지한다).
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

export const hasSupabaseConfig = !!(supabaseUrl && supabaseAnonKey)

if (!hasSupabaseConfig && typeof window !== 'undefined') {
  // eslint-disable-next-line no-console
  console.error(
    'Supabase is not configured. NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수를 확인하세요.'
  )
}

// 환경변수가 비어있는 빌드 타임(예: CI)에도 next build가 깨지지 않도록 더미 값으로 폴백하되,
// 런타임에는 hasSupabaseConfig로 실제 사용 가능 여부를 체크한다.
export const supabase: SupabaseClient = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-anon-key',
  {
    auth: {
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: true,
    },
  }
)
