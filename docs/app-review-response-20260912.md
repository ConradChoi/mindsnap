# App Review Response — Guideline 2.1 (Sep 12, 2026)

아래 텍스트를 App Store Connect의 심사 메시지 답장(Reply)과 "앱 심사 정보 > 메모" 란에 동일하게 붙여넣으세요.
화면 녹화 파일은 답장에 첨부하시면 됩니다.

---

Thank you for the guidance. Please find the additional information below.

**1. Screen recording**
Attached is a screen recording captured on a physical iPhone, showing app launch, the typical user flow (quick capture, mood tracking, daily retrospective, journal, personality test results), and the full account login / account deletion flow using a test account.

Note: MindSnap does not include any shared or public user-generated content — all journal entries, photos, and voice recordings are private to each individual account and are never visible to other users or the public. Therefore, content reporting/blocking mechanisms are not applicable. The app also does not sell any paid content or features (it is entirely free, with no in-app purchases).

**2. App purpose and target audience**
MindSnap is a personal journaling and self-reflection app for Korean-speaking users. It helps people capture meaningful daily moments (via photo and voice notes that are automatically transcribed to text), track their mood over time, and reflect on their day through a guided 6-step retrospective process. It also offers three self-understanding personality assessments (shape psychology, enneagram, and a birthday-based "life cycle" reading) that are original content written by the developer, framed explicitly as reference/entertainment content rather than clinical or predictive services. The target audience is adults interested in journaling, mindfulness, and self-reflection, primarily in South Korea. The problem it solves is that people often forget meaningful daily moments and lack a simple, structured way to record and reflect on them; MindSnap provides a single, private space to do this quickly and consistently.

**3. Setup and access instructions**
Users can create an account with email/password, or sign in with Google or Apple. A demo account is provided in the "Sign-In Information" section of App Review Information (email + password). After signing in, the main features are accessible from the bottom tab bar: Home, Capture (quick photo/voice notes), Journal (unified feed of all records), and Settings. No sample files are required — all content is created by the user after signing in. The demo account already contains sample entries for review convenience.

**4. External services used**
- Supabase: authentication (email/password, Google, Apple OAuth), PostgreSQL database, and private file storage for photos and voice recordings
- Sign in with Apple / Google Sign-In: OAuth authentication providers
- Apple's on-device Speech framework (SFSpeechRecognizer): used to transcribe voice memos to text
- AWS Amplify: hosts a companion web version of the same service (this is a separate web deployment and is not part of the iOS app's runtime)
- No advertising SDKs, no third-party analytics SDKs, and no payment processors are used (the app is free with no in-app purchases).

**5. Regional differences**
MindSnap functions consistently across all regions/countries, with no region-locked features or content. The app currently supports Korean language only for its user interface; all account, capture, and journaling features work identically everywhere.

**6. Regulated industry / third-party material**
MindSnap does not operate in a regulated industry (it does not provide medical diagnosis, treatment, or financial services) and does not include any protected third-party material. All personality-test content (shape psychology, enneagram, birthday-based life cycle) is original content written by the developer for self-reflection and entertainment purposes, and is explicitly labeled as reference content rather than a clinical or predictive service.

We appreciate your review and are happy to provide any further information needed.

Best regards,
Jonghoon Choi
ylia Co., Ltd.
