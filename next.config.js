/** @type {import('next').NextConfig} */

// Capacitor(iOS/Android 하이브리드 앱) 빌드는 정적 파일(output: 'export')이 필요하지만,
// 웹 배포(AWS Amplify Hosting, amplify.yml)는 output: 'standalone' 기준으로 세팅되어 있다.
// 두 빌드가 next.config.js 하나를 공유하면서도 서로의 산출물을 건드리지 않도록
// BUILD_TARGET 환경변수로 output만 분기한다.
// - `npm run build` (BUILD_TARGET 미설정): 기존과 동일한 standalone → Amplify 배포 영향 없음
// - `npm run build:capacitor` (BUILD_TARGET=capacitor): export → out/ 디렉토리를 Capacitor webDir로 사용
const isCapacitorBuild = process.env.BUILD_TARGET === 'capacitor'

const nextConfig = {
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  output: isCapacitorBuild ? 'export' : 'standalone',
  experimental: {
    outputFileTracingRoot: undefined,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: false,
  },
}

module.exports = nextConfig
