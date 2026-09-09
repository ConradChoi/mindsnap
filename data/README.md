# data/ 폴더 안내

이 폴더의 JSON 파일들(`shape-psychology-content.json`, `enneagram-content.json`,
`tarot-life-cycle-content.json`)은 **더 이상 앱이 직접 읽지 않습니다.**

콘텐츠는 전부 Supabase의 `personality_test_content` 테이블로 이관되었고, 앱은
`lib/supabase-service.ts`의 `getPersonalityTestContent()`로 DB에서 조회합니다.
(Capacitor 앱 패키징 이후에도 콘텐츠 문구를 앱 재빌드/재심사 없이 즉시 수정할 수 있도록
하기 위한 구조입니다.)

## 이 파일들이 남아있는 이유

- **초기 시딩 스크립트의 원본 데이터**였고, 콘텐츠의 구조(어떤 필드가 있는지)를 한눈에
  참고하기 좋아서 그대로 남겨뒀습니다.
- 새 검사를 추가하거나 대량으로 콘텐츠를 다시 채울 때, 로컬 JSON으로 먼저 작성한 뒤
  DB로 시딩하는 방식이 여전히 편해서 초안 작업용으로 쓸 수 있습니다.

## 콘텐츠를 실제로 수정하려면

**Supabase 대시보드 → Table Editor → `personality_test_content` 테이블**에서 직접
수정하세요. `content_key` 컬럼으로 항목을 찾고, `content`(jsonb) 컬럼을 편집하면
앱에 즉시 반영됩니다. (RLS 정책상 클라이언트에서는 쓰기가 막혀 있어 대시보드에서만
수정 가능합니다.)

`Taro-LifeGraph.xlsx`는 생일 인생주기 검사의 계산 로직(`lib/tarotLifeCycle.ts`) 원본
참고 자료로, 계속 보관합니다.
