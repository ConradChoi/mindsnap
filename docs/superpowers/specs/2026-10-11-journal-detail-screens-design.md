# 저널 상세 화면 설계

## 배경 / 목표

저널 화면(`/journal`)의 스냅·마음기록·오늘을기억할래·성격검사결과 카드는 클릭해도 아무 반응이 없다 — 애초에 네 가지 기록 유형 중 "상세 화면"이 코드베이스에 존재하는 건 하나도 없다(목록 카드가 요약 정보만 인라인으로 보여줌). 특히 스냅은 이미지/음성 유무만 표시되고 실제 내용을 볼 방법이 없고, 오늘을 기억할래는 `summary` 한 줄만 보이고 나머지 5개 필드(기억에 남는 일/이유/원인/개선할 점/행동)는 전혀 노출되지 않는다.

목표: 네 가지 기록 유형 각각에 **읽기 전용** 상세 화면을 만들고, 저널 목록의 카드를 클릭하면 해당 상세 화면으로 이동하게 한다.

## 범위

- 포함: 스냅/마음기록/오늘을기억할래/성격검사결과 4종 상세 화면 + 목록 카드 클릭 연결.
- 제외(명시적으로 이번 범위 아님): 상세 화면에서의 수정·삭제(기존처럼 목록의 스와이프 삭제만 유지), 감정 분석 배지를 상세 화면에 추가하는 것(목록에 이미 있음).

## 아키텍처

### 정적 export 제약과 라우팅 방식

이 프로젝트는 웹 배포(Amplify, `output: 'standalone'`)와 Capacitor 앱(iOS/Android, `output: 'export'`)이 `next.config.js` 하나를 `BUILD_TARGET` 환경변수로 분기해서 같은 라우트 파일을 공유한다(`next.config.js` 상단 주석 참고). `output: 'export'`는 동적 라우트(`/journal/snap/[id]`)를 쓰려면 빌드 시점에 `generateStaticParams()`로 모든 id를 알아야 하는데, 사용자 콘텐츠라 불가능하다.

대신 저널 화면이 이미 쓰고 있는 패턴(`/journal?tab=mood` — `app/journal/page.tsx`의 `URLSearchParams` 기반 탭 전환)과 동일하게, **정적 페이지 + 쿼리 파라미터로 id 전달** 방식을 쓴다. 신규 라우트:

- `app/journal/snap/page.tsx` → `/journal/snap?id=<uuid>`
- `app/journal/mood/page.tsx` → `/journal/mood?id=<uuid>`
- `app/journal/remember/page.tsx` → `/journal/remember?id=<uuid>`
- `app/journal/personality/page.tsx` → `/journal/personality?id=<uuid>`

각 페이지는 클라이언트 컴포넌트(`'use client'`)로, `useSearchParams()`로 `id`를 읽어 단건 조회 후 렌더링한다(`/journal/insights`와 같은 선례).

### 데이터 조회

- 스냅: 기존 `getSnap(snapId)`를 그대로 쓴다(이미 signed URL 발급까지 포함).
- 마음기록: `getMoodRecord(recordId): Promise<MoodRecord | null>` 신규 추가 — `getSnap`과 동일한 패턴(`select('*').eq('id', ...).maybeSingle()` → `mapMoodRecordRow`).
- 오늘을 기억할래: `getRememberTodayItem(id): Promise<RememberToday | null>` 신규 추가 — 동일 패턴.
- 성격검사결과: 목록 조회 함수(`getPersonalityTestResults`)는 있지만 단건 조회가 없다. `getPersonalityTestResultById(id): Promise<PersonalityTestResult | null>` 신규 추가. 결과 설명 콘텐츠는 기존 `getPersonalityTestContent(testType)`로 가져와 `resultKey`로 인덱싱한다(검사 직후 결과 화면과 동일한 조회 흐름).

네 함수 모두 RLS(`auth.uid() = user_id`)가 이미 각 테이블에 걸려 있어 타인의 기록은 애초에 조회되지 않는다(별도 체크 불필요, 기존 테이블 정책 재사용).

### 존재하지 않거나 삭제된 레코드

`id`가 없거나, 조회 결과가 없거나(`null`), 소프트 삭제된 기록(`deleted_at`이 설정된 행 — `getSnap`/`getMoodRecord`/`getRememberTodayItem`이 `deleted_at` 조건 없이 단건 조회하므로 삭제된 행도 일단 조회는 됨)인 경우: "기록을 찾을 수 없어요" 안내와 뒤로가기 버튼만 보여준다. 소프트 삭제된 기록까지 상세 화면에서 볼 수 있게 할지 막을지는 구현 시 `deleted_at` 유무로 분기해서 막는 쪽으로 한다(목록에 더 이상 없는 기록을 상세로 직접 열 방법이 없으므로 사실상 거의 발생하지 않지만, 휴지통에서 복원 전 상태를 안전하게 처리하기 위함).

## 화면 구성

공통: 상단에 뒤로가기 버튼(`router.back()`) + 제목, `pb-28` 패딩(플로팅 탭바와 겹치지 않도록 — 기존 페이지들과 동일한 패턴).

### 스냅 상세 (`/journal/snap`)

- 이미지(있으면): `<img>` 원본 크기(반응형, `max-width: 100%`)
- 음성(있으면): `<audio controls>` 네이티브 플레이어
- 노트 전체 텍스트
- 태그 목록(있으면 chip 형태 — 기존 다른 화면의 태그 표시 스타일 참고)
- 촬영일시(`capturedAt`)

### 마음기록 상세 (`/journal/mood`)

- mood 아이콘 + 라벨(`MoodRecordList`의 `getMoodIcon`/`getMoodLabel` 로직 재사용 — 현재 미사용(dead code)이던 걸 여기서 활용)
- 노트 전체 텍스트
- activities 목록(있으면)
- 작성일시(`createdAt`)

### 오늘을 기억할래 상세 (`/journal/remember`)

- mood 아이콘 + 라벨
- 6개 필드를 각각 라벨과 함께 섹션으로: 기억에 남는 일 / 이유 / 원인 / 개선할 점 / 행동 / 요약
- 선택한 날짜(`selectedDate`, 있으면)
- 작성일시(`createdAt`)

### 성격검사결과 상세 (`/journal/personality`)

- 검사 유형 라벨(`TEST_TYPE_LABELS` — `app/journal/page.tsx`에 이미 정의됨, 공용으로 쓸 수 있게 필요시 재배치)
- 검사 직후 결과 화면과 동일한 레이아웃으로 제목/특징(traits)/강점(strengths)/개선점(improvements) 표시 — `getPersonalityTestContent(testType)[resultKey]`에서 가져옴
- 검사일시(`createdAt`)

## 목록 카드 연결

`app/journal/page.tsx`의 `MoodRecordList`/`RememberTodayList`/`SnapList`/`PersonalityList` 각 카드(`<Card>` 전체 또는 `<SwipeToDeleteCard>` 내부)에 클릭 시 해당 상세 라우트로 이동하는 핸들러를 추가한다. 스와이프 삭제 제스처와 충돌하지 않도록 `SwipeToDeleteCard`의 기존 동작을 확인하고, 카드 본문(스와이프 삭제 버튼이 아닌 영역)에만 클릭 이동을 건다.

## 테스트 전략

이 프로젝트는 단위 테스트 프레임워크를 쓰지 않기로 이미 결정되어 있다(감정 분석 기능 구현 때 사용자가 명시적으로 결정: "전체적으로 테스트 체계를 갖추는 게 맞다" — 부분 도입 안 함). 동일한 방침을 따라:

- `npx tsc --noEmit` + `npm run build` + `npm run build:capacitor`로 타입/빌드 검증.
- REST API(curl)로 각 단건 조회 함수가 감싸는 쿼리가 실제로 올바른 행을 반환하는지(그리고 타인의 행은 RLS로 막히는지) 검증.
- 카드 클릭 → 라우팅 연결은 코드 검토 + 빌드 통과로 검증(브라우저 제어 도구가 없어 실제 클릭 E2E는 수행 불가 — 감정 분석 기능 때와 동일한 제약).

## Review Focus (구현 시 반드시 테스트할 입력)

- **삭제된 기록으로 직접 접근** — `deleted_at`이 설정된 기록의 id로 상세 페이지에 접근 시 "찾을 수 없음" 처리되어야 한다.
- **잘못된/존재하지 않는 id** — 쿼리 파라미터가 없거나 다른 사용자의 id인 경우 "찾을 수 없음" 처리되어야 한다(RLS가 막아줌).
- **스냅에 이미지/음성이 둘 다 없는 경우** — 해당 섹션 자체가 안 보여야 한다(빈 플레이어 등 노출 금지).
