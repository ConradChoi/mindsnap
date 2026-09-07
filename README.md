# MindSnap 🧠📸

마음을 기록하고 성장하는 모바일 최적화 웹 애플리케이션

## ✨ 주요 기능

- 📱 **모바일 최적화**: iOS/Android safe-area 지원
- 📸 **실시간 카메라**: 실제 카메라 촬영 및 갤러리 선택 (Supabase Storage에 업로드되어 다른 기기에서도 확인 가능)
- 🎤 **음성 녹음**: 음성-텍스트 변환 지원
- 📝 **다단계 폼**: "오늘을 기억할래" 6단계 프로세스 (5단계 기분 척도)
- 🔍 **무한 스크롤**: 저널에서 30개씩 자동 로드
- 🗑️ **휴지통**: 삭제한 기록을 14일 이내 복원 가능 (기기 상관없이 동일하게 표시)
- 🎨 **현대적 UI**: Tailwind CSS + shadcn/ui

## 🚀 빠른 시작

### macOS에서 설정

```bash
# 1. 저장소 클론
git clone https://github.com/ConradChoi/mindsnap.git
cd mindsnap

# 2. 자동 설정 스크립트 실행
chmod +x setup-mac.sh
./setup-mac.sh

# 3. 환경변수 설정
cp env.example .env.local
# .env.local 파일에서 실제 Supabase 프로젝트 값으로 수정

# 4. 개발 서버 실행
npm run dev
```

### Windows에서 설정

```cmd
# 1. 저장소 클론
git clone https://github.com/ConradChoi/mindsnap.git
cd mindsnap

# 2. 자동 설정 스크립트 실행
setup-windows.bat

# 3. 환경변수 설정
copy env.example .env.local
# .env.local 파일에서 실제 Supabase 프로젝트 값으로 수정

# 4. 개발 서버 실행
npm run dev
```

### 수동 설정

```bash
# 의존성 설치
npm install

# 환경변수 파일 생성
cp env.example .env.local

# 개발 서버 실행
npm run dev
```

## ⚙️ 환경변수 설정

`.env.local` 파일을 생성하고 다음 값들을 설정하세요 (Supabase 프로젝트 대시보드 > Project Settings > API / Database 에서 확인):

```env
# Supabase 설정 (브라우저에서 사용되는 anon key — 실제 데이터 보호는 RLS가 담당)
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here

# 데이터베이스 직접 연결 (마이그레이션 적용 등 로컬 작업 시에만 필요)
DATABASE_URL=postgresql://postgres:your-db-password@db.your-project-ref.supabase.co:5432/postgres
```

`.env.local`, `.env.local.backup` 등 실제 값이 담긴 환경변수 파일은 `.gitignore`에 의해 커밋되지 않습니다. `env.example`만 저장소에 커밋되며 플레이스홀더 값만 포함합니다.

## 🗄️ 데이터베이스 마이그레이션 적용

DB 스키마는 `supabase/migrations/`에 SQL 파일로 관리됩니다. Supabase 프로젝트에 아직 적용되지 않았다면 Supabase Dashboard의 SQL Editor에서 `0001_core_schema.sql`, `0002_storage.sql`을 순서대로 실행하거나, Supabase CLI가 설치되어 있다면:

```bash
supabase link --project-ref your-project-ref
supabase db push
```

## 📱 페이지 구조

- **`/`**: 홈페이지 (메인 메뉴)
- **`/capture`**: 스냅 작성 (카메라, 음성 녹음)
- **`/daily-mood`**: 마음 기록 (5단계 기분 척도)
- **`/remember-today`**: 오늘을 기억할래 (6단계, 5단계 기분 척도)
- **`/journal`**: 저널 (마음 기록/스냅/오늘 기록/성격)
- **`/settings`**: 설정
- **`/settings/restore-deleted`**: 삭제된 기록 복원 (휴지통)

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Lucide React
- **Backend / DB**: Supabase (PostgreSQL, Auth, Storage, Row Level Security)
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (권장)

## 📦 주요 패키지

- `@supabase/supabase-js`: Supabase 클라이언트 (Auth, DB, Storage)
- `lucide-react`: 아이콘 라이브러리
- `class-variance-authority`: 컴포넌트 변형
- `tailwind-merge`: Tailwind 클래스 병합

## 🗄️ 데이터베이스 스키마

스키마는 `supabase/migrations/0001_core_schema.sql`에 정의되어 있습니다. 모든 테이블은 `uuid` PK, `timestamptz` 날짜 컬럼을 사용하며, Row Level Security로 "본인 행만 read/write" 가능하도록 제한됩니다.

- **`profiles`**: 사용자 프로필 (auth.users와 1:1, 회원가입 시 트리거로 자동 생성)
- **`snaps`**: 사진/음성/메모 기록 (`image_path`/`audio_path`는 Storage 경로만 저장, 화면 표시 시 signed URL 발급)
- **`mood_records`**: 마음 기록 (`mood_level` 1~5)
- **`remember_today`**: 오늘을 기억할래 기록 (`mood_level` 1~5)
- **`activity_log`**: 사용자 활동 로그 (인증된 사용자 본인 행만 기록, IP 미수집)

삭제는 모두 소프트 삭제(`deleted_at` 컬럼)로 처리되며, 별도의 휴지통 테이블 없이 각 테이블에서 `deleted_at IS NOT NULL` 조건으로 조회합니다 (14일 보관 후 자동 만료 처리는 애플리케이션 레벨에서 판단).

파일 저장은 `supabase/migrations/0002_storage.sql`에 정의된 private Storage 버킷(`media`)을 사용하며, 객체 경로는 `{user_id}/...`로 시작해야 하는 RLS 정책으로 보호됩니다.

## 🚀 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 가입
2. GitHub 저장소 연결
3. 환경변수(`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`) 설정
4. 자동 배포 완료

### 수동 배포

```bash
# 빌드
npm run build

# 시작
npm start
```

## 🔧 개발 명령어

```bash
# 개발 서버 실행
npm run dev

# 프로덕션 빌드 (타입 에러 발생 시 빌드 실패 — next.config.js에서 우회하지 않음)
npm run build

# 프로덕션 서버 실행
npm start

# 린트 검사
npm run lint
```

## 📱 모바일 최적화

- **터치 영역**: 최소 44px 터치 영역
- **Safe Area**: iOS/Android 노치 대응
- **반응형**: 모바일 우선 디자인
- **PWA**: Progressive Web App 지원

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다.

## 📞 연락처

Conrad Choi - [@ConradChoi](https://github.com/ConradChoi)

프로젝트 링크: [https://github.com/ConradChoi/mindsnap](https://github.com/ConradChoi/mindsnap)
