@echo off
echo 🚀 MindSnap 프로젝트 설정을 시작합니다...

REM Node.js 버전 확인
echo 📋 Node.js 버전 확인 중...
node --version
npm --version

REM 의존성 설치
echo 📦 의존성 설치 중...
npm install

REM 환경변수 파일 생성
echo ⚙️ 환경변수 파일 생성 중...
if not exist .env.local (
    copy env.example .env.local
    echo ✅ .env.local 파일이 생성되었습니다.
    echo ⚠️  .env.local 파일에서 실제 환경변수 값을 설정해주세요!
) else (
    echo ✅ .env.local 파일이 이미 존재합니다.
)

echo.
echo 🎉 설정이 완료되었습니다!
echo.
echo 다음 명령어로 개발 서버를 실행할 수 있습니다:
echo   npm run dev
echo.
echo 데이터베이스 마이그레이션(supabase/migrations/*.sql)은 Supabase Dashboard의
echo SQL Editor에서 직접 실행하거나 Supabase CLI(supabase db push)로 적용하세요.
pause
