// 회원탈퇴(계정 및 모든 기록 영구 삭제) — Supabase Edge Function.
//
// 원래 Next.js API Route(app/api/account/delete)로 구현했으나, AWS Amplify(WEB_COMPUTE)의
// 콘솔 환경변수가 빌드 시점에는 전달되면서도 실제 SSR 런타임에는 전달되지 않는 문제가 있어
// SUPABASE_SERVICE_ROLE_KEY를 서버에서 읽을 수 없었다. Edge Function은 SUPABASE_URL /
// SUPABASE_ANON_KEY / SUPABASE_SERVICE_ROLE_KEY를 Supabase가 자동으로 주입해주므로 이
// 문제 자체가 없다. 웹/네이티브 앱 모두 이 함수를 동일한 URL로 직접 호출한다(플랫폼 분기 불필요).
//
// 배포: Supabase 대시보드 > Edge Functions > 이 파일 내용을 그대로 붙여넣어 배포 (Docker/CLI 불필요).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey',
}

const MEDIA_BUCKET = 'media'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  const authHeader = req.headers.get('authorization')
  const accessToken = authHeader?.toLowerCase().startsWith('bearer ')
    ? authHeader.slice('bearer '.length)
    : null

  if (!accessToken) {
    return json({ error: '인증 정보가 없습니다.' }, 401)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

  // 요청 body의 uid는 절대 신뢰하지 않는다 — access token을 Supabase에 검증시켜
  // 얻은 uid만 사용한다(본인 계정만 삭제 가능하도록 보장하는 핵심 로직).
  const callerClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: callerData, error: callerError } = await callerClient.auth.getUser()
  if (callerError || !callerData.user) {
    return json({ error: '유효하지 않거나 만료된 인증 정보입니다.' }, 401)
  }

  const userId = callerData.user.id

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1) Storage 정리. profiles/snaps/... 행은 auth.users 삭제 시 on delete cascade로
  //    자동 삭제되지만, Storage 객체는 DB 외래키로 묶여 있지 않아 별도로 지워야 한다.
  //    여기서 실패해도 계정 삭제(2번)는 계속 진행한다 — "탈퇴가 안 됨"이 "파일이 며칠
  //    늦게 정리됨"보다 사용자/법적 리스크가 크기 때문. 실패 시 로그로 남겨 운영에서
  //    수동 정리할 수 있게 한다.
  try {
    await deleteAllUserMedia(admin, userId)
  } catch (error) {
    console.error(`[delete-account] storage cleanup failed for user ${userId}:`, error)
  }

  // 2) auth.users 삭제 -> profiles/snaps/mood_records/remember_today/activity_log/
  //    personality_test_results가 on delete cascade(0001~0003 마이그레이션)로 함께 삭제된다.
  const { error: deleteUserError } = await admin.auth.admin.deleteUser(userId)
  if (deleteUserError) {
    console.error(`[delete-account] deleteUser failed for user ${userId}:`, deleteUserError.message)
    return json({ error: '계정 삭제 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.' }, 500)
  }

  return json({ success: true }, 200)
})

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// storage.objects는 `{userId}/{snapId}/{kind}.{ext}` 구조(lib/storage.ts uploadSnapMedia 참고)라
// list()가 폴더 단위로만 항목을 돌려준다. 1depth(스냅 id 폴더들)를 나열한 뒤 각 폴더 안의
// 실제 파일들을 다시 나열해서 전부 삭제 대상 경로로 모은다.
async function deleteAllUserMedia(admin: ReturnType<typeof createClient>, userId: string): Promise<void> {
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
