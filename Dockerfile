FROM node:18-alpine

WORKDIR /app

# 패키지 파일 복사
COPY package*.json ./

# 의존성 설치
RUN npm install

# 소스 코드 복사
COPY . .

# Prisma 클라이언트 생성
RUN npm run prisma:generate

# 포트 노출
EXPOSE 3000

# 개발 서버 실행
CMD ["npm", "run", "dev"]

