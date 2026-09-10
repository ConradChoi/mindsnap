import { createClient, SupabaseClient } from '@supabase/supabase-js'

// 브라우저에서 직접 호출되는 클라이언트 (RLS로 보호됨, anon key만 사용)
// 서비스 롤 키는 이 파일에서 사용하지 않는다 (Capacitor 정적 빌드 전환 대비, 화면에서는
// Supabase JS SDK를 anon key로 직접 호출하는 구조를 유지한다). 예외적으로 RLS로 막혀 있는
// 작업(회원탈퇴 등 하드 삭제)만 app/api/*의 서버 전용 라우트 + lib/supabase-admin.ts의
// service_role 클라이언트를 쓴다 — 해당 라우트는 빌드 시점에 Capacitor 빌드에서 제외된다
// (scripts/build-capacitor.js 참고).
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
      // Capacitor(iOS/Android) 앱에서는 소셜 로그인이 시스템 브라우저 → 커스텀 URL 스킴 딥링크로
      // 앱에 돌아오는 방식이라(웹처럼 페이지 자체가 리다이렉트되지 않음), 리다이렉트 URL에 세션을
      // 바로 담아 보내는 implicit 플로우 대신 code를 받아 exchangeCodeForSession()으로 직접
      // 교환하는 PKCE 플로우가 필요하다. 웹 로그인(이메일/Google/Apple)도 이 설정을 그대로 쓰지만
      // 동작 방식은 동일하다(signInWithOAuth 호출 시 내부적으로 code_verifier를 저장해뒀다가
      // 콜백에서 code와 함께 교환).
      flowType: 'pkce',
    },
  }
)
