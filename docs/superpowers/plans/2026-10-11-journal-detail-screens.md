# 저널 상세 화면 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 저널 화면(스냅/마음기록/오늘을기억할래/성격검사결과)의 카드를 클릭하면 각 기록의 읽기 전용 상세 화면으로 이동하도록 만든다.

**Architecture:** 네 가지 기록 유형마다 정적 페이지(`app/journal/snap`, `app/journal/mood`, `app/journal/remember`, `app/journal/personality`)를 새로 만들고, `?id=` 쿼리 파라미터로 대상 레코드를 지정한다(Capacitor `output: 'export'` 빌드는 동적 세그먼트 `[id]`를 쓸 수 없어 기존 `/journal?tab=`과 같은 쿼리 파라미터 패턴을 그대로 따른다). 스냅은 기존 `getSnap()`을 재사용하고, 마음기록/오늘을기억할래/성격검사결과는 단건 조회 함수를 새로 추가한다. 저널 목록의 각 카드에 클릭 핸들러를 달아 해당 상세 페이지로 이동시킨다.

**Tech Stack:** Next.js 14 App Router(`next/navigation`의 `useSearchParams`/`useRouter`) / Supabase(기존 RLS 재사용) / Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-10-11-journal-detail-screens-design.md`

## Global Constraints

- 모든 상세 화면은 **읽기 전용**이다 — 수정·삭제 기능을 넣지 않는다(삭제는 기존처럼 목록의 스와이프로만 가능).
- Capacitor 정적 export 호환을 위해 동적 라우트 세그먼트(`[id]`) 대신 **쿼리 파라미터**(`?id=`)를 쓴다 — `app/login/page.tsx`가 이미 `next/navigation`의 `useSearchParams()`를 Suspense 경계 없이 쓰고 있고 빌드가 정상 통과하므로 같은 패턴을 따른다.
- `id`가 없거나, 조회 결과가 없거나(`null`), 소프트 삭제된 기록(`deletedAt`이 설정됨)인 경우 **"기록을 찾을 수 없어요"**를 보여준다(세 상황 모두 동일한 안내).
- 각 테이블(`snaps`/`mood_records`/`remember_today`/`personality_test_results`)에는 이미 `select using (auth.uid() = user_id)` RLS가 걸려 있다 — 단건 조회 함수에 별도의 소유권 검증 로직을 추가하지 않는다(DB가 이미 막아줌).
- 이 프로젝트는 단위 테스트 프레임워크를 쓰지 않기로 이미 결정되어 있다(감정 분석 기능 구현 때 사용자가 명시적으로 결정). 검증은 `npx tsc --noEmit` + `npm run build` + curl 기반 E2E로 한다.

## Review Focus

- **소프트 삭제된 기록에 직접 id로 접근** — "기록을 찾을 수 없어요"로 처리되어야 한다. Task 2(스냅)에서 검증 패턴을 확립하고, Task 3~5도 동일 패턴을 따른다.
- **`id` 쿼리 파라미터 자체가 없는 경우** — 역시 "기록을 찾을 수 없어요"로 처리되어야 한다(빈 문자열로 조회를 시도해 엉뚱한 에러가 나면 안 됨). Task 2에서 검증.
- **타인의 기록 id로 직접 접근** — RLS가 막아 조회 결과가 `null`이 되고, 역시 "기록을 찾을 수 없어요"로 처리되어야 한다. Task 1의 curl 검증에서 서비스 함수 레벨로 확인.
- **스냅에 이미지/음성이 둘 다 없는 경우** — 해당 섹션 자체가 안 보여야 한다(빈 `<img>`/`<audio>` 노출 금지). Task 2에서 검증.
- **성격검사결과 3개 유형(shape/enneagram/life_cycle)의 콘텐츠 필드 구조가 서로 다름** — 타입별로 올바른 필드를 렌더링해야 한다(예: enneagram에만 있는 `weaknesses`를 shape 결과에 적용하면 안 됨). Task 5에서 각 유형별로 검증.

---

## File Structure

| 파일 | 역할 |
|---|---|
| `lib/supabase-service.ts` | `getMoodRecord`, `getRememberTodayItem`, `getPersonalityTestResultById` 단건 조회 함수 추가 |
| `lib/types.ts` | `TEST_TYPE_LABELS` 상수 추가(기존에 `app/journal/page.tsx`에 지역 정의되어 있던 걸 공용으로 이동) |
| `app/journal/snap/page.tsx` | 스냅 상세 화면(신규) |
| `app/journal/mood/page.tsx` | 마음기록 상세 화면(신규) |
| `app/journal/remember/page.tsx` | 오늘을 기억할래 상세 화면(신규) |
| `app/journal/personality/page.tsx` | 성격검사결과 상세 화면(신규) |
| `app/journal/page.tsx` | 목록 카드 클릭 시 상세 화면으로 이동하도록 연결, `TEST_TYPE_LABELS` import로 교체 |

---

### Task 1: 서비스 레이어 — 단건 조회 함수 3개 추가

**Files:**
- Modify: `lib/supabase-service.ts`

**Interfaces:**
- Consumes: 기존 `mapMoodRecordRow`, `mapRememberTodayRow`, `mapPersonalityTestResultRow`(모두 이미 `lib/supabase-service.ts`에 import되어 있음), `MoodRecordRow`, `RememberTodayRow`, `PersonalityTestResultRow`(동일하게 이미 import됨)
- Produces: `getMoodRecord(recordId: string): Promise<MoodRecord | null>`, `getRememberTodayItem(id: string): Promise<RememberToday | null>`, `getPersonalityTestResultById(id: string): Promise<PersonalityTestResult | null>`

- [ ] **Step 1: 세 함수를 기존 `getSnap` 패턴 그대로 추가**

`lib/supabase-service.ts`의 `export const getSnap = ...` 함수 바로 다음(Snap services 섹션 안)에 추가:

```typescript
export const getMoodRecord = async (recordId: string): Promise<MoodRecord | null> => {
  const { data, error } = await supabase.from('mood_records').select('*').eq('id', recordId).maybeSingle<MoodRecordRow>()
  if (error || !data) return null
  return mapMoodRecordRow(data)
}
```

`export const getRememberToday = ...` 함수 다음(Remember Today services 섹션 안)에 추가:

```typescript
export const getRememberTodayItem = async (id: string): Promise<RememberToday | null> => {
  const { data, error } = await supabase.from('remember_today').select('*').eq('id', id).maybeSingle<RememberTodayRow>()
  if (error || !data) return null
  return mapRememberTodayRow(data)
}
```

`export const getPersonalityTestResults = ...` 함수 다음(성격 검사 결과 섹션 안)에 추가:

```typescript
export const getPersonalityTestResultById = async (id: string): Promise<PersonalityTestResult | null> => {
  const { data, error } = await supabase.from('personality_test_results').select('*').eq('id', id).maybeSingle<PersonalityTestResultRow>()
  if (error || !data) return null
  return mapPersonalityTestResultRow(data)
}
```

- [ ] **Step 2: 타입 체크로 검증**

Run:
```bash
cd /Users/ylia/Documents/service/mindsnap
npx tsc --noEmit
```
Expected: 에러 없음(0 errors).

- [ ] **Step 3: curl E2E 검증 — 본인 소유 조회 성공 + 타인 소유 조회 시 `null`(Review Focus 항목)**

```bash
cd /Users/ylia/Documents/service/mindsnap
set -a; source .env.local; set +a

# 사용자 A: 마음기록 하나 생성
TEST_EMAIL_A="detail-a-$(date +%s)@example.com"
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL_A\",\"password\":\"TestPass123!\"}" > /tmp/detail-a.json
A_ID=$(node -e "console.log(require('/tmp/detail-a.json').user.id)")
A_TOKEN=$(node -e "console.log(require('/tmp/detail-a.json').access_token)")

curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/mood_records" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $A_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"user_id\":\"$A_ID\",\"mood_level\":3,\"note\":\"테스트 마음기록\",\"activities\":[]}" \
  > /tmp/detail-mood.json
MOOD_ID=$(node -e "console.log(require('/tmp/detail-mood.json')[0].id)")

echo "=== A 본인 토큰으로 조회(1건이어야 함) ==="
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/mood_records?id=eq.$MOOD_ID&select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $A_TOKEN"
echo ""

# 사용자 B: 다른 사용자
TEST_EMAIL_B="detail-b-$(date +%s)@example.com"
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL_B\",\"password\":\"TestPass123!\"}" > /tmp/detail-b.json
B_ID=$(node -e "console.log(require('/tmp/detail-b.json').user.id)")
B_TOKEN=$(node -e "console.log(require('/tmp/detail-b.json').access_token)")

echo "=== B 토큰으로 A의 mood_record 조회(RLS로 막혀 빈 배열이어야 함 — getMoodRecord는 이 경우 null 반환) ==="
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/mood_records?id=eq.$MOOD_ID&select=*" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $B_TOKEN"
echo ""

curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$A_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" > /dev/null
curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$B_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" > /dev/null
rm -f /tmp/detail-a.json /tmp/detail-b.json /tmp/detail-mood.json
```
Expected: A 토큰 조회는 방금 만든 행 1개, B 토큰 조회는 `[]`(RLS가 막음 — `getMoodRecord`가 이 REST 응답을 그대로 쓰므로 `data`가 없어 `null`을 반환하게 됨).

- [ ] **Step 4: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add lib/supabase-service.ts
git commit -m "feat: 마음기록/오늘을기억할래/성격검사결과 단건 조회 함수 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 2: 스냅 상세 화면

**Files:**
- Create: `app/journal/snap/page.tsx`

**Interfaces:**
- Consumes: 기존 `getSnap(snapId: string): Promise<Snap | null>`(`lib/supabase-service.ts`), `Snap` 타입(`lib/types.ts`)

- [ ] **Step 1: 페이지 작성**

```tsx
// app/journal/snap/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getSnap } from '@/lib/supabase-service'
import { Snap } from '@/lib/types'

export default function SnapDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  // undefined = 로딩 중, null = 찾을 수 없음(id 없음/조회 실패/삭제됨)
  const [snap, setSnap] = useState<Snap | null | undefined>(undefined)

  useEffect(() => {
    if (!id) {
      setSnap(null)
      return
    }
    getSnap(id)
      .then((result) => setSnap(result && !result.deletedAt ? result : null))
      .catch((error) => {
        console.error('스냅 조회 오류:', error)
        setSnap(null)
      })
  }, [id])

  const formatDate = (date: Date) =>
    date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">스냅</h1>
      </div>

      {snap === undefined ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : snap === null ? (
        <div className="text-center py-12 text-muted-foreground">기록을 찾을 수 없어요</div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            <h2 className="text-lg font-semibold text-foreground">{snap.title}</h2>
            {snap.imageUrl && (
              <img src={snap.imageUrl} alt={snap.title} className="w-full rounded-lg" />
            )}
            {snap.audioUrl && <audio controls src={snap.audioUrl} className="w-full" />}
            {snap.note && <p className="text-sm text-foreground whitespace-pre-wrap">{snap.note}</p>}
            {snap.tags.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {snap.tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            <div className="text-sm text-muted-foreground">{formatDate(snap.capturedAt)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 빌드로 검증**

```bash
cd /Users/ylia/Documents/service/mindsnap
npx tsc --noEmit
npm run build 2>&1 | tail -25
```
Expected: 타입 에러 없음, 빌드 결과 라우트 목록에 `/journal/snap` 포함.

- [ ] **Step 3: curl E2E 검증 — id 없음/삭제된 기록 처리(Review Focus 항목)는 Task 1에서 검증한 것과 같은 조회 경로를 타므로, 여기서는 실제 스냅 하나를 만들고 소프트 삭제해서 `getSnap`이 올바른 값을 반환하는지만 추가 확인**

```bash
cd /Users/ylia/Documents/service/mindsnap
set -a; source .env.local; set +a

TEST_EMAIL="detail-snap-$(date +%s)@example.com"
curl -s -X POST "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/signup" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Content-Type: application/json" \
  -d "{\"email\":\"$TEST_EMAIL\",\"password\":\"TestPass123!\"}" > /tmp/detail-snap-probe.json
USER_ID=$(node -e "console.log(require('/tmp/detail-snap-probe.json').user.id)")
ACCESS_TOKEN=$(node -e "console.log(require('/tmp/detail-snap-probe.json').access_token)")

curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/snaps" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=representation" \
  -d "{\"user_id\":\"$USER_ID\",\"title\":\"상세 화면 테스트\",\"note\":\"본문 내용\"}" \
  > /tmp/detail-snap.json
SNAP_ID=$(node -e "console.log(require('/tmp/detail-snap.json')[0].id)")

echo "=== 삭제 전 — deleted_at이 null이어야 함 ==="
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/snaps?id=eq.$SNAP_ID&select=deleted_at" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN"
echo ""

curl -s -X PATCH "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/snaps?id=eq.$SNAP_ID" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  -d "{\"deleted_at\": \"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\"}"

echo "=== 삭제 후 — deleted_at이 설정되어 있어야 함(페이지는 이걸 보고 '찾을 수 없음' 처리) ==="
curl -s "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/snaps?id=eq.$SNAP_ID&select=deleted_at" \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY" -H "Authorization: Bearer $ACCESS_TOKEN"
echo ""

curl -s -X DELETE "$NEXT_PUBLIC_SUPABASE_URL/auth/v1/admin/users/$USER_ID" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" > /dev/null
rm -f /tmp/detail-snap-probe.json /tmp/detail-snap.json
```
Expected: 삭제 전 `deleted_at: null`, 삭제 후 `deleted_at`에 타임스탬프 값이 채워짐(`SnapDetailPage`의 `!result.deletedAt` 체크가 이 값을 보고 "찾을 수 없음"으로 분기함).

- [ ] **Step 4: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add app/journal/snap/page.tsx
git commit -m "feat: 스냅 상세 화면 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 3: 마음기록 상세 화면

**Files:**
- Create: `app/journal/mood/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `getMoodRecord(recordId: string): Promise<MoodRecord | null>`, `MoodRecord`/`MoodLevel` 타입(`lib/types.ts`)

- [ ] **Step 1: 페이지 작성**

5단계 mood 라벨/아이콘/색상은 `app/daily-mood/page.tsx`의 `moodOptions` 배열과 동일한 값을 쓴다(이 프로젝트에서 이미 `app/daily-mood/page.tsx`, `app/remember-today/page.tsx` 두 곳에서 같은 배열을 중복 정의해 쓰고 있는 기존 패턴을 그대로 따른다).

```tsx
// app/journal/mood/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Smile, Meh, Frown, Angry, Laugh } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getMoodRecord } from '@/lib/supabase-service'
import { MoodLevel, MoodRecord } from '@/lib/types'

// 5단계 기분 척도 (1: 매우 우울 ~ 5: 매우 행복) - app/daily-mood/page.tsx와 동일한 값
const moodOptions: { value: MoodLevel; label: string; icon: typeof Smile; color: string }[] = [
  { value: 1, label: '매우 우울', icon: Angry, color: 'text-red-500' },
  { value: 2, label: '우울', icon: Frown, color: 'text-blue-500' },
  { value: 3, label: '보통', icon: Meh, color: 'text-yellow-500' },
  { value: 4, label: '행복', icon: Smile, color: 'text-green-500' },
  { value: 5, label: '매우 행복', icon: Laugh, color: 'text-emerald-500' },
]

export default function MoodRecordDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [record, setRecord] = useState<MoodRecord | null | undefined>(undefined)

  useEffect(() => {
    if (!id) {
      setRecord(null)
      return
    }
    getMoodRecord(id)
      .then((result) => setRecord(result && !result.deletedAt ? result : null))
      .catch((error) => {
        console.error('마음기록 조회 오류:', error)
        setRecord(null)
      })
  }, [id])

  const formatDate = (date: Date) =>
    date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const moodOption = record ? moodOptions.find((o) => o.value === record.mood) : undefined
  const MoodIcon = moodOption?.icon

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">마음 기록</h1>
      </div>

      {record === undefined ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : record === null ? (
        <div className="text-center py-12 text-muted-foreground">기록을 찾을 수 없어요</div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-4">
            {moodOption && MoodIcon && (
              <div className={`flex items-center space-x-2 ${moodOption.color}`}>
                <MoodIcon className="w-6 h-6" />
                <span className="font-medium">{moodOption.label}</span>
              </div>
            )}
            {record.note && <p className="text-sm text-foreground whitespace-pre-wrap">{record.note}</p>}
            {record.activities.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {record.activities.map((activity) => (
                  <span key={activity} className="px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    {activity}
                  </span>
                ))}
              </div>
            )}
            <div className="text-sm text-muted-foreground">{formatDate(record.createdAt)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 빌드로 검증**

```bash
cd /Users/ylia/Documents/service/mindsnap
npx tsc --noEmit
npm run build 2>&1 | tail -25
```
Expected: 타입 에러 없음, 빌드 결과 라우트 목록에 `/journal/mood` 포함.

- [ ] **Step 3: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add app/journal/mood/page.tsx
git commit -m "feat: 마음기록 상세 화면 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 4: 오늘을 기억할래 상세 화면

**Files:**
- Create: `app/journal/remember/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `getRememberTodayItem(id: string): Promise<RememberToday | null>`, `RememberToday`/`MoodLevel` 타입(`lib/types.ts`)

- [ ] **Step 1: 페이지 작성**

```tsx
// app/journal/remember/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Smile, Meh, Frown, Angry, Laugh } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { getRememberTodayItem } from '@/lib/supabase-service'
import { MoodLevel, RememberToday } from '@/lib/types'

// 5단계 기분 척도 (1: 매우 우울 ~ 5: 매우 행복) - app/daily-mood/page.tsx와 동일한 값
const moodOptions: { value: MoodLevel; label: string; icon: typeof Smile; color: string }[] = [
  { value: 1, label: '매우 우울', icon: Angry, color: 'text-red-500' },
  { value: 2, label: '우울', icon: Frown, color: 'text-blue-500' },
  { value: 3, label: '보통', icon: Meh, color: 'text-yellow-500' },
  { value: 4, label: '행복', icon: Smile, color: 'text-green-500' },
  { value: 5, label: '매우 행복', icon: Laugh, color: 'text-emerald-500' },
]

const FIELDS: { key: keyof RememberToday; label: string }[] = [
  { key: 'memorableEvent', label: '기억에 남는 일' },
  { key: 'reason', label: '이유' },
  { key: 'cause', label: '원인' },
  { key: 'improvement', label: '개선할 점' },
  { key: 'action', label: '행동' },
  { key: 'summary', label: '요약' },
]

export default function RememberTodayDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [record, setRecord] = useState<RememberToday | null | undefined>(undefined)

  useEffect(() => {
    if (!id) {
      setRecord(null)
      return
    }
    getRememberTodayItem(id)
      .then((result) => setRecord(result && !result.deletedAt ? result : null))
      .catch((error) => {
        console.error('오늘을 기억할래 조회 오류:', error)
        setRecord(null)
      })
  }, [id])

  const formatDate = (date: Date) =>
    date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const moodOption = record ? moodOptions.find((o) => o.value === record.mood) : undefined
  const MoodIcon = moodOption?.icon

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">오늘을 기억할래</h1>
      </div>

      {record === undefined ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : record === null ? (
        <div className="text-center py-12 text-muted-foreground">기록을 찾을 수 없어요</div>
      ) : (
        <Card>
          <CardContent className="p-4 space-y-5">
            {moodOption && MoodIcon && (
              <div className={`flex items-center space-x-2 ${moodOption.color}`}>
                <MoodIcon className="w-6 h-6" />
                <span className="font-medium">{moodOption.label}</span>
              </div>
            )}
            {FIELDS.map(({ key, label }) => (
              <div key={key} className="space-y-1">
                <div className="text-sm font-medium text-foreground">{label}</div>
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">{record[key] as string}</p>
              </div>
            ))}
            {record.selectedDate && (
              <div className="text-sm text-muted-foreground">선택한 날짜: {formatDate(record.selectedDate)}</div>
            )}
            <div className="text-sm text-muted-foreground">작성일시: {formatDate(record.createdAt)}</div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
```

- [ ] **Step 2: 빌드로 검증**

```bash
cd /Users/ylia/Documents/service/mindsnap
npx tsc --noEmit
npm run build 2>&1 | tail -25
```
Expected: 타입 에러 없음, 빌드 결과 라우트 목록에 `/journal/remember` 포함.

- [ ] **Step 3: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add app/journal/remember/page.tsx
git commit -m "feat: 오늘을 기억할래 상세 화면 추가

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 5: 성격검사결과 상세 화면 + `TEST_TYPE_LABELS` 공용화

**Files:**
- Modify: `lib/types.ts`
- Create: `app/journal/personality/page.tsx`

**Interfaces:**
- Consumes: Task 1의 `getPersonalityTestResultById(id: string): Promise<PersonalityTestResult | null>`, 기존 `getPersonalityTestContent(testType): Promise<Record<string, any>>`(`lib/supabase-service.ts`), `PersonalityTestResult`/`PersonalityTestType` 타입
- Produces: `lib/types.ts`에 `export const TEST_TYPE_LABELS: Record<string, string>` (Task 6에서 `app/journal/page.tsx`가 이 값을 import해서 쓴다)

세 검사 유형(`shape`/`enneagram`/`life_cycle`)은 콘텐츠 필드 구조가 서로 다르다(각각 `app/personality-test/shape/page.tsx`, `app/personality-test/enneagram/page.tsx`, `app/personality-test/life-cycle/page.tsx`의 결과 화면 참고). 생일 인생주기(`life_cycle`)는 결과 화면에 "오늘 기준 나이에 따라 달라지는 연도 카드"까지 보여주지만, 그건 저장된 과거 결과가 아니라 매번 새로 계산되는 값이라 이 상세 화면에서는 재현하지 않는다 — `resultKey`(평생 고정인 탄생 카드 번호)로 조회되는 탄생 카드 콘텐츠만 보여준다.

- [ ] **Step 1: `lib/types.ts`에 `TEST_TYPE_LABELS` 추가**

`export type PersonalityTestType = 'shape' | 'enneagram' | 'life_cycle'` 바로 다음에 추가:

```typescript
export const TEST_TYPE_LABELS: Record<string, string> = {
  shape: '도형심리',
  enneagram: '에니어그램',
  life_cycle: '생일 인생주기',
}
```

- [ ] **Step 2: 상세 페이지 작성**

```tsx
// app/journal/personality/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { ArrowLeft, Sparkles, Star, ThumbsDown, ThumbsUp, TrendingUp } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { getPersonalityTestContent, getPersonalityTestResultById } from '@/lib/supabase-service'
import { PersonalityTestResult, TEST_TYPE_LABELS } from '@/lib/types'

interface ShapeContent {
  title: string
  traits: string[]
  strengths: string[]
  improvements: string[]
}

interface EnneagramContent {
  title: string
  traits: string[]
  strengths: string[]
  weaknesses: string[]
  growthGuide: string[]
}

interface LifeCycleContent {
  title: string
  keywords: string[]
  meaning: string[]
}

export default function PersonalityResultDetailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const id = searchParams.get('id')
  const [result, setResult] = useState<PersonalityTestResult | null | undefined>(undefined)
  const [content, setContent] = useState<Record<string, any> | null>(null)

  useEffect(() => {
    if (!id) {
      setResult(null)
      return
    }
    getPersonalityTestResultById(id)
      .then((r) => setResult(r && !r.deletedAt ? r : null))
      .catch((error) => {
        console.error('성격검사결과 조회 오류:', error)
        setResult(null)
      })
  }, [id])

  useEffect(() => {
    if (!result) return
    getPersonalityTestContent(result.testType)
      .then(setContent)
      .catch((error) => console.error('성격검사 콘텐츠 조회 오류:', error))
  }, [result])

  const formatDate = (date: Date) =>
    date.toLocaleDateString('ko-KR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })

  const resultContent = result && content ? content[result.resultKey] : undefined

  return (
    <div className="space-y-6 pb-28">
      <div className="flex items-center space-x-4">
        <Button variant="ghost" size="sm" onClick={() => router.back()} className="p-2">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-2xl font-bold">성격검사결과</h1>
      </div>

      {result === undefined ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : result === null ? (
        <div className="text-center py-12 text-muted-foreground">기록을 찾을 수 없어요</div>
      ) : !resultContent ? (
        <div className="text-center py-12 text-muted-foreground">불러오는 중...</div>
      ) : (
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">{TEST_TYPE_LABELS[result.testType] ?? result.testType}</p>

          {result.testType === 'shape' && (
            <Card>
              <CardHeader>
                <CardTitle>{(resultContent as ShapeContent).title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>기본 특징</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as ShapeContent).traits.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                    <span>장점</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as ShapeContent).strengths.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span>보완점</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as ShapeContent).improvements.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {result.testType === 'enneagram' && (
            <Card>
              <CardHeader>
                <CardTitle>당신은 [{(resultContent as EnneagramContent).title}]일 가능성이 높습니다.</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span>기본 특징</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as EnneagramContent).traits.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <ThumbsUp className="w-4 h-4 text-green-500" />
                    <span>장점</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as EnneagramContent).strengths.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <ThumbsDown className="w-4 h-4 text-red-400" />
                    <span>단점</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as EnneagramContent).weaknesses.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center space-x-2 text-sm font-medium">
                    <TrendingUp className="w-4 h-4 text-blue-500" />
                    <span>바라봐야 할 방향 / 성장 가이드</span>
                  </div>
                  <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                    {(resultContent as EnneagramContent).growthGuide.map((line, i) => (
                      <li key={i}>{line}</li>
                    ))}
                  </ul>
                </div>
              </CardContent>
            </Card>
          )}

          {result.testType === 'life_cycle' && (
            <Card className="border-primary/30 bg-primary/5">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Star className="w-5 h-5 text-amber-500" />
                  <span>나의 탄생 카드 · {(resultContent as LifeCycleContent).title}</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap gap-1.5">
                  {(resultContent as LifeCycleContent).keywords.map((kw, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded-full bg-primary/10 text-primary">
                      #{kw}
                    </span>
                  ))}
                </div>
                <ul className="space-y-1 text-mobile-sm text-muted-foreground list-disc list-inside">
                  {(resultContent as LifeCycleContent).meaning.map((line, i) => (
                    <li key={i}>{line}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <div className="text-sm text-muted-foreground">{formatDate(result.createdAt)}</div>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 3: 빌드로 검증**

```bash
cd /Users/ylia/Documents/service/mindsnap
npx tsc --noEmit
npm run build 2>&1 | tail -25
```
Expected: 타입 에러 없음, 빌드 결과 라우트 목록에 `/journal/personality` 포함.

- [ ] **Step 4: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add lib/types.ts app/journal/personality/page.tsx
git commit -m "feat: 성격검사결과 상세 화면 추가, TEST_TYPE_LABELS 공용화

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 6: 저널 목록 카드 클릭 연결

**Files:**
- Modify: `app/journal/page.tsx`

**Interfaces:**
- Consumes: Task 2~5의 라우트(`/journal/snap?id=`, `/journal/mood?id=`, `/journal/remember?id=`, `/journal/personality?id=`), Task 5의 `TEST_TYPE_LABELS`(`lib/types.ts`)

- [ ] **Step 1: `useRouter` import 추가**

`app/journal/page.tsx` 상단 import 블록(`import Link from 'next/link'` 바로 다음)에 추가:

```typescript
import { useRouter } from 'next/navigation'
```

- [ ] **Step 2: `TEST_TYPE_LABELS` 지역 정의 제거하고 공용 import로 교체**

`app/journal/page.tsx`에서 아래 지역 정의를 찾아 삭제:

```typescript
const TEST_TYPE_LABELS: Record<string, string> = {
  shape: '도형심리',
  enneagram: '에니어그램',
  life_cycle: '생일 인생주기',
}
```

대신 기존 `import { PersonalityTestResult, SentimentAnalysis } from '@/lib/types'` 줄을 아래로 교체:

```typescript
import { PersonalityTestResult, SentimentAnalysis, TEST_TYPE_LABELS } from '@/lib/types'
```

(`TEST_TYPE_LABELS`의 실제 사용처인 `PersonalityList`의 `titleFor` 함수는 코드 변경 없이 그대로 동작한다 — import 출처만 바뀜.)

- [ ] **Step 3: `MoodRecordList`에 클릭 이동 추가**

`MoodRecordList` 컴포넌트 맨 앞(`console.log('MoodRecordList props:'...)` 바로 위)에 추가:

```typescript
  const router = useRouter()
```

카드의 `<Card className="hover:shadow-md transition-shadow">`를 찾아 클릭 핸들러를 추가:

```tsx
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/journal/mood?id=${record.id}`)}
          >
```

- [ ] **Step 4: `RememberTodayList`에 클릭 이동 추가**

`RememberTodayList` 컴포넌트 맨 앞에 추가:

```typescript
  const router = useRouter()
```

카드의 `<Card className="hover:shadow-md transition-shadow">`를 찾아:

```tsx
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/journal/remember?id=${record.id}`)}
          >
```

- [ ] **Step 5: `SnapList`에 클릭 이동 추가**

`SnapList` 컴포넌트 맨 앞(`if (filteredSnaps.length === 0) {` 바로 위)에 추가:

```typescript
  const router = useRouter()
```

카드의 `<Card className="hover:shadow-md transition-shadow">`를 찾아:

```tsx
          <Card
            className="hover:shadow-md transition-shadow cursor-pointer"
            onClick={() => router.push(`/journal/snap?id=${snap.id}`)}
          >
```

- [ ] **Step 6: `PersonalityList`에 클릭 이동 추가**

`PersonalityList` 컴포넌트 맨 앞(`const [titlesByType, setTitlesByType] = useState...` 바로 다음)에 추가:

```typescript
  const router = useRouter()
```

카드(`<Card key={result.id}>`)를 찾아 클릭 핸들러를 추가:

```tsx
        <Card
          key={result.id}
          className="cursor-pointer hover:shadow-md transition-shadow"
          onClick={() => router.push(`/journal/personality?id=${result.id}`)}
        >
```

- [ ] **Step 7: 빌드로 검증**

```bash
cd /Users/ylia/Documents/service/mindsnap
npx tsc --noEmit
npm run build 2>&1 | tail -25
```
Expected: 타입 에러 없음, 빌드 성공.

- [ ] **Step 8: Commit**

```bash
cd /Users/ylia/Documents/service/mindsnap
git add app/journal/page.tsx
git commit -m "feat: 저널 목록 카드 클릭 시 상세 화면으로 이동

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>"
```

---

### Task 7: 전체 빌드 검증 + Capacitor 동기화

**Files:**
- (변경 없음 — 지금까지의 모든 변경사항을 웹/네이티브 빌드로 최종 확인)

**Interfaces:**
- Consumes: Task 1~6의 모든 결과물

- [ ] **Step 1: 웹(standalone) 빌드**

```bash
cd /Users/ylia/Documents/service/mindsnap
npm run build 2>&1 | tail -30
```
Expected: 에러 없이 성공, `/journal/snap`, `/journal/mood`, `/journal/remember`, `/journal/personality` 모두 라우트 목록에 포함.

- [ ] **Step 2: Capacitor(정적 export) 빌드**

```bash
cd /Users/ylia/Documents/service/mindsnap
npm run build:capacitor 2>&1 | tail -30
```
Expected: 에러 없이 성공(특히 `useSearchParams` 사용 페이지들이 Suspense 경계 없이도 export 빌드를 통과하는지 확인 — `app/login/page.tsx` 선례와 동일하게 통과해야 함).

- [ ] **Step 3: iOS/Android 동기화 및 중복 파일 확인**

```bash
cd /Users/ylia/Documents/service/mindsnap
npx cap sync 2>&1 | tail -25
find ios android -type f \( -name "* [0-9].xml" -o -name "* [0-9].png" -o -name "* [0-9].html" -o -name "* [0-9].json" \) 2>/dev/null
echo "(위에 아무것도 없으면 깨끗함)"
```
Expected: sync 성공, 중복 파일 없음(이 패턴에 걸리는 파일이 나오면 iCloud 동기화 충돌 사본일 가능성이 높다 — 2026-10-11 감정 분석 기능 작업 때 한 번 발견되어 정리한 이력이 있음).

- [ ] **Step 4: Commit** (Task 1~6에서 이미 각 단계별로 커밋했으므로, 이 태스크는 검증 전용이라 추가 커밋 없음. 검증 중 문제가 발견되면 해당 태스크로 돌아가 수정 후 그 태스크 기준으로 커밋한다.)
