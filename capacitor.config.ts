import type { CapacitorConfig } from '@capacitor/cli'

// webDir은 `npm run build:capacitor`(output: 'export')가 생성하는 out/ 디렉토리를 가리킨다.
// 웹 배포(Amplify, npm run build)와는 별개의 산출물이라 여기서 잡아줘도 웹 빌드에는 영향이 없다.
const config: CapacitorConfig = {
  appId: 'io.ylia.mindsnap',
  appName: 'MindSnap',
  webDir: 'out',
  ios: {
    // Capacitor 자체 기본값은 'never'다(@capacitor/cli 타입 선언 참고:
    // `contentInset?: ...; @default never`). 'automatic'은 WKWebView의 내부
    // UIScrollView에 `contentInsetAdjustmentBehavior = .automatic`을 설정해, 네이티브가
    // safe area(상태바/홈 인디케이터 영역)만큼 스크롤 콘텐츠 영역에 자체적으로 inset을
    // 넣는다. 이 앱은 CSS에서 `env(safe-area-inset-*)`를 이미 전역적으로 직접 처리하므로
    // (app/globals.css의 pt-safe-top/pb-safe-bottom/bottom-nav-floating 등),
    // 'automatic'을 쓰면 네이티브 inset과 CSS padding이 이중으로 적용돼 두 레이어의
    // 좌표 기준이 어긋난다. 그 결과 WKWebView의 네이티브 배경(앱 콘텐츠가 그리지 않는
    // 영역)이 화면 상/하단에 그대로 드러나는 잘림으로 보일 수 있다. 'never'로 바꿔
    // 네이티브는 inset에 전혀 관여하지 않게 하고, 안전영역 처리는 기존처럼 CSS에만
    // 맡긴다.
    contentInset: 'never',
  },
  android: {
    // WebView 내에서 로그인용 임베디드 브라우저를 열지 않기 위해
    // 소셜 로그인은 @capacitor/browser(시스템 브라우저)로 별도 처리한다.
  },
}

export default config
