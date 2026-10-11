// supabase/functions/analyze-sentiment/index.ts
//
// DB 트리거(snaps/mood_records/remember_today의 AFTER INSERT)가 호출하는 Edge
// Function. Google Cloud Natural Language API의 annotateText를 한 번 호출해
// 감정 점수와 엔티티를 동시에 받아오고, 결과를 sentiment_analysis 테이블에 저장한다.
//
// 기록 저장과 완전히 분리된 백그라운드 작업이다 — 이 함수가 실패해도 원본
// snaps/mood_records/remember_today 행에는 어떤 영향도 없다(트리거가 비동기
// pg_net 호출만 하고 insert 자체는 이미 커밋된 뒤이기 때문).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, apikey',
}

type SourceTable = 'snap' | 'mood_record' | 'remember_today'

interface RequestBody {
  source_table: SourceTable
  source_id: string
  user_id: string
  text: string
}

interface GoogleEntity {
  name: string
  type: string
  salience: number
}

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }

  // 이 함수는 DB 트리거(notify_analyze_sentiment)만 호출하도록 제한한다.
  // anon key는 앱 번들에 포함되는 공개 값이라 "Verify JWT" 통과만으로는 누구나
  // 호출할 수 있고, 이 함수는 service_role로 쓰기 때문에 인증 없이는 임의의
  // user_id로 분석 행을 위조/덮어쓸 수 있었다(2026-10-11 최종 리뷰 Critical).
  // 트리거만 아는 공유 시크릿(Vault: sentiment_trigger_secret)을 헤더로 검증한다.
  const expectedSecret = Deno.env.get('SENTIMENT_TRIGGER_SECRET')
  const providedSecret = req.headers.get('x-trigger-secret')
  if (!expectedSecret || providedSecret !== expectedSecret) {
    return json({ error: 'unauthorized' }, 401)
  }

  let body: RequestBody
  try {
    body = await req.json()
  } catch {
    return json({ error: 'invalid request body' }, 400)
  }

  const { source_table, source_id, user_id, text } = body
  if (!source_table || !source_id || !user_id || !text || !text.trim()) {
    return json({ error: 'missing required fields' }, 400)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const googleApiKey = Deno.env.get('GOOGLE_CLOUD_NL_API_KEY')

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 옵트아웃 확인 — profiles 행이 없으면(아직 생성 전 등) 기본값(분석함)으로 진행하지만,
  // 조회 자체가 실패한 경우(일시적 DB 오류 등)는 동의 여부를 확인할 수 없는 것이므로
  // 안전하게 분석을 건너뛴다(2026-10-11 최종 리뷰 Important — 옵트아웃이 fail-open이면
  // 안 됨).
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('sentiment_analysis_enabled')
    .eq('id', user_id)
    .maybeSingle()

  if (profileError) {
    console.error(`[analyze-sentiment] ${source_table}/${source_id} 옵트아웃 설정 조회 실패:`, profileError)
    return json({ skipped: true, reason: 'preference_check_failed' }, 200)
  }

  if (profile && profile.sentiment_analysis_enabled === false) {
    return json({ skipped: true, reason: 'opted_out' }, 200)
  }

  if (!googleApiKey) {
    console.error('[analyze-sentiment] GOOGLE_CLOUD_NL_API_KEY가 설정되지 않았습니다.')
    return json({ error: 'server not configured' }, 503)
  }

  // pending 행을 먼저 기록해 둔다 — 화면에서 "분석 중..." 표시에 사용.
  await admin.from('sentiment_analysis').upsert(
    { user_id, source_table, source_id, status: 'pending' },
    { onConflict: 'source_table,source_id' }
  )

  try {
    // API 키를 URL 쿼리 파라미터가 아니라 헤더로 보낸다 — 쿼리 파라미터로 보내면
    // 네트워크 레벨 오류(DNS/연결 실패 등) 메시지에 요청 URL 전체가 그대로 포함되는
    // 경우가 있어, 그 오류 메시지를 error_message 컬럼에 저장하면(RLS로 본인은 조회
    // 가능) API 키가 클라이언트까지 노출될 수 있었다(2026-10-11 최종 리뷰 Important).
    const googleRes = await fetch('https://language.googleapis.com/v1/documents:annotateText', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': googleApiKey },
      body: JSON.stringify({
        document: { type: 'PLAIN_TEXT', content: text, language: 'ko' },
        features: { extractDocumentSentiment: true, extractEntities: true },
        encodingType: 'UTF8',
      }),
    })

    if (!googleRes.ok) {
      throw new Error(`Google API error (status ${googleRes.status})`)
    }

    const result = await googleRes.json()
    const sentiment = result.documentSentiment ?? {}
    const entities: GoogleEntity[] = (result.entities ?? []).map((e: any) => ({
      name: e.name,
      type: e.type,
      salience: e.salience,
    }))

    const { error: updateError } = await admin
      .from('sentiment_analysis')
      .update({
        status: 'completed',
        sentiment_score: sentiment.score ?? null,
        sentiment_magnitude: sentiment.magnitude ?? null,
        entities,
        error_message: null,
      })
      .eq('source_table', source_table)
      .eq('source_id', source_id)

    if (updateError) throw updateError

    return json({ success: true }, 200)
  } catch (error) {
    // 전체 오류(네트워크 오류 메시지 등)는 서버 로그에만 남기고, DB에는 이용자가
    // 조회 가능한(RLS select 정책) error_message 컬럼에 저장될 걸 감안해 상태
    // 구분용 짧은 메시지만 남긴다 — 민감정보가 섞여 들어갈 가능성을 차단한다.
    console.error(`[analyze-sentiment] ${source_table}/${source_id} 분석 실패:`, error)
    await admin
      .from('sentiment_analysis')
      .update({ status: 'failed', error_message: 'analysis failed' })
      .eq('source_table', source_table)
      .eq('source_id', source_id)
    return json({ error: 'analysis failed' }, 500)
  }
})
