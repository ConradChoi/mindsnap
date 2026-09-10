import { createClient, SupabaseClient } from '@supabase/supabase-js'

// service_role 키를 사용하는 서버 전용 클라이언트.
// RLS를 완전히 우회하므로 절대 클라이언트 번들에 포함되면 안 된다 — 이 파일은
// app/api/* 서버 라우트 핸들러 내부에서만 import한다 ('use client' 컴포넌트나
// lib/supabase-service.ts(브라우저에서도 쓰이는 파일)에서는 절대 import하지 말 것.
// NEXT_PUBLIC_ 접두사가 없는 환경변수라 Next.js가 클라이언트 번들에 인라인하지 않는다는
// 점도 이 분리를 뒷받침한다.)
//
// lib/supabase.ts의 anon 클라이언트는 "app/api/* 서버 라우트를 두지 않는다"는 원칙을
// 전제로 작성되었지만, 회원탈퇴(계정 삭제)만은 RLS로 막혀 있는 DELETE를 수행해야 해서
// 예외적으로 서버 라우트 + service_role이 필요하다 (app/api/account/delete/route.ts 참고).

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

export const hasSupabaseAdminConfig = !!(supabaseUrl && serviceRoleKey)

// 요청이 실제로 들어왔을 때만 생성한다(모듈 로드 시점에 바로 throw하면 이 파일을 import하는
// 다른 라우트의 빌드/로딩까지 막힐 수 있어, 호출 시점에 명확한 에러 메시지로 안내한다).
export const getSupabaseAdminClient = (): SupabaseClient => {
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      'SUPABASE_SERVICE_ROLE_KEY가 설정되지 않았습니다. Supabase 대시보드 > Project Settings > API > service_role secret 에서 값을 확인해 서버 환경변수로 등록하세요.'
    )
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
