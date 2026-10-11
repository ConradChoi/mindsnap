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

  // 옵트아웃 확인 — profiles 행이 없거나 조회에 실패해도 기본값(분석함)으로 진행한다.
  // 명시적으로 false인 경우에만 건너뛴다.
  const { data: profile } = await admin
    .from('profiles')
    .select('sentiment_analysis_enabled')
    .eq('id', user_id)
    .maybeSingle()

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
    const googleRes = await fetch(
      `https://language.googleapis.com/v1/documents:annotateText?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          document: { type: 'PLAIN_TEXT', content: text, language: 'ko' },
          features: { extractDocumentSentiment: true, extractEntities: true },
          encodingType: 'UTF8',
        }),
      }
    )

    if (!googleRes.ok) {
      const errText = await googleRes.text()
      throw new Error(`Google API ${googleRes.status}: ${errText}`)
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
    console.error(`[analyze-sentiment] ${source_table}/${source_id} 분석 실패:`, error)
    await admin
      .from('sentiment_analysis')
      .update({ status: 'failed', error_message: String(error) })
      .eq('source_table', source_table)
      .eq('source_id', source_id)
    return json({ error: 'analysis failed' }, 500)
  }
})
