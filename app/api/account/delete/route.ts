import { NextRequest, NextResponse } from 'next/server'
import { createClient, SupabaseClient } from '@supabase/supabase-js'
import { getSupabaseAdminClient } from '@/lib/supabase-admin'

// 회원탈퇴(계정 및 모든 기록 영구 삭제) — App Store 심사 가이드라인 5.1.1(v) /
// 개인정보처리방침 제12조("설정 > 회원탈퇴")가 실제로 동작하게 하는 엔드포인트.
//
// RLS 정책상 profiles/snaps/mood_records 등 모든 테이블에 DELETE 정책이 없다(의도적 —
// 소프트 삭제만 허용, 하드 삭제는 서비스 롤 권한으로만 가능). 그래서 anon key로는 계정
// 삭제가 불가능하고, 이 라우트는 service_role 키를 쓰는 서버 전용 로직이다.
//
// 네이티브 앱(Capacitor, output: export)은 Route Handler를 빌드에 포함할 수 없어
// build:capacitor 스크립트(scripts/build-capacitor.js)가 빌드 시점에만 app/api를
// 제외한다 — 앱은 웹에 배포된 절대 URL로 이 라우트를 호출한다(lib/auth.ts의
// resolveAccountDeleteUrl 참고).
//
// CORS: 네이티브 앱은 capacitor://localhost(iOS) / http://localhost(Android) 같은
// 웹과 다른 origin에서 이 URL을 fetch로 호출하므로 CORS 허용 헤더가 필요하다.
// 인증은 쿠키가 아니라 Authorization 헤더(Bearer 토큰)로만 이루어지므로 origin을
// 와일드카드로 열어도 CSRF 위험은 없다(토큰을 모르면 어차피 호출 자체가 401로 막힘).
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type',
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders })
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const accessToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length)
    : null

  if (!accessToken) {
    return NextResponse.json({ error: '인증 정보가 없습니다.' }, { status: 401, headers: corsHeaders })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!supabaseUrl || !anonKey) {
    console.error('[account-delete] NEXT_PUBLIC_SUPABASE_URL/ANON_KEY 미설정')
    return NextResponse.json(
      { error: '서버 설정 오류입니다. 잠시 후 다시 시도해주세요.' },
      { status: 500, headers: corsHeaders }
    )
  }

  // 요청 body의 uid는 절대 신뢰하지 않는다 — access token을 Supabase에 검증시켜
  // 얻은 uid만 사용한다(본인 계정만 삭제 가능하도록 보장하는 핵심 로직).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) {
    return NextResponse.json(
      { error: '유효하지 않거나 만료된 인증 정보입니다.' },
      { status: 401, headers: corsHeaders }
    )
  }

  const userId = callerData.user.id

  let admin: SupabaseClient
  try {
    admin = getSupabaseAdminClient()
  } catch (error: any) {
    console.error('[account-delete] service_role 미설정:', error.message)
    // TEMP DEBUG (원인 파악 후 즉시 제거 예정) — 비밀값은 노출하지 않고 존재 여부/길이만 확인
    return NextResponse.json(
      {
        error: '현재 회원탈퇴를 처리할 수 없습니다. 잠시 후 다시 시도하거나 고객센터로 문의해주세요.',
        __debug: {
          hasUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
          hasServiceRoleKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
          serviceRoleKeyLength: process.env.SUPABASE_SERVICE_ROLE_KEY?.length ?? 0,
          envKeysWithSupabase: Object.keys(process.env).filter(k => k.toUpperCase().includes('SUPABASE')),
          nodeEnv: process.env.NODE_ENV,
        },
      },
      { status: 503, headers: corsHeaders }
    )
  }

  // 1) Storage 정리. profiles/snaps/... 행은 auth.users 삭제 시 on delete cascade로
  //    자동 삭제되지만, Storage 객체는 DB 외래키로 묶여 있지 않아 별도로 지워야 한다.
  //    여기서 실패해도 계정 삭제(2번)는 계속 진행한다 — "탈퇴가 안 됨"이 "파일이 며칠
  //    늦게 정리됨"보다 사용자/법적 리스크가 크기 때문. 실패 시 로그로 남겨 운영에서
  //    수동 정리할 수 있게 한다.
  try {
    await deleteAllUserMedia(admin, userId)
  } catch (error) {
    console.error(`[account-delete] storage cleanup failed for user ${userId}:`, error)
  }

  // 2) auth.users 삭제 -> profiles/snaps/mood_records/remember_today/activity_log/
  //    personality_test_results가 on delete cascade(0001~0003 마이그레이션)로 함께 삭제된다.
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
  if (deleteUserError) {
    console.error(`[account-delete] deleteUser failed for user ${userId}:`, deleteUserError.message)
    return NextResponse.json(
      { error: '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' },
      { status: 500, headers: corsHeaders }
    )
  }

  return NextResponse.json({ success: true }, { headers: corsHeaders })
}

const MEDIA_BUCKET = 'media'

// storage.objects는 `{userId}/{snapId}/{kind}.{ext}` 구조(lib/storage.ts uploadSnapMedia 참고)라
// list()가 폴더 단위로만 항목을 돌려준다. 1depth(스냅 id 폴더들)를 나열한 뒤 각 폴더 안의
// 실제 파일들을 다시 나열해서 전부 삭제 대상 경로로 모은다.
async function deleteAllUserMedia(admin: SupabaseClient, userId: string): Promise<void> {
  const { data: snapFolders, error: listFoldersError } = await admin.storage
    .from(MEDIA_BUCKET)
    .list(userId, { limit: 1000 })

  if (listFoldersError) throw listFoldersError
  if (!snapFolders || snapFolders.length === 0) return

  const pathsToDelete: string[] = []

  for (const entry of snapFolders) {
    // Supabase Storage list()는 "폴더"도 항목으로 반환하며, 실제 파일과 달리 id가 null이다.
    if (entry.id !== null) {
      // uid 바로 아래에 파일이 있는 경우(과거 구조 등)를 대비한 방어적 처리.
      pathsToDelete.push(`${userId}/${entry.name}`)
      continue
    }

    const folderPath = `${userId}/${entry.name}`
    const { data: files, error: listFilesError } = await admin.storage
      .from(MEDIA_BUCKET)
      .list(folderPath, { limit: 1000 })

    if (listFilesError) throw listFilesError
    for (const file of files ?? []) {
      pathsToDelete.push(`${folderPath}/${file.name}`)
    }
  }

  if (pathsToDelete.length === 0) return

  const { error: removeError } = await admin.storage.from(MEDIA_BUCKET).remove(pathsToDelete)
  if (removeError) throw removeError
}
