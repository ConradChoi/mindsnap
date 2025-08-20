# MindSnap 🧠📸

마음을 기록하고 성장하는 모바일 최적화 웹 애플리케이션

## ✨ 주요 기능

- 📱 **모바일 최적화**: iOS/Android safe-area 지원
- 📸 **실시간 카메라**: 실제 카메라 촬영 및 갤러리 선택
- 🎤 **음성 녹음**: 음성-텍스트 변환 지원
- 📝 **다단계 폼**: "오늘을 기억할래" 6단계 프로세스
- 🔍 **무한 스크롤**: 저널에서 30개씩 자동 로드
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
# .env.local 파일에서 실제 값으로 수정

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
# .env.local 파일에서 실제 값으로 수정

# 4. 개발 서버 실행
npm run dev
```

### 수동 설정

```bash
# 의존성 설치
npm install

# Prisma 클라이언트 생성
npx prisma generate

# 환경변수 파일 생성
cp env.example .env.local

# 개발 서버 실행
npm run dev
```

## ⚙️ 환경변수 설정

`.env.local` 파일을 생성하고 다음 값들을 설정하세요:

```env
# Supabase 설정
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key

# 데이터베이스 연결
DATABASE_URL=your_database_connection_string

# NextAuth 설정
NEXTAUTH_SECRET=your-secret-key-here
```

## 📱 페이지 구조

- **`/`**: 홈페이지 (메인 메뉴)
- **`/capture`**: 스냅 작성 (카메라, 음성 녹음)
- **`/daily-mood`**: 마음 기록
- **`/remember-today`**: 오늘을 기억할래 (6단계)
- **`/journal`**: 저널 (마음 기록/스냅/성격)
- **`/records`**: 기록 선택
- **`/settings`**: 설정

## 🛠️ 기술 스택

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **UI Components**: shadcn/ui, Lucide React
- **Database**: PostgreSQL (Supabase)
- **ORM**: Prisma
- **Styling**: Tailwind CSS
- **Deployment**: Vercel (권장)

## 📦 주요 패키지

- `@prisma/client`: 데이터베이스 ORM
- `@supabase/supabase-js`: Supabase 클라이언트
- `lucide-react`: 아이콘 라이브러리
- `class-variance-authority`: 컴포넌트 변형
- `tailwind-merge`: Tailwind 클래스 병합

## 🗄️ 데이터베이스 스키마

### User 모델
```prisma
model User {
  id        String   @id @default(cuid())
  email     String   @unique
  name      String?
  image     String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  snaps     Snap[]
}
```

### Snap 모델
```prisma
model Snap {
  id         String   @id @default(cuid())
  userId     String
  title      String
  note       String?
  imageUrl   String?
  tags       String[]
  capturedAt DateTime @default(now())
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
}
```

## 🚀 배포

### Vercel 배포 (권장)

1. [Vercel](https://vercel.com)에 가입
2. GitHub 저장소 연결
3. 환경변수 설정
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

# 프로덕션 빌드
npm run build

# 프로덕션 서버 실행
npm start

# Prisma 마이그레이션
npm run prisma:migrate

# Prisma Studio 실행
npm run prisma:studio

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
