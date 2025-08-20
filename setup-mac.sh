#!/bin/bash

echo "🚀 MindSnap 프로젝트 설정을 시작합니다..."

# Node.js 버전 확인
echo "📋 Node.js 버전 확인 중..."
node --version
npm --version

# 의존성 설치
echo "📦 의존성 설치 중..."
npm install

# Prisma 클라이언트 생성
echo "🗄️ Prisma 클라이언트 생성 중..."
npx prisma generate

# 환경변수 파일 생성
echo "⚙️ 환경변수 파일 생성 중..."
if [ ! -f .env.local ]; then
    cp env.example .env.local
    echo "✅ .env.local 파일이 생성되었습니다."
    echo "⚠️  .env.local 파일에서 실제 환경변수 값을 설정해주세요!"
else
    echo "✅ .env.local 파일이 이미 존재합니다."
fi

# 개발 서버 실행 안내
echo ""
echo "🎉 설정이 완료되었습니다!"
echo ""
echo "다음 명령어로 개발 서버를 실행할 수 있습니다:"
echo "  npm run dev"
echo ""
echo "데이터베이스 마이그레이션을 실행하려면:"
echo "  npm run prisma:migrate"
echo ""
echo "Prisma Studio를 실행하려면:"
echo "  npm run prisma:studio"
