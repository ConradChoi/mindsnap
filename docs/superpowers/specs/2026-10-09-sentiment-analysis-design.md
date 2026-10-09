# Google Cloud Natural Language API 연동 — 감정 분석/엔티티 추출 설계

작성일: 2026-10-09
상태: 설계 승인됨, 구현 계획 작성 전

## 배경 및 목표

마인드스냅의 저널 텍스트(스냅 메모, 마음 기록, 오늘을 기억할래)에 Google Cloud
Natural Language API를 연동해 감정 분석과 엔티티(사람/장소/주제 등) 추출을 붙인다.
iOS/Android 스토어 출시가 끝난 뒤 진행하는 후속 기능으로, 초기 ceo-advisor 검토
때부터 "기반 작업이 끝난 뒤" 순서로 미뤄뒀던 항목이다.

사용자에게 제공할 가치 3가지:
1. 기록별 즉석 피드백 — "오늘 기록은 긍정적이네요" 같은 한 줄 반응
2. 저널 전체의 감정 추이 그래프 — 시간에 따른 감정 흐름
3. 자주 언급되는 엔티티(사람/장소/주제) Top N 통계

## 범위

분석 대상 텍스트(전체):
- `snaps.note`
- `mood_records.note`
- `remember_today`의 6개 필드(memorable_event, reason, cause, improvement,
  action, summary)를 하나의 텍스트로 합쳐 분석

## 아키텍처

### 트리거: Postgres 트리거 → Edge Function (DB 트리거 방식 채택)

클라이언트가 직접 Edge Function을 호출하는 방식(fire-and-forget)도 검토했으나,
모바일에서 저장 직후 앱을 백그라운드로 보내면 요청이 끊겨 분석이 누락될 위험이
있어 기각했다. 대신 각 테이블에 `AFTER INSERT` 트리거를 걸어 Postgres의 `pg_net`
확장(`net.http_post`)으로 Edge Function을 직접 호출한다. 클라이언트 네트워크
상태와 완전히 분리되어 항상 실행된다.

### 분석: Supabase Edge Function `analyze-sentiment`

- Google Cloud Natural Language API의 `annotateText`를 호출(`extractDocumentSentiment`
  + `extractEntities` 기능을 동시에 요청 — API 호출 1회로 둘 다 받아옴).
- 언어는 `ko`(한국어) 고정.
- Google Cloud API 키는 Edge Function 환경변수(secret)로만 보관, 클라이언트에는
  절대 노출하지 않는다 — 회원탈퇴 Edge Function과 동일한 보안 원칙.
- 호출 전, 해당 사용자의 `profiles.sentiment_analysis_enabled`가 false면 분석 없이
  즉시 종료한다(옵트아웃 존중).
- Google API 실패 시 `sentiment_analysis.status = 'failed'`로 기록하고 종료 —
  원본 기록 저장에는 어떤 영향도 주지 않는다(완전히 분리된 백그라운드 작업).

### 저장: 신규 테이블 `sentiment_analysis`

세 소스 테이블에 각각 컬럼을 추가하는 대신, 결과를 한 테이블에 모아 저장한다 —
감정 추이 그래프와 엔티티 통계를 뽑을 때 테이블 하나만 보면 되기 때문이다.

```sql
create type sentiment_source_table as enum ('snap', 'mood_record', 'remember_today');

create table public.sentiment_analysis (
  id                   uuid primary key default gen_random_uuid(),
  user_id              uuid not null references auth.users(id) on delete cascade,
  source_table         sentiment_source_table not null,
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
```

- RLS: `select using (auth.uid() = user_id)`만 — 쓰기는 Edge Function이 service_role로
  수행하므로 클라이언트용 insert/update 정책은 두지 않는다.
- 소스 기록이 하드 삭제될 일은 없지만(소프트 삭제만 존재), 만약을 대비해 FK는
  걸지 않고 `source_id`는 참조용 UUID로만 둔다(세 테이블 중 어디를 가리키는지는
  `source_table`로 구분).

### 실시간 반영

클라이언트는 Supabase Realtime으로 `sentiment_analysis` 테이블을 구독한다.
기록 상세 화면은 해당 `source_id`로 필터링해 구독하고, 상태가 `pending → completed`로
바뀌는 순간 자동으로 화면이 갱신된다.

## 설정 (옵트아웃)

- `profiles` 테이블에 `sentiment_analysis_enabled boolean not null default true` 추가.
- 설정 화면(app/settings 또는 app/settings/app-settings)에 토글 추가.
- 끄면 이후 신규 기록은 분석되지 않는다(과거 분석 결과는 유지, 삭제하지 않음).

## 화면 구성

1. **기록별 피드백**: 스냅/마음기록/오늘을기억할래 상세 화면에 감정 결과를 한 줄로
   표시(예: "😊 긍정적인 하루였네요"). `status = 'pending'`인 동안은 "분석 중..."
   표시, `failed`면 아무것도 표시하지 않음(사용자에게 에러 노출 안 함).
2. **저널 감정 추이 그래프**: 저널 화면에 시간 흐름에 따른 `sentiment_score` 선
   그래프 추가. `dataviz` 스킬 원칙에 따라 커스텀 SVG로 구현(`LifeCycleChart.tsx`와
   같은 패턴 재사용).
3. **엔티티 통계 화면**: 신규 화면. `entities` jsonb를 전체 기간에 걸쳐 집계해
   가장 자주 언급된 사람/장소/주제 Top N을 보여준다.

## 개인정보처리방침 반영

`app/privacy-policy/page.tsx`의 제5조(위탁)·제6조(국외이전) 표에 Google Cloud를
Supabase/AWS와 같은 형식으로 새 행 추가 필요:
- 이전받는 자: Google Cloud Platform (Google LLC)
- 이전 국가: 미국
- 이전 항목: 스냅 메모, 마음 기록 메모, 오늘을 기억할래 전체 텍스트
- 이용 목적: 감정 분석 및 주요 키워드(엔티티) 추출
- 보유기간: 분석 완료 즉시 원본 텍스트는 Google 측에 보관되지 않음(요청-응답형 API,
  별도 저장 없음) — 단, 정확한 문구는 Google Cloud Natural Language API 서비스
  약관을 재확인 후 확정한다.

이 조항 추가는 구현 작업의 일부로 처리한다(이미 Supabase/AWS 조항이 있어 패턴은
확립되어 있음).

## 에러 처리 요약

| 상황 | 처리 |
|---|---|
| Google API 호출 실패(쿼터 초과, 네트워크 등) | `status='failed'` 기록, 원본 기록 저장에는 영향 없음, UI에 에러 노출 안 함 |
| 사용자가 옵트아웃 상태 | Edge Function이 분석 없이 즉시 종료, 행 자체를 생성하지 않음 |
| 텍스트가 비어있음(예: 사진만 있고 메모 없는 스냅) | 트리거에서 분석 대상 텍스트가 없으면 Edge Function 호출 자체를 생략 |

## 비용/쿼터 메모

Google Cloud Natural Language API 무료 티어는 기능별 월 5,000 유닛. 현재 실사용자가
거의 없어 당장은 문제되지 않지만, 사용자가 늘어나면 모니터링이 필요하다(향후 과제,
이번 구현 범위 밖).

## 테스트 방침

자동화된 단위 테스트 프레임워크가 프로젝트에 없고 외부 API 의존적인 기능이라,
회원탈퇴 기능 때와 동일하게 **실제 호출 기반 수동 E2E 검증**으로 확인한다 — 임시
테스트 계정으로 스냅/마음기록/오늘을기억할래를 생성해보고, `sentiment_analysis`
테이블에 결과가 정확히 채워지는지 curl/Supabase 대시보드로 직접 확인.
