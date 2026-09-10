#!/usr/bin/env node
// Capacitor(네이티브 앱) 빌드 래퍼.
//
// output: 'export'(정적 export)는 Next.js Route Handler(app/api/*)를 지원하지 않는다 —
// GET 외의 동적 메서드를 가진 라우트(app/api/account/delete/route.ts의 POST 등)가 포함된
// 채로 export 빌드를 돌리면 `next build` 자체가 실패한다.
// 네이티브 앱은 이 라우트가 필요 없다(웹에 배포된 절대 URL로 호출하면 되므로 — lib/auth.ts
// resolveAccountDeleteUrl 참고). 그래서 이 스크립트는 next build를 실행하는 동안에만
// app/api 디렉토리를 임시로 다른 이름으로 옮겨두고, 빌드 성공/실패와 무관하게(try/finally)
// 항상 원래 위치로 복원한다.
//
// package.json의 pre/post 스크립트 훅 대신 이 방식을 쓰는 이유: postbuild:capacitor 훅은
// build:capacitor가 실패(0이 아닌 종료 코드)하면 npm이 아예 실행하지 않아, 빌드 실패 시
// app/api가 복원되지 않은 채로 남을 위험이 있다. try/finally로 감싼 단일 스크립트는
// 그 경우에도 항상 복원을 보장한다.

const { existsSync, renameSync } = require('fs')
const path = require('path')
const { spawnSync } = require('child_process')

const projectRoot = path.join(__dirname, '..')
const appApiDir = path.join(projectRoot, 'app', 'api')
const hiddenApiDir = path.join(projectRoot, 'app', '_api-disabled-for-capacitor-build')

const hasApiDir = existsSync(appApiDir)

if (existsSync(hiddenApiDir)) {
  // 이전 실행이 비정상 종료되어 복원되지 못한 흔적이 남아있는 경우를 대비한 방어적 처리.
  console.warn(
    '[build:capacitor] app/_api-disabled-for-capacitor-build 잔재물을 발견했습니다. 복원을 시도합니다.'
  )
  if (!hasApiDir) {
    renameSync(hiddenApiDir, appApiDir)
  }
}

if (hasApiDir) {
  renameSync(appApiDir, hiddenApiDir)
  console.log('[build:capacitor] app/api를 임시로 제외했습니다 (정적 export는 Route Handler를 지원하지 않음).')
}

let exitCode = 1
try {
  const result = spawnSync('next', ['build'], {
    stdio: 'inherit',
    env: { ...process.env, BUILD_TARGET: 'capacitor' },
    shell: process.platform === 'win32',
    cwd: projectRoot,
  })

  if (result.error) {
    throw result.error
  }

  exitCode = result.status === null ? 1 : result.status
} finally {
  if (hasApiDir && existsSync(hiddenApiDir)) {
    renameSync(hiddenApiDir, appApiDir)
    console.log('[build:capacitor] app/api를 복원했습니다.')
  }
}

process.exit(exitCode)
