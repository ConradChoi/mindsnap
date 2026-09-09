import type { CapacitorConfig } from '@capacitor/cli'

// webDir은 `npm run build:capacitor`(output: 'export')가 생성하는 out/ 디렉토리를 가리킨다.
// 웹 배포(Amplify, npm run build)와는 별개의 산출물이라 여기서 잡아줘도 웹 빌드에는 영향이 없다.
const config: CapacitorConfig = {
  appId: 'io.ylia.mindsnap',
  appName: 'MindSnap',
  webDir: 'out',
  ios: {
    contentInset: 'automatic',
  },
  android: {
    // WebView 내에서 로그인용 임베디드 브라우저를 열지 않기 위해
    // 소셜 로그인은 @capacitor/browser(시스템 브라우저)로 별도 처리한다.
  },
}

export default config
