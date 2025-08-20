# Firebase 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/)에 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름: `mindsnap` 입력
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

## 2. 웹 앱 추가

1. 프로젝트 대시보드에서 "웹" 아이콘 클릭
2. 앱 닉네임: `mindsnap-web` 입력
3. "Firebase Hosting 설정" 체크 해제
4. "앱 등록" 클릭

## 3. 환경변수 설정

생성된 Firebase 설정을 `.env.local` 파일에 추가:

```env
# Firebase Configuration
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id

# Next.js Configuration
NEXTAUTH_SECRET=mindsnap_secret_key_2024_development_environment
NEXTAUTH_URL=http://localhost:3000
```

## 4. Firestore 데이터베이스 설정

1. Firebase Console에서 "Firestore Database" 선택
2. "데이터베이스 만들기" 클릭
3. 보안 규칙: "테스트 모드에서 시작" 선택
4. 위치: `asia-northeast3 (서울)` 선택
5. "완료" 클릭

## 5. 보안 규칙 설정

Firestore 보안 규칙을 다음과 같이 설정:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 사용자 문서
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // 스냅 문서
    match /snaps/{snapId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // 마음 기록 문서
    match /moodRecords/{recordId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
    
    // 성격 검사 문서
    match /personalityTests/{testId} {
      allow read, write: if request.auth != null && 
        request.auth.uid == resource.data.userId;
    }
  }
}
```

## 6. 개발 서버 실행

```bash
npm run dev
```

## 7. 데이터베이스 구조

### Collections

1. **users** - 사용자 정보
   - id: string
   - email: string
   - name: string (optional)
   - image: string (optional)
   - createdAt: timestamp
   - updatedAt: timestamp

2. **snaps** - 스냅 기록
   - id: string
   - userId: string
   - title: string
   - note: string (optional)
   - imageUrl: string (optional)
   - tags: string[]
   - capturedAt: timestamp
   - createdAt: timestamp
   - updatedAt: timestamp

3. **moodRecords** - 마음 기록
   - id: string
   - userId: string
   - mood: number (1-10)
   - note: string (optional)
   - activities: string[]
   - createdAt: timestamp

4. **personalityTests** - 성격 검사 결과
   - id: string
   - userId: string
   - answers: object
   - result: object
   - createdAt: timestamp

## 장점

- ✅ **실시간 동기화**: Firestore의 실시간 리스너 지원
- ✅ **오프라인 지원**: 자동 오프라인 캐싱
- ✅ **확장성**: 자동 스케일링
- ✅ **보안**: 강력한 보안 규칙
- ✅ **통합**: Firebase Auth, Storage 등과 통합 용이
- ✅ **무료 티어**: 개발 단계에서 충분한 무료 사용량
