# Google Cloud Natural Language API 연동 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 마인드스냅의 저널 텍스트(스냅 메모, 마음 기록, 오늘을 기억할래)에 Google Cloud Natural Language API 기반 감정 분석/엔티티 추출을 붙여서, 기록별 피드백·저널 감정 추이 그래프·자주 언급된 키워드 통계 3가지를 제공한다.

**Architecture:** 세 테이블(`snaps`/`mood_records`/`remember_today`)에 `AFTER INSERT` Postgres 트리거를 걸어 `pg_net`으로 Supabase Edge Function(`analyze-sentiment`)을 비동기 호출한다. Edge Function이 Google Cloud NL API(`annotateText`)를 호출해 결과를 신규 테이블 `sentiment_analysis`에 저장한다. 클라이언트는 폴링(3초 간격, 최대 20회)으로 `pending` 상태인 분석 결과를 다시 조회해 자동 반영한다 — 이 프로젝트는 과거 Supabase Realtime 구독을 "반복적인 날짜 변환 버그의 진원지"로 지목하고 명시적으로 제거한 이력이 있어(`lib/supabase-service.ts` 상단 주석), 설계 문서의 "Realtime 구독" 대신 같은 효과를 내는 폴링으로 구현한다. 이 변경은 외부 동작(결과가 자동으로 나타남)에 영향이 없는 구현 레벨 조정이다.

**Tech Stack:** Next.js 14 / Supabase(Postgres, pg_net, Edge Functions/Deno) / Google Cloud Natural Language API(REST, API 키 인증) / Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-10-09-sentiment-analysis-design.md`

## Global Constraints

- 분석 대상 텍스트는 `snaps.note`, `mood_records.note`, `remember_today`의 6개 필드(memorable_event/reason/cause/improvement/action/summary) 전체다.
- 기록 저장은 분석과 완전히 분리된 백그라운드 작업이며, 분석 실패가 원본 기록 저장에 어떤 영향도 주면 안 된다.
- 기본값은 **켜짐(opt-out)** — `profiles.sentiment_analysis_enabled`가 `true`가 기본값이고, 설정 화면에서 끌 수 있어야 한다.
- Google Cloud API 키는 Edge Function 환경변수(secret)로만 보관하고 클라이언트 번들에는 절대 노출하지 않는다(회원탈퇴 Edge Function과 동일한 보안 원칙).
- 분석 결과는 세 테이블에 컬럼을 추가하지 않고 신규 테이블 `sentiment_analysis` 하나에 모은다.
- RLS: `sentiment_analysis`는 `select using (auth.uid() = user_id)`만 두고, 쓰기는 Edge Function이 service_role로 수행한다(클라이언트용 insert/update 정책 없음).
- 언어는 `ko`(한국어) 고정.
- 개인정보처리방침(`app/privacy-policy/page.tsx`)의 제5조·제6조에 Google Cloud 행을 기존 Supabase/AWS 행과 같은 형식으로 추가해야 한다.

## Review Focus

- **빈 텍스트(사진만 있고 메모 없는 스냅)** — 트리거가 분석 대상 텍스트가 없으면 Edge Function 호출 자체를 생략해야 한다(쓸모없는 API 호출/고아 pending 행 방지). Task 3에서 검증.
- **옵트아웃 사용자** — Edge Function이 `sentiment_analysis_enabled = false`인 사용자에 대해서는 어떤 행도 생성하지 않아야 한다. Task 2에서 검증.
- **Google API 실패(쿼터 초과 등)** — `status='failed'`로 기록되고 원본 기록 저장에는 영향이 없어야 한다(둘은 완전히 분리된 트랜잭션). 실제 API 키를 일부러 무효화하는 건 운영 중인 시크릿을 건드리는 위험한 테스트라 피하고, Task 2 Step 1의 `try/catch` 블록이 실패 시 반드시 `status: 'failed'`로 업데이트하고 예외를 트리거 쪽으로 전파하지 않는지 코드 레벨로 확인한다.
- **RLS 격리** — 한 사용자가 다른 사용자의 `sentiment_analysis` 행을 절대 조회할 수 없어야 한다. Task 1에서 검증.
- **설정 토글의 영속성** — 토글을 끈 뒤 새로고침해도 꺼진 상태가 유지되어야 한다(로컬 상태가 아니라 DB에 실제로 반영되어야 함). Task 5에서 검증.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `supabase/migrations/0005_sentiment_analysis.sql` | `sentiment_analysis` 테이블, RLS, `profiles.sentiment_analysis_enabled` 컬럼 |
| `supabase/migrations/0006_sentiment_trigger.sql` | `pg_net` 기반 트리거 — 3개 테이블 insert 시 Edge Function 호출 |
| `supabase/functions/analyze-sentiment/index.ts` | Google Cloud NL API 호출 + 결과 저장 Edge Function |
| `lib/types.ts` | `SentimentAnalysis` 등 타입 추가(수정) |
| `lib/mappers.ts` | `SentimentAnalysisRow`/`mapSentimentAnalysisRow` 추가(수정) |
| `lib/supabase-service.ts` | `getSentimentAnalysisForUser`, 옵트아웃 get/update 함수 추가(수정) |
| `lib/hooks/useSentimentMap.ts` | 저널 화면에서 쓰는 폴링 훅 |
| `components/SentimentBadge.tsx` | 기록별 감정 한 줄 표시 컴포넌트 |
| `components/SentimentTrendChart.tsx` | 감정 추이 SVG 선 그래프 |
| `app/journal/insights/page.tsx` | 감정 추이 + 키워드 통계 신규 화면 |
| `app/journal/page.tsx` | `SnapList`/`MoodRecordList`/`RememberTodayList`에 배지 통합(수정) |
| `app/settings/app-settings/page.tsx` | 옵트아웃 토글 추가(수정) |
| `app/privacy-policy/page.tsx` | Google Cloud 국외이전/위탁 조항 추가(수정) |

---

### Task 1: DB 스키마 — `sentiment_analysis` 테이블 + 옵트아웃 컬럼

**Files:**
- Create: `supabase/migrations/0005_sentiment_analysis.sql`

**Interfaces:**
- Produces: 테이블 `public.sentiment_analysis` (컬럼: `id, user_id, source_table, source_id, status, sentiment_score, sentiment_magnitude, entities, error_message, created_at, updated_at`), enum `public.sentiment_source_table`('snap'|'mood_record'|'remember_today'), 컬럼 `public.profiles.sentiment_analysis_enabled boolean`

- [ ] **Step 1: 마이그레이션 파일 작성**

```sql
-- supabase/migrations/0005_sentiment_analysis.sql
-- Google Cloud Natural Language API 감정 분석/엔티티 추출 결과 저장소.
-- 세 소스 테이블(snaps/mood_records/remember_today)에 컬럼을 각각 추가하는 대신
-- 결과를 한 테이블에 모아서, 저널 감정 추이·엔티티 통계를 뽑을 때 한 테이블만
-- 보면 되게 한다. 쓰기는 analyze-sentiment Edge Function이 service_role로만
-- 수행하므로 클라이언트용 insert/update RLS 정책은 두지 않는다.

create type public.sentiment_source_table as enum ('snap', 'mood_record', 'remember_today');

create table public.sentiment_analysis (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  source_table         public.sentiment_source_table not null,
  source_id            uuid not null,
  status               text not null default 'pending'
                         check (status in ('pending', 'completed', 'failed')),
  sentiment_score      real,     -- -1.0(부정) ~ 1.0(긍정)
  sentiment_magnitude  real,     -- 0 이상, 감정 표현의 강도(극성 무관)
  entities             jsonb,    -- [{name, type, salience}, ...]
  error_message        text,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now(),
  unique (source_table, source_id)
);

create index sentiment_analysis_user_idx
  on public.sentiment_analysis (user_id, created_at desc);

alter table public.sentiment_analysis enable row level security;

create policy sentiment_analysis_select_own on public.sentiment_analysis
  for select using (auth.uid() = user_id);

create trigger sentiment_analysis_set_updated_at
  before update on public.sentiment_analysis
  for each row execute function public.set_updated_at();

-- 옵트아웃 토글 (기본값 true — 전체 사용자에게 기본 적용, 설정에서 끌 수 있음)
alter table public.profiles
  add column sentiment_analysis_enabled boolean not null default true;
```

- [ ] **Step 2: 마이그레이션 적용**

Run (Session Pooler 연결, `.env.local`의 `DATABASE_URL` 사용):
```bash
cd /Users/ylia/Documents/service/mindsnap
psql "$DATABASE_URL" -f supabase/migrations/0005_sentiment_analysis.sql
```

- [ ] **Step 3: 반영 확인**

Run:
```bash
psql "$DATABASE_URL" -c "\d public.sentiment_analysis"
psql "$DATABASE_URL" -c "select column_name, data_type, column_default from information_schema.columns where table_name = 'profiles' and column_name = 'sentiment_analysis_enabled';"
```
Expected: `sentiment_analysis` 테이블 컬럼 목록이 위 스키마와 일치하고, `profiles.sentiment_analysis_enabled`가 `boolean` / 기본값 `true`로 나온다.

- [ ] **Step 4: RLS 격리 확인 (Review Focus 항목)**

Run — 서로 다른 두 임시 사용자를 만들어 한쪽이 다른 쪽 행을 못 보는지 확인:
```bash
cd /Users/ylia/Documents/service/mindsnap
set -a; source .env.local; set +a

# 사용자 A 생성 + A의 분석 행 하나 직접 삽입(service_role로)
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"sentiment-rls-a-$(date +%s)@example.com\",\"password\":\"TestPass123!\"}" \
  > /tmp/rls-a.json
A_TOKEN=$(node -e "console.log(require('/tmp/rls-a.json').access_token)")
A_ID=$(node -e "console.log(require('/tmp/rls-a.json').user.id)")

curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/sentiment_analysis" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"user_id\":\"$A_ID\",\"source_table\":\"snap\",\"source_id\":\"$(node -e "console.log(require('crypto').randomUUID())")\",\"status\":\"completed\",\"sentiment_score\":0.5}"

# 사용자 B 생성 — B의 토큰으로 조회했을 때 A의 행이 보이면 안 됨
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"sentiment-rls-b-$(date +%s)@example.com\",\"password\":\"TestPass123!\"}" \
  > /tmp/rls-b.json
B_TOKEN=$(node -e "console.log(require('/tmp/rls-b.json').access_token)")
B_ID=$(node -e "console.log(require('/tmp/rls-b.json').user.id)")

echo "=== B 토큰으로 조회(0건이어야 정상) ==="
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/sentiment_analysis?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $B_TOKEN"

echo "=== A 토큰으로 조회(1건이어야 정상) ==="
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/sentiment_analysis?select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $A_TOKEN"

# 정리
curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$A_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$B_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
rm -f /tmp/rls-a.json /tmp/rls-b.json
```
Expected: B 토큰 조회 결과는 `[]`, A 토큰 조회 결과는 방금 넣은 행 1개.

- [ ] **Step 5: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add supabase/migrations/0005_sentiment_analysis.sql
git commit -m "feat: sentiment_analysis 테이블 및 옵트아웃 컬럼 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: Edge Function `analyze-sentiment`

**Files:**
- Create: `supabase/functions/analyze-sentiment/index.ts`

**Interfaces:**
- Consumes: 요청 바디 `{ source_table: 'snap'|'mood_record'|'remember_today', source_id: string, user_id: string, text: string }`
- Produces: `sentiment_analysis` 테이블에 `status='completed'|'failed'` 행 upsert. HTTP 응답 `{success: true}` / `{skipped: true, reason: 'opted_out'}` / `{error: string}`

- [ ] **Step 1: Edge Function 코드 작성**

```typescript
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
```

- [ ] **Step 2: Google Cloud API 키 발급 안내 (사람이 직접 수행)**

1. https://console.cloud.google.com 접속 → 프로젝트 선택(또는 새로 생성)
2. **API 및 서비스 → 라이브러리** → "Cloud Natural Language API" 검색 → **사용 설정**
3. **API 및 서비스 → 사용자 인증 정보** → **+ 사용자 인증 정보 만들기 → API 키**
4. 생성된 키를 **API 제한사항**에서 "Cloud Natural Language API"로 제한(다른 API에 오용되지 않도록)
5. 이 키 값은 다음 단계에서 Supabase Edge Function 시크릿으로만 등록하고, 어떤 파일에도 커밋하지 않는다.

- [ ] **Step 3: Edge Function 배포 (Supabase 대시보드, 회원탈퇴 때와 동일한 방식)**

1. https://supabase.com/dashboard → 프로젝트 → **Edge Functions → Deploy a new function → Via Editor**
2. Function name: `analyze-sentiment`
3. Step 1의 코드를 그대로 붙여넣기
4. **Deploy function**
5. **Edge Functions → analyze-sentiment → Secrets**(또는 프로젝트 전역 Secrets)에서 `GOOGLE_CLOUD_NL_API_KEY`를 Step 2에서 발급받은 값으로 등록

- [ ] **Step 4: curl로 E2E 검증 — 정상 분석 (Review Focus: Google API 실패 시 원본 영향 없음의 반대 경로인 "성공 경로" 확인)**

```bash
cd /Users/ylia/Documents/service/mindsnap
set -a; source .env.local; set +a

TEST_EMAIL="sentiment-probe-$(date +%s)@example.com"
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\"}" > /tmp/sentiment-probe.json

USER_ID=$(node -e "console.log(require('/tmp/sentiment-probe.json').user.id)")
SOURCE_ID=$(node -e "console.log(require('crypto').randomUUID())")

curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST \
  "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/analyze-sentiment" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"source_table\":\"snap\",\"source_id\":\"$SOURCE_ID\",\"user_id\":\"$USER_ID\",\"text\":\"오늘은 정말 행복한 하루였다. 친구들과 한강공원에서 즐거운 시간을 보냈다.\"}"

echo "=== DB에 저장된 결과 확인 ==="
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/sentiment_analysis?source_id=eq.$SOURCE_ID&select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: 첫 호출은 `{"success":true}` / `HTTP_STATUS:200`. DB 조회 결과는 `status: "completed"`, `sentiment_score`가 양수(긍정적인 문장이므로), `entities` 배열에 "한강공원" 등이 포함.

- [ ] **Step 5: curl로 E2E 검증 — 옵트아웃 시 건너뜀 (Review Focus 항목)**

```bash
cd /Users/ylia/Documents/service/mindsnap
set -a; source .env.local; set +a

curl -s -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/profiles?id=eq.$USER_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d '{"sentiment_analysis_enabled": false}'

OPTOUT_SOURCE_ID=$(node -e "console.log(require('crypto').randomUUID())")
curl -s -w "\nHTTP_STATUS:%{http_code}\n" -X POST \
  "$NEXT_PUBLIC_SUPABASE_URL/functions/v1/analyze-sentiment" \
  -H "Authorization: Bearer $NEXT_PUBLIC_SUPABASE_ANON_KEY" \
  -H "Content-Type: application/json" \
  -d "{\"source_table\":\"snap\",\"source_id\":\"$OPTOUT_SOURCE_ID\",\"user_id\":\"$USER_ID\",\"text\":\"테스트\"}"

echo "=== 행이 생성되지 않았어야 함(빈 배열) ==="
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/sentiment_analysis?source_id=eq.$OPTOUT_SOURCE_ID&select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: 함수 응답은 `{"skipped":true,"reason":"opted_out"}`, DB 조회 결과는 `[]`.

- [ ] **Step 6: 정리 및 Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
set -a; source .env.local; set +a
curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
rm -f /tmp/sentiment-probe.json

git add supabase/functions/analyze-sentiment/index.ts
git commit -m "feat: analyze-sentiment Edge Function 추가 (Google Cloud NL API 연동)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: DB 트리거 — 신규 기록 저장 시 자동 분석 호출

**Files:**
- Create: `supabase/migrations/0006_sentiment_trigger.sql`

**Interfaces:**
- Consumes: Task 1의 `sentiment_analysis` 테이블, Task 2에서 배포된 Edge Function URL
- Produces: `public.snaps`/`public.mood_records`/`public.remember_today`에 걸리는 `AFTER INSERT` 트리거 3개

- [ ] **Step 1: 트리거 마이그레이션 작성**

여기서 쓰는 `anon` 키는 `NEXT_PUBLIC_SUPABASE_ANON_KEY`와 동일한 공개 값이다(클라이언트 번들에 이미 포함되어 배포되는 값이라 git에 커밋해도 보안 문제가 없다). Edge Function 쪽 실제 민감 작업(service_role 권한 사용)은 Task 2의 Edge Function 내부에서 자체적으로 처리한다.

```sql
-- supabase/migrations/0006_sentiment_trigger.sql
-- 세 테이블에 새 행이 생기면 pg_net으로 analyze-sentiment Edge Function을 비동기
-- 호출한다. pg_net.http_post는 논블로킹이라 INSERT 트랜잭션을 지연시키지 않는다.

create extension if not exists pg_net with schema extensions;

create or replace function public.notify_analyze_sentiment()
returns trigger
language plpgsql
security definer set search_path = public, extensions
as $$
declare
  v_source_table text;
  v_text text;
begin
  if tg_table_name = 'snaps' then
    v_source_table := 'snap';
    v_text := new.note;
  elsif tg_table_name = 'mood_records' then
    v_source_table := 'mood_record';
    v_text := new.note;
  elsif tg_table_name = 'remember_today' then
    v_source_table := 'remember_today';
    v_text := concat_ws(
      E'\n',
      '기억에 남는 일: ' || new.memorable_event,
      '이유: ' || new.reason,
      '원인: ' || new.cause,
      '개선할 점: ' || new.improvement,
      '행동: ' || new.action,
      '요약: ' || new.summary
    );
  else
    return new;
  end if;

  -- 분석할 텍스트가 없으면(예: 사진만 있는 스냅) Edge Function 호출 자체를 생략한다.
  if v_text is null or btrim(v_text) = '' then
    return new;
  end if;

  perform net.http_post(
    url := 'https://rxxodddnuwhnvokdglrz.supabase.co/functions/v1/analyze-sentiment',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eG9kZGRudXdobnZva2RnbHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjgyMTMsImV4cCI6MjEwNDM0NDIxM30.ulL0OXjvGDOZMQloCI-uW2f3FDjZHhu0k3KW92-P7_8',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ4eG9kZGRudXdobnZva2RnbHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODg3NjgyMTMsImV4cCI6MjEwNDM0NDIxM30.ulL0OXjvGDOZMQloCI-uW2f3FDjZHhu0k3KW92-P7_8'
    ),
    body := jsonb_build_object(
      'source_table', v_source_table,
      'source_id', new.id,
      'user_id', new.user_id,
      'text', v_text
    )
  );

  return new;
end;
$$;

create trigger snaps_notify_sentiment
  after insert on public.snaps
  for each row execute function public.notify_analyze_sentiment();

create trigger mood_records_notify_sentiment
  after insert on public.mood_records
  for each row execute function public.notify_analyze_sentiment();

create trigger remember_today_notify_sentiment
  after insert on public.remember_today
  for each row execute function public.notify_analyze_sentiment();
```

- [ ] **Step 2: 마이그레이션 적용**

```bash
cd /Users/ylia/Documents/service/mindsnap
psql "$DATABASE_URL" -f supabase/migrations/0006_sentiment_trigger.sql
```

- [ ] **Step 3: 전체 플로우 E2E 검증 — INSERT 한 번으로 분석까지 자동으로 끝나는지 확인**

```bash
cd /Users/ylia/Documents/service/mindsnap
set -a; source .env.local; set +a

TEST_EMAIL="sentiment-trigger-$(date +%s)@example.com"
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\"}" > /tmp/trigger-probe.json

USER_ID=$(node -e "console.log(require('/tmp/trigger-probe.json').user.id)")
ACCESS_TOKEN=$(node -e "console.log(require('/tmp/trigger-probe.json').access_token)")

# profiles 행이 아직 없을 수 있으니(트리거로 자동 생성되지만 타이밍 대비) 확인 후 insert
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/snaps" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"title\":\"트리거 테스트\",\"note\":\"비가 와서 조금 우울했지만 따뜻한 차를 마시며 책을 읽었다.\"}" \
  > /tmp/trigger-snap.json
cat /tmp/trigger-snap.json
SNAP_ID=$(node -e "console.log(require('/tmp/trigger-snap.json')[0].id)")

echo "=== 5초 대기 후 분석 결과 확인 ==="
sleep 5
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/sentiment_analysis?source_id=eq.$SNAP_ID&select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: `snaps` insert는 즉시 성공 응답(분석 대기 없이 바로 반환 — 트리거가 논블로킹임을 확인). 5초 후 `sentiment_analysis` 조회 결과는 `status: "completed"`이고 `sentiment_score`가 음수에 가까움(우울했다는 내용 포함).

- [ ] **Step 4: 빈 텍스트 스킵 확인 (Review Focus 항목)**

```bash
cd /Users/ylia/Documents/service/mindsnap
set -a; source .env.local; set +a
ACCESS_TOKEN=$(node -e "console.log(require('/tmp/trigger-probe.json').access_token)")

curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/snaps" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"title\":\"메모 없는 스냅\"}" > /tmp/trigger-empty-snap.json
EMPTY_SNAP_ID=$(node -e "console.log(require('/tmp/trigger-empty-snap.json')[0].id)")

sleep 3
echo "=== 빈 배열이어야 함(분석 자체가 안 돌아야 함) ==="
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/sentiment_analysis?source_id=eq.$EMPTY_SNAP_ID&select=*" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
Expected: `[]`.

- [ ] **Step 5: 정리 및 Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
set -a; source .env.local; set +a
curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
rm -f /tmp/trigger-probe.json /tmp/trigger-snap.json /tmp/trigger-empty-snap.json

git add supabase/migrations/0006_sentiment_trigger.sql
git commit -m "feat: snaps/mood_records/remember_today insert 시 자동 감정 분석 트리거 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: 클라이언트 타입/매퍼/서비스 함수

**Files:**
- Modify: `lib/types.ts`
- Modify: `lib/mappers.ts`
- Modify: `lib/supabase-service.ts`

**Interfaces:**
- Produces: `SentimentAnalysis`, `SentimentSourceTable`, `SentimentStatus`, `SentimentEntity` 타입. `getSentimentAnalysisForUser(userId, limitCount?): Promise<SentimentAnalysis[]>`, `getSentimentAnalysisPreference(userId): Promise<boolean>`, `updateSentimentAnalysisPreference(userId, enabled): Promise<void>`

- [ ] **Step 1: `lib/types.ts`에 타입 추가**

`lib/types.ts` 파일 맨 끝에 추가:

```typescript
// =========================================================
// 감정 분석 (Google Cloud Natural Language API)
// =========================================================
export type SentimentSourceTable = 'snap' | 'mood_record' | 'remember_today'
export type SentimentStatus = 'pending' | 'completed' | 'failed'

export interface SentimentEntity {
  name: string
  type: string
  salience: number
}

export interface SentimentAnalysis {
  id: string
  userId: string
  sourceTable: SentimentSourceTable
  sourceId: string
  status: SentimentStatus
  sentimentScore?: number
  sentimentMagnitude?: number
  entities: SentimentEntity[]
  createdAt: Date
  updatedAt: Date
}
```

- [ ] **Step 2: `lib/mappers.ts`에 row 타입 + 매퍼 추가**

`lib/mappers.ts` 상단 import에 아래 타입들 추가(기존 import 문에 이어서):

```typescript
import {
  SentimentAnalysis,
  SentimentEntity,
  SentimentSourceTable,
  SentimentStatus,
} from './types'
```

파일 끝에 추가:

```typescript
export interface SentimentAnalysisRow {
  id: string
  user_id: string
  source_table: SentimentSourceTable
  source_id: string
  status: SentimentStatus
  sentiment_score: number | null
  sentiment_magnitude: number | null
  entities: SentimentEntity[] | null
  created_at: string
  updated_at: string
}

export const mapSentimentAnalysisRow = (row: SentimentAnalysisRow): SentimentAnalysis => ({
  id: row.id,
  userId: row.user_id,
  sourceTable: row.source_table,
  sourceId: row.source_id,
  status: row.status,
  sentimentScore: row.sentiment_score ?? undefined,
  sentimentMagnitude: row.sentiment_magnitude ?? undefined,
  entities: row.entities ?? [],
  createdAt: toDateRequired(row.created_at),
  updatedAt: toDateRequired(row.updated_at),
})
```

- [ ] **Step 3: `lib/supabase-service.ts`에 서비스 함수 추가**

상단 import 블록(`import { mapMoodRecordRow, ... } from './mappers'`)에 `SentimentAnalysisRow, mapSentimentAnalysisRow` 추가, `import { ... } from './types'` 블록에 `SentimentAnalysis` 추가.

파일 끝에 추가:

```typescript
// =========================================================
// Sentiment analysis services
// =========================================================

export const getSentimentAnalysisForUser = async (
  userId: string,
  limitCount = 200
): Promise<SentimentAnalysis[]> => {
  const { data, error } = await supabase
    .from('sentiment_analysis')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limitCount)
    .returns<SentimentAnalysisRow[]>()

  if (error) throw error
  return (data ?? []).map(mapSentimentAnalysisRow)
}

export const getSentimentAnalysisPreference = async (userId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('profiles')
    .select('sentiment_analysis_enabled')
    .eq('id', userId)
    .maybeSingle()

  if (error) throw error
  return data?.sentiment_analysis_enabled ?? true
}

export const updateSentimentAnalysisPreference = async (
  userId: string,
  enabled: boolean
): Promise<void> => {
  const { error } = await supabase
    .from('profiles')
    .update({ sentiment_analysis_enabled: enabled })
    .eq('id', userId)

  if (error) throw error
}
```

- [ ] **Step 4: 타입 체크로 검증**

Run:
```bash
cd /Users/ylia/Documents/service/mindsnap
npx tsc --noEmit
```
Expected: 에러 없음(0 errors).

- [ ] **Step 5: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add lib/types.ts lib/mappers.ts lib/supabase-service.ts
git commit -m "feat: 감정 분석 타입/매퍼/서비스 함수 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: 설정 화면 옵트아웃 토글

**Files:**
- Modify: `app/settings/app-settings/page.tsx`

**Interfaces:**
- Consumes: Task 4의 `getSentimentAnalysisPreference`, `updateSentimentAnalysisPreference`

- [ ] **Step 1: 토글 UI 추가**

`app/settings/app-settings/page.tsx`의 import 블록에 추가:

```typescript
import { useAuth } from '@/contexts/AuthContext'
import { getSentimentAnalysisPreference, updateSentimentAnalysisPreference } from '@/lib/supabase-service'
import { Sparkles } from 'lucide-react'
```
(`useAuth`는 이미 import되어 있으면 중복 추가하지 않는다 — 기존 import 문 확인 후 `Sparkles`만 `lucide-react` import에 추가.)

컴포넌트 내부, 기존 `rememberTodayNotification` state 바로 아래에 추가:

```typescript
  // AI 감정 분석 옵트아웃 토글 — 기본값은 true(켜짐), DB(profiles.sentiment_analysis_enabled)에서 불러온다
  const [sentimentEnabled, setSentimentEnabled] = useState(true)
  const [sentimentLoading, setSentimentLoading] = useState(false)
```

기존 `useEffect(() => { if (user) {...} }, [user])` 블록 안, `rememberTodayNotification` 로드 로직 뒤에 추가:

```typescript
      if (user.uid) {
        getSentimentAnalysisPreference(user.uid)
          .then(setSentimentEnabled)
          .catch((error) => console.error('감정 분석 설정 조회 오류:', error))
      }
```

`handleNotificationToggle` 함수 뒤에 새 핸들러 추가:

```typescript
  const handleSentimentToggle = async () => {
    if (!user?.uid) return
    setSentimentLoading(true)

    try {
      const newValue = !sentimentEnabled
      await updateSentimentAnalysisPreference(user.uid, newValue)
      setSentimentEnabled(newValue)
    } catch (error) {
      console.error('감정 분석 설정 변경 오류:', error)
      alert('설정 변경 중 오류가 발생했습니다.')
    } finally {
      setSentimentLoading(false)
    }
  }
```

"알림 설정" `Card` 바로 다음에 새 `Card` 추가:

```tsx
      {/* AI 감정 분석 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>AI 감정 분석</span>
          </CardTitle>
          <CardDescription>
            기록한 글을 바탕으로 감정과 키워드를 분석해서 보여드려요
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <Sparkles className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium">감정 분석 사용</p>
                <p className="text-xs text-muted-foreground">
                  끄면 이후 작성하는 기록은 분석되지 않아요
                </p>
              </div>
            </div>
            <button
              onClick={handleSentimentToggle}
              disabled={sentimentLoading}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${
                sentimentEnabled ? 'bg-primary' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  sentimentEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </CardContent>
      </Card>
```

- [ ] **Step 2: 빌드로 검증**

```bash
cd /Users/ylia/Documents/service/mindsnap
npm run build 2>&1 | tail -20
```
Expected: 빌드 성공, `/settings/app-settings` 라우트가 에러 없이 포함됨.

- [ ] **Step 3: 토글 영속성 수동 검증 (Review Focus 항목)**

```bash
cd /Users/ylia/Documents/service/mindsnap
npm run dev &
sleep 3
echo "브라우저에서 http://localhost:3000/login 접속 → 로그인 → 설정 > 앱 설정에서"
echo "'감정 분석 사용' 토글을 끄고 → 페이지 새로고침 → 토글이 꺼진 상태로 유지되는지 확인"
echo "확인 후 Ctrl+C로 종료"
wait
```
Expected: 새로고침해도 꺼진 상태가 유지된다(DB에 실제로 반영되었다는 뜻 — 로컬 상태만이 아님).

- [ ] **Step 4: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add app/settings/app-settings/page.tsx
git commit -m "feat: AI 감정 분석 옵트아웃 토글 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: 기록별 감정 배지 + 저널 통합 + 폴링 훅

**Files:**
- Create: `lib/hooks/useSentimentMap.ts`
- Create: `components/SentimentBadge.tsx`
- Modify: `app/journal/page.tsx`

**Interfaces:**
- Consumes: Task 4의 `getSentimentAnalysisForUser`, Task 1의 `SentimentAnalysis` 타입
- Produces: `useSentimentMap(userId): Record<string, SentimentAnalysis>`, `sentimentKey(table, id): string`, `<SentimentBadge analysis={...} />`

- [ ] **Step 1: 폴링 훅 작성**

```typescript
// lib/hooks/useSentimentMap.ts
'use client'

import { useEffect, useRef, useState } from 'react'
import { getSentimentAnalysisForUser } from '@/lib/supabase-service'
import { SentimentAnalysis } from '@/lib/types'

export const sentimentKey = (table: string, id: string) => `${table}:${id}`

// 기록 저장 직후엔 백그라운드 분석이 아직 안 끝났을 수 있다(status: 'pending').
// pending 행이 하나라도 있는 동안만 3초 간격으로 다시 조회해서, 분석이 끝나면
// 화면이 자동으로 갱신되게 한다. 최대 20회(약 1분) 시도 후엔 조용히 멈춘다 —
// 이 프로젝트는 과거 Supabase Realtime 구독을 버그 진원지로 지목하고 제거한
// 이력이 있어(lib/supabase-service.ts 상단 주석 참고) 같은 효과를 폴링으로 낸다.
export const useSentimentMap = (userId: string | undefined) => {
  const [map, setMap] = useState<Record<string, SentimentAnalysis>>({})
  const attemptsRef = useRef(0)

  useEffect(() => {
    if (!userId) return
    let cancelled = false
    let timeoutId: ReturnType<typeof setTimeout>

    const fetchOnce = async () => {
      let rows: SentimentAnalysis[] = []
      try {
        rows = await getSentimentAnalysisForUser(userId)
      } catch (error) {
        console.error('감정 분석 결과 조회 오류:', error)
        return
      }
      if (cancelled) return

      const nextMap: Record<string, SentimentAnalysis> = {}
      let hasPending = false
      for (const row of rows) {
        nextMap[sentimentKey(row.sourceTable, row.sourceId)] = row
        if (row.status === 'pending') hasPending = true
      }
      setMap(nextMap)

      attemptsRef.current += 1
      if (hasPending && attemptsRef.current < 20) {
        timeoutId = setTimeout(fetchOnce, 3000)
      }
    }

    fetchOnce()

    return () => {
      cancelled = true
      clearTimeout(timeoutId)
    }
  }, [userId])

  return map
}
```

- [ ] **Step 2: 배지 컴포넌트 작성**

```tsx
// components/SentimentBadge.tsx
import { SentimentAnalysis } from '@/lib/types'

const labelFor = (score: number): string => {
  if (score >= 0.25) return '😊 긍정적인 기록이에요'
  if (score <= -0.25) return '😔 힘든 하루였나봐요'
  return '😐 담담한 하루였네요'
}

export function SentimentBadge({ analysis }: { analysis?: SentimentAnalysis }) {
  if (!analysis || analysis.status === 'failed') return null

  if (analysis.status === 'pending') {
    return (
      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>감정 분석 중...</span>
      </div>
    )
  }

  if (analysis.sentimentScore === undefined) return null

  return <div className="text-xs text-muted-foreground">{labelFor(analysis.sentimentScore)}</div>
}
```

- [ ] **Step 3: `app/journal/page.tsx`에 훅/배지 연결**

파일 상단 import 블록에 추가:

```typescript
import { useSentimentMap, sentimentKey } from '@/lib/hooks/useSentimentMap'
import { SentimentBadge } from '@/components/SentimentBadge'
import { SentimentAnalysis } from '@/lib/types'
```

`SnapList` 컴포넌트 정의(`const SnapList = ({ ... }: { ... }) => {`)의 props 타입에 `sentimentMap: Record<string, SentimentAnalysis>`를 추가하고, 구조분해 목록에도 `sentimentMap`을 추가한다. 카드 안 제목 `<h3>` 바로 아래에 배지를 추가:

```tsx
                  <h3 className="font-medium text-foreground text-base">
                  {snap.title}
                </h3>
                <SentimentBadge analysis={sentimentMap[sentimentKey('snap', snap.id)]} />
```

`MoodRecordList`도 동일하게 props에 `sentimentMap: Record<string, SentimentAnalysis>` 추가하고, 제목 `<h3>` 아래에:

```tsx
                  <h3 className="font-medium text-foreground text-base">
                    {record.note || '마음 기록'}
                  </h3>
                  <SentimentBadge analysis={sentimentMap[sentimentKey('mood_record', record.id)]} />
```

`RememberTodayList`도 동일하게 props에 `sentimentMap: Record<string, SentimentAnalysis>` 추가하고, 제목 `<h3>` 아래에:

```tsx
                  <h3 className="font-medium text-foreground text-base">
                    {record.summary}
                  </h3>
                  <SentimentBadge analysis={sentimentMap[sentimentKey('remember_today', record.id)]} />
```

`export default function JournalPage()` 내부, `const { user } = useAuth()` 바로 아래에 추가:

```typescript
  const sentimentMap = useSentimentMap(user?.uid)
```

각 리스트 컴포넌트 호출부에 `sentimentMap` prop 전달:

```tsx
                <MoodRecordList 
                  searchTerm={searchTerm}
                  displayedRecords={displayedMoodRecords}
                  hasMore={hasMoreMoodRecords}
                  isLoadingMore={isLoadingMore}
                    onDelete={handleDeleteMoodRecord}
                    sentimentMap={sentimentMap}
                  />
```
```tsx
                  <RememberTodayList 
                    searchTerm={searchTerm}
                    displayedRecords={displayedRememberRecords}
                    hasMore={hasMoreRememberRecords}
                    isLoadingMore={isLoadingMore}
                    onDelete={handleDeleteRememberRecord}
                    sentimentMap={sentimentMap}
                  />
```
```tsx
                <SnapList 
                  filteredSnaps={filteredSnaps} 
                  searchTerm={searchTerm}
                  displayedSnaps={displayedSnaps}
                  hasMore={hasMoreSnaps}
                  isLoadingMore={isLoadingMore}
                    onDelete={handleDeleteSnap}
                    sentimentMap={sentimentMap}
                />
```

- [ ] **Step 4: 빌드로 검증**

```bash
cd /Users/ylia/Documents/service/mindsnap
npx tsc --noEmit
npm run build 2>&1 | tail -20
```
Expected: 타입 에러 없음, 빌드 성공.

- [ ] **Step 5: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add lib/hooks/useSentimentMap.ts components/SentimentBadge.tsx app/journal/page.tsx
git commit -m "feat: 저널 화면에 기록별 감정 배지 표시 (폴링 기반 자동 갱신)

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: 감정 추이 그래프 + 키워드 통계 화면

**Files:**
- Create: `components/SentimentTrendChart.tsx`
- Create: `app/journal/insights/page.tsx`
- Modify: `app/journal/page.tsx`

**Interfaces:**
- Consumes: Task 4의 `getSentimentAnalysisForUser`
- Produces: `/journal/insights` 라우트, `<SentimentTrendChart points={...} />`

- [ ] **Step 1: 추이 그래프 컴포넌트 작성**

`dataviz` 스킬 원칙(얇은 2px 선, 차분한 격자선)에 따라 커스텀 SVG로 구현한다 — `components/LifeCycleChart.tsx`와 같은 패턴.

```tsx
// components/SentimentTrendChart.tsx
'use client'

interface TrendPoint {
  date: Date
  score: number
}

interface SentimentTrendChartProps {
  points: TrendPoint[]
}

const CHART_HEIGHT = 160
const PADDING = 16
const POINT_GAP = 24

export default function SentimentTrendChart({ points }: SentimentTrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        아직 분석된 기록이 없어요
      </div>
    )
  }

  const width = Math.max(320, PADDING * 2 + (points.length - 1) * POINT_GAP)
  const plotHeight = CHART_HEIGHT - PADDING * 2
  // sentiment_score는 -1.0 ~ 1.0 범위
  const yFor = (score: number) => PADDING + plotHeight - ((score + 1) / 2) * plotHeight
  const xFor = (index: number) =>
    points.length === 1 ? width / 2 : PADDING + index * ((width - PADDING * 2) / (points.length - 1))

  const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.score)}`).join(' ')
  const zeroY = yFor(0)

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={CHART_HEIGHT} className="block">
        <line
          x1={PADDING}
          y1={zeroY}
          x2={width - PADDING}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={xFor(i)} cy={yFor(p.score)} r={3} fill="hsl(var(--primary))" />
        ))}
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: 인사이트 페이지 작성**

```tsx
// app/journal/insights/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuth } from '@/contexts/AuthContext'
import { getSentimentAnalysisForUser } from '@/lib/supabase-service'
import { SentimentAnalysis } from '@/lib/types'
import SentimentTrendChart from '@/components/SentimentTrendChart'

export default function JournalInsightsPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [analyses, setAnalyses] = useState<SentimentAnalysis[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    if (!user?.uid) return
    getSentimentAnalysisForUser(user.uid, 500)
      .then(setAnalyses)
      .catch((error) => console.error('감정 인사이트 조회 오류:', error))
      .finally(() => setIsLoading(false))
  }, [user?.uid])

  const completed = analyses.filter((a) => a.status === 'completed')

  const trendPoints = [...completed]
    .filter((a) => a.sentimentScore !== undefined)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime())
    .map((a) => ({ date: a.createdAt, score: a.sentimentScore as number }))

  const entityCounts = new Map<string, number>()
  for (const analysis of completed) {
    for (const entity of analysis.entities) {
      entityCounts.set(entity.name, (entityCounts.get(entity.name) ?? 0) + 1)
    }
  }
  const topEntities = Array.from(entityCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">감정 인사이트</h1>
          <p className="text-muted-foreground text-mobile-sm">기록에 담긴 감정과 키워드를 모아봤어요</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : (
        <>
          <Card>
            <CardHeader>
              <CardTitle>감정 추이</CardTitle>
            </CardHeader>
            <CardContent>
              <SentimentTrendChart points={trendPoints} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>자주 언급된 키워드</CardTitle>
            </CardHeader>
            <CardContent>
              {topEntities.length === 0 ? (
                <p className="text-sm text-muted-foreground">아직 데이터가 충분하지 않아요</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {topEntities.map(([name, count]) => (
                    <span key={name} className="px-3 py-1.5 rounded-full bg-primary/10 text-primary text-sm">
                      {name} <span className="text-muted-foreground">{count}</span>
                    </span>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 저널 화면에서 인사이트 페이지로 가는 진입점 추가**

`app/journal/page.tsx`의 검색창(`<Input ... placeholder="제목이나 태그로 검색하세요" />`) 바로 위에 링크 버튼 추가:

```tsx
      <div className="flex justify-end">
        <Link href="/journal/insights">
          <Button variant="outline" size="sm">
            감정 인사이트 보기
          </Button>
        </Link>
      </div>
```

- [ ] **Step 4: 빌드로 검증**

```bash
cd /Users/ylia/Documents/service/mindsnap
npx tsc --noEmit
npm run build 2>&1 | tail -25
```
Expected: 타입 에러 없음, 빌드 결과 라우트 목록에 `/journal/insights` 포함.

- [ ] **Step 5: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add components/SentimentTrendChart.tsx app/journal/insights/page.tsx app/journal/page.tsx
git commit -m "feat: 감정 추이 그래프 및 키워드 통계 화면 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 8: 개인정보처리방침에 Google Cloud 조항 추가

**Files:**
- Modify: `app/privacy-policy/page.tsx`

**Interfaces:**
- Consumes: 기존 `OVERSEAS` 상수, `ItemBlock` 컴포넌트(이미 파일 내 정의됨)

- [ ] **Step 1: `OVERSEAS` 상수에 Google Cloud 항목 추가**

`const OVERSEAS = { ... }` 블록(기존 `supabaseCountry`/`supabaseContact`/`awsCountry`/`awsContact`가 있는 곳)에 추가:

```typescript
  googleCloudCountry: '미국 (운영사 Google LLC 소재국가)',
  googleCloudContact: 'https://cloud.google.com/terms/cloud-privacy-notice',
```

- [ ] **Step 2: 제5조(위탁)에 Google Cloud 행 추가**

`<ItemBlock title="Amazon Web Services, Inc." ... />` 바로 다음(제5조 섹션)에 추가:

```tsx
          <ItemBlock
            title="Google LLC (Google Cloud Natural Language API)"
            rows={[
              ['위탁 업무', '이용자가 작성한 기록의 감정 분석 및 주요 키워드(엔티티) 추출'],
              ['보유기간', '분석 요청·응답 처리 목적으로만 일시 사용되며 별도로 보관되지 않음'],
            ]}
          />
```

- [ ] **Step 3: 제6조(국외이전)에 Google Cloud 행 추가**

`<ItemBlock title="Amazon Web Services, Inc." ... />`(제6조 섹션, 국외이전) 바로 다음에 추가:

```tsx
          <ItemBlock
            title="Google LLC (Google Cloud Natural Language API)"
            rows={[
              ['이전 국가', OVERSEAS.googleCloudCountry],
              ['이전 항목', '스냅 메모, 마음 기록 메모, 오늘을 기억할래 전체 텍스트'],
              ['이전 일시·방법', '기록 저장 시점에 정보통신망을 통해 암호화된 상태로 전송'],
              ['이용 목적', '감정 분석 및 주요 키워드(엔티티) 추출'],
              ['보유기간', '분석 요청·응답 처리 목적으로만 일시 사용되며 별도로 보관되지 않음'],
              ['연락처', OVERSEAS.googleCloudContact],
            ]}
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            감정 분석 기능은 설정 &gt; 앱 설정 &gt; AI 감정 분석에서 언제든지 끌 수 있으며, 끄더라도
            서비스의 다른 모든 기능은 정상적으로 이용할 수 있습니다.
          </p>
```

- [ ] **Step 4: 빌드로 검증**

```bash
cd /Users/ylia/Documents/service/mindsnap
npm run build 2>&1 | tail -10
```
Expected: 빌드 성공, `/privacy-policy` 라우트 정상 포함.

- [ ] **Step 5: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add app/privacy-policy/page.tsx
git commit -m "docs: 개인정보처리방침에 Google Cloud NL API 국외이전/위탁 조항 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 9: 전체 빌드 검증 + Capacitor 동기화

**Files:**
- (변경 없음 — 지금까지의 모든 변경사항을 웹/네이티브 빌드로 최종 확인)

**Interfaces:**
- Consumes: Task 1~8의 모든 결과물

- [ ] **Step 1: 웹(standalone) 빌드**

```bash
cd /Users/ylia/Documents/service/mindsnap
npm run build 2>&1 | tail -30
```
Expected: 에러 없이 성공, `/journal/insights` 포함 전체 라우트 목록 출력.

- [ ] **Step 2: Capacitor(정적 export) 빌드**

```bash
cd /Users/ylia/Documents/service/mindsnap
npm run build:capacitor 2>&1 | tail -30
```
Expected: 에러 없이 성공.

- [ ] **Step 3: iOS/Android 동기화 및 중복 파일 확인**

```bash
cd /Users/ylia/Documents/service/mindsnap
npx cap sync 2>&1 | tail -25
find ios android -type f \( -name "* [0-9].xml" -o -name "* [0-9].png" -o -name "* [0-9].html" -o -name "* [0-9].json" \) 2>/dev/null
echo "(위에 아무것도 없으면 깨끗함)"
```
Expected: sync 성공, 중복 파일 없음.

- [ ] **Step 4: 수동 E2E 체크리스트 (사람이 시뮬레이터/실기기에서 확인)**

1. 앱 실행 → 빠른 캡처에서 메모를 남기며 스냅 저장 → 저널 > 스냅 탭으로 이동
2. 잠시 "감정 분석 중..." 표시가 보였다가, 몇 초 안에 긍정/부정/담담 배지로 바뀌는지 확인
3. 저널 상단 "감정 인사이트 보기" 클릭 → 추이 그래프와 키워드 목록이 나오는지 확인
4. 설정 > 앱 설정에서 "감정 분석 사용"을 끈 뒤 → 새 스냅 저장 → 해당 스냅에는 배지가 전혀 안 뜨는지 확인(분석 자체가 안 돎)
5. 설정 > 개인정보처리방침에서 Google 관련 조항이 보이는지 확인

- [ ] **Step 5: Commit** (Task 1~8에서 이미 각 단계별로 커밋했으므로, 이 태스크는 검증 전용이라 추가 커밋 없음. 검증 중 문제가 발견되면 해당 태스크로 돌아가 수정 후 그 태스크 기준으로 커밋한다.)
