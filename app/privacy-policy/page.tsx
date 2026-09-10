import type { ReactNode } from 'react'
import type { Metadata } from 'next'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ShieldCheck, ArrowLeft } from 'lucide-react'

// ============================================================================
// 대표(사업자)가 채워야 하는 값 — 대괄호 [ ] 로 표시된 부분을 실제 값으로 바꾼 뒤 배포한다.
// 스토어 심사 전에 반드시 모두 채워져 있어야 한다(플레이스홀더가 남아 있으면
// Apple/Google 심사에서 "불완전한 개인정보처리방침"으로 반려될 수 있음).
// ============================================================================
const COMPANY = {
  name: 'ylia Co., Ltd.',
  serviceName: 'MindSnap',
  representative: '[대표자명]',
  businessNumber: '[사업자등록번호]',
  address: '[사업장 주소]',
  contactEmail: '[문의 이메일]',
  privacyOfficerName: '[개인정보 보호책임자 성명]',
  privacyOfficerPosition: '[직책]',
}

// 방침 시행일 / 최종 개정일
const EFFECTIVE_DATE = '[YYYY년 MM월 DD일]'
const LAST_UPDATED = '[YYYY년 MM월 DD일]'

// 국외 이전 관련 — Supabase 프로젝트 리전, AWS Amplify 리전을 확인해서 채운다.
// (Supabase 대시보드 > Project Settings > General > Region,
//  AWS 콘솔 > Amplify > 앱 > 리전)
const OVERSEAS = {
  supabaseCountry: '[Supabase 프로젝트 리전 국가 - 예: 미국 / 싱가포르 / 일본]',
  supabaseContact: '[Supabase 개인정보 문의처 - supabase.com/privacy 확인]',
  awsCountry: '[AWS Amplify 리전 국가 - 예: 미국]',
  awsContact: '[AWS 개인정보 문의처 - aws.amazon.com/privacy 확인]',
}

// 활동 기록 보관기간 — 실제 자동 삭제 배치가 적용된 기간과 일치해야 한다.
const ACTIVITY_LOG_RETENTION = '1년'

// 휴지통(소프트 삭제) 보관기간 — lib/supabase-service.ts의 TRASH_RETENTION_DAYS와 동일해야 한다.
const TRASH_RETENTION = '14일'

export const metadata: Metadata = {
  title: '개인정보처리방침 | MindSnap',
  description: 'MindSnap 개인정보처리방침 — 수집 항목, 이용 목적, 보유기간, 국외 이전, 이용자 권리 안내',
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  )
}

// 표 대신 쓰는 항목 블록 — 모바일 화면에서 가로 스크롤 없이 읽히도록 카드형으로 쌓는다.
function ItemBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
      <p className="text-sm font-medium text-foreground">{title}</p>
      <dl className="space-y-1.5">
        {rows.map(([label, value]) => (
          <div key={label} className="grid grid-cols-[5.5rem_1fr] gap-2 text-sm">
            <dt className="text-muted-foreground shrink-0">{label}</dt>
            <dd className="text-foreground/90 break-words">{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

function Bullets({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-5 space-y-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  )
}

export default function PrivacyPolicyPage() {
  return (
    <div className="mx-auto w-full max-w-2xl space-y-6 pb-16">
      <div className="space-y-3">
        <Link
          href="/"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>홈으로</span>
        </Link>
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold">개인정보처리방침</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          {COMPANY.name}(이하 &lsquo;회사&rsquo;)는 {COMPANY.serviceName}(이하 &lsquo;서비스&rsquo;) 이용자의 개인정보를
          중요하게 생각하며, 「개인정보 보호법」 등 관계 법령을 준수합니다. 본 개인정보처리방침은 회사가 어떤
          개인정보를 어떤 목적으로 처리하고, 얼마나 보관하며, 이용자가 어떤 권리를 행사할 수 있는지를 안내합니다.
        </p>
        <div className="rounded-lg border bg-muted/30 p-3 text-sm text-muted-foreground">
          <p>시행일: {EFFECTIVE_DATE}</p>
          <p>최종 개정일: {LAST_UPDATED}</p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제1조 처리하는 개인정보의 항목 및 수집 방법</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Section title="1. 회원 가입 및 계정 관리">
            <ItemBlock
              title="이메일로 가입하는 경우"
              rows={[
                ['필수', '이메일 주소, 비밀번호(일방향 암호화되어 저장되며 회사는 평문을 알 수 없습니다)'],
                ['선택', '닉네임(표시 이름)'],
              ]}
            />
            <ItemBlock
              title="소셜 계정(Google, Apple)으로 가입·로그인하는 경우"
              rows={[
                ['필수', '해당 사업자가 전달하는 계정 고유 식별자, 이메일 주소'],
                ['선택', '이름 또는 프로필 이름(해당 사업자에서 제공에 동의한 경우에 한함)'],
              ]}
            />
            <p>
              Apple 로그인에서 &lsquo;나의 이메일 가리기&rsquo;를 선택한 경우, 회사는 이용자의 실제 이메일 주소 대신
              Apple이 발급한 비공개 전달(릴레이) 주소만 전달받아 저장합니다.
            </p>
          </Section>

          <Section title="2. 서비스 이용 과정에서 이용자가 직접 입력·생성하는 정보">
            <Bullets
              items={[
                '스냅(기록): 제목, 메모 텍스트, 태그, 첨부한 사진 파일, 음성 녹음 파일, 기록 시각',
                '마음 기록: 기분 단계(5단계 중 선택), 메모 텍스트',
                '오늘을 기억할래: 기분 단계, 기억에 남는 일 · 이유 · 원인 · 개선점 · 행동 · 요약(자유 서술 텍스트)',
                '심리 검사(도형심리 · 에니어그램 · 생일 인생주기): 검사 응답값과 검사 결과 식별자. 생일 인생주기 검사에 한하여 이용자가 입력한 생년월일이 응답값에 포함됩니다.',
              ]}
            />
            <p>
              위 정보는 이용자가 스스로 작성하는 내용이므로, 이용자가 입력하지 않으면 수집되지 않습니다. 회사는
              이용자에게 특정 내용을 입력하도록 요구하지 않습니다.
            </p>
          </Section>

          <Section title="3. 서비스 이용 과정에서 자동으로 생성·수집되는 정보">
            <Bullets
              items={[
                '활동 기록: 로그인·로그아웃, 기록 생성·삭제, 설정 변경 등 이벤트 종류와 발생 시각, 이벤트 상세 정보(예: 로그인 방식, 변경한 항목명, 계정 이메일), 접속한 화면 주소(URL) 및 이전 화면 주소, 오류 발생 시 오류 메시지',
                '기기·브라우저 정보(User-Agent 문자열), 세션 식별자',
              ]}
            />
            <p className="text-foreground/90">
              회사는 이용자의 <strong>IP 주소를 수집·저장하지 않습니다.</strong> 다만 웹 접속 과정에서 호스팅
              사업자(Amazon Web Services)가 서비스 제공 및 보안 목적으로 접속 기록(IP 주소 포함)을 자체적으로 처리할 수
              있습니다.
            </p>
            <p>
              회사는 광고 식별자(ADID/IDFA)를 수집하지 않으며, 광고 SDK나 제3자 분석 도구(Google Analytics, Firebase
              Analytics 등)를 사용하지 않습니다.
            </p>
          </Section>

          <Section title="4. 수집 방법">
            <Bullets
              items={[
                '이용자가 앱 또는 웹 화면에서 직접 입력하는 방법',
                '이용자가 소셜 로그인을 선택한 경우 해당 사업자로부터 전달받는 방법',
                '서비스 이용 과정에서 자동으로 생성·기록되는 방법',
              ]}
            />
          </Section>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제2조 개인정보의 처리 목적</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground">
            <Bullets
              items={[
                '회원 식별 및 인증, 계정 관리, 비밀번호 재설정 등 고객 문의 대응',
                '이용자가 작성한 기록의 저장·조회·수정·삭제 및 복구(휴지통) 기능 제공',
                '기분 기록·심리 검사 결과 등 이용자 본인에게 결과를 보여주기 위한 처리',
                '서비스 오류 원인 파악 및 개선, 부정 이용 방지 등 서비스 안정적 운영',
              ]}
            />
            <p className="mt-3">
              회사는 위 목적 외의 용도로 개인정보를 이용하지 않으며, 목적이 변경되는 경우 「개인정보 보호법」 제18조에
              따라 별도의 동의를 받는 등 필요한 조치를 이행합니다. 회사는 이용자의 기록 내용을 마케팅, 광고, 인공지능
              모델 학습 등의 목적으로 이용하지 않습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제3조 개인정보의 보유 및 이용 기간</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <ItemBlock
            title="계정 정보(이메일, 비밀번호, 소셜 계정 식별자, 닉네임)"
            rows={[['보유기간', '회원 탈퇴 시까지. 탈퇴 시 지체 없이(5일 이내) 파기']]}
          />
          <ItemBlock
            title="이용자가 작성한 기록(스냅, 마음 기록, 오늘을 기억할래, 심리 검사 결과) 및 첨부된 사진·음성 파일"
            rows={[
              ['보유기간', `이용자가 삭제하거나 회원 탈퇴할 때까지`],
              ['삭제 시', `휴지통에서 ${TRASH_RETENTION} 동안 복구할 수 있으며, 해당 기간이 지나면 파기`],
            ]}
          />
          <ItemBlock
            title="활동 기록(로그인·기록 생성 등 이벤트 로그, 기기·브라우저 정보, 세션 식별자)"
            rows={[['보유기간', `수집일로부터 ${ACTIVITY_LOG_RETENTION}`]]}
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            관계 법령에서 일정 기간 보존을 의무화하는 경우에는 해당 법령이 정한 기간 동안 보관하며, 이 경우 보존 근거와
            보존 항목을 본 방침에 명시합니다. 현재 서비스는 재화·용역의 유료 거래를 제공하지 않아 「전자상거래 등에서의
            소비자보호에 관한 법률」에 따른 보존 의무 대상 정보를 보유하고 있지 않습니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제4조 개인정보의 제3자 제공</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
            <p className="text-foreground/90">
              회사는 이용자의 개인정보를 제3자에게 제공하지 않습니다.
            </p>
            <p>
              다만 「개인정보 보호법」 제17조 및 제18조에 따라 이용자가 별도로 동의한 경우, 또는 법령에 특별한 규정이
              있거나 수사기관이 적법한 절차(영장 등)에 따라 요구하는 경우에는 관련 법령이 정한 범위 내에서 제공할 수
              있습니다. 서비스 운영을 위한 인프라 사업자에게 처리를 위탁하는 사항은 제5조 및 제6조에서 안내합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제5조 개인정보 처리업무의 위탁</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            회사는 안정적인 서비스 제공을 위해 아래와 같이 개인정보 처리업무를 위탁하고 있습니다. 회사는 위탁계약 시
            개인정보의 안전한 관리, 재위탁 제한, 위탁업무 종료 시 개인정보의 반환·파기 등에 관한 사항을 계약서 등에
            반영하고 있습니다.
          </p>
          <ItemBlock
            title="Supabase, Inc."
            rows={[
              ['위탁 업무', '회원 인증, 데이터베이스 운영, 사진·음성 파일 저장 등 서비스 백엔드 인프라 제공'],
              ['보유기간', '위탁계약 종료 시 또는 제3조의 보유기간 종료 시까지'],
            ]}
          />
          <ItemBlock
            title="Amazon Web Services, Inc."
            rows={[
              ['위탁 업무', '웹 서비스 호스팅(AWS Amplify Hosting)'],
              ['보유기간', '위탁계약 종료 시 또는 제3조의 보유기간 종료 시까지'],
            ]}
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            Google 및 Apple은 이용자가 소셜 로그인을 선택한 경우에 한하여 인증 절차를 수행하는 사업자로서, 회사가
            이용자의 개인정보를 제공하는 대상이 아니라 회사가 인증 결과와 계정 정보를 전달받는 대상입니다. 각 사업자의
            개인정보 처리에 관한 사항은 해당 사업자의 개인정보처리방침을 참고하시기 바랍니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제6조 개인정보의 국외 이전</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            회사는 서비스 제공(정보주체와 체결한 계약의 이행)을 위해 아래와 같이 개인정보를 국외에 보관·처리위탁하고
            있으며, 「개인정보 보호법」 제28조의8 제1항 제3호 및 같은 법 시행령 제29조의8에 따라 아래 사항을 본
            개인정보처리방침에 공개합니다.
          </p>
          <ItemBlock
            title="Supabase, Inc."
            rows={[
              ['이전 국가', OVERSEAS.supabaseCountry],
              ['이전 항목', '제1조에 기재된 계정 정보, 이용자가 작성한 기록 및 첨부 파일, 활동 기록 전부'],
              ['이전 일시·방법', '서비스 이용 시점에 정보통신망을 통해 암호화된 상태로 전송'],
              ['이용 목적', '회원 인증, 데이터베이스 및 파일 저장 등 서비스 백엔드 인프라 제공'],
              ['보유기간', '위탁계약 종료 시 또는 제3조의 보유기간 종료 시까지'],
              ['연락처', OVERSEAS.supabaseContact],
            ]}
          />
          <ItemBlock
            title="Amazon Web Services, Inc."
            rows={[
              ['이전 국가', OVERSEAS.awsCountry],
              ['이전 항목', '웹 접속 과정에서 처리되는 접속 기록(IP 주소, 요청 정보 등)'],
              ['이전 일시·방법', '웹 서비스 접속 시점에 정보통신망을 통해 전송'],
              ['이용 목적', '웹 서비스 호스팅 및 보안'],
              ['보유기간', '위탁계약 종료 시 또는 호스팅 사업자의 로그 보관 정책에 따른 기간까지'],
              ['연락처', OVERSEAS.awsContact],
            ]}
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            이용자는 개인정보의 국외 이전을 거부할 수 있습니다. 거부를 원하시는 경우 제14조의 연락처로 요청하시거나
            회원 탈퇴를 진행하시면 됩니다. 다만 서비스의 인증·저장 기능 전체가 위 사업자의 인프라에서 제공되므로, 국외
            이전을 거부하시는 경우 서비스 이용이 불가능합니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제7조 개인정보의 파기 절차 및 방법</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground">
            <Bullets
              items={[
                '파기 절차: 보유기간이 경과하거나 처리 목적이 달성되어 개인정보가 불필요하게 되었을 때 지체 없이(사유 발생일로부터 5일 이내) 파기합니다.',
                '전자적 파일 형태의 정보: 데이터베이스 레코드와 저장소(Storage)의 파일을 복구·재생할 수 없는 방법으로 영구 삭제합니다.',
                `이용자가 기록을 삭제한 경우: 복구를 위해 ${TRASH_RETENTION} 동안 휴지통에 보관한 뒤 파기합니다. 대기 기간 없이 즉시 파기를 원하시는 경우 제14조의 연락처로 요청하실 수 있습니다.`,
                '회원 탈퇴 시: 계정 정보와 이용자가 작성한 모든 기록, 첨부된 사진·음성 파일, 활동 기록을 함께 파기합니다.',
                '종이 형태로 출력된 개인정보는 보유하지 않습니다.',
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제8조 이용자가 작성하는 기록에 포함될 수 있는 민감한 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
            <p>
              회사는 「개인정보 보호법」 제23조의 민감정보를 수집 항목으로 요구하지 않습니다. 다만 마음 기록의 기분
              단계와 메모, &lsquo;오늘을 기억할래&rsquo;의 서술 내용, 심리 검사 결과 등 이용자가 자유롭게 작성하는
              기록에는 이용자의 심리·건강 상태에 관한 정보가 포함될 수 있습니다.
            </p>
            <p>
              이러한 기록은 이용자 본인만 조회할 수 있도록 계정 단위 접근통제(행 수준 보안)와 전송구간 암호화가
              적용되며, 사진·음성 파일은 비공개 저장소에 보관되어 이용자 본인의 요청 시에만 짧은 유효시간의 접근
              링크로 제공됩니다. 회사는 이용자의 기록 내용을 열람하지 않는 것을 원칙으로 하며, 장애 대응 등 불가피한
              경우에 한해 최소한의 범위에서만 접근하고 그 이력을 남깁니다.
            </p>
            <p>
              심리 검사 결과는 참고용 콘텐츠이며 의학적 진단이나 심리 상담을 대체하지 않습니다. 기록하고 싶지 않은
              내용은 입력하지 않으셔도 서비스 이용에 제한이 없습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제9조 만 14세 미만 아동의 개인정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
            <p>
              서비스는 만 14세 이상인 이용자를 대상으로 하며, 만 14세 미만 아동의 회원 가입을 허용하지 않습니다.
            </p>
            <p>
              만 14세 미만 아동이 법정대리인의 동의 없이 가입한 사실이 확인되는 경우, 회사는 지체 없이 해당 계정과
              관련 개인정보를 파기합니다. 자녀의 가입 사실을 확인하신 법정대리인께서는 제14조의 연락처로 알려주시기
              바랍니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제10조 앱 접근권한 및 음성 인식 기능 안내</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            회사는 모바일 앱에서 아래 접근권한을 사용하며, 모두 선택 권한으로서 허용하지 않아도 해당 기능을 제외한
            서비스는 정상적으로 이용할 수 있습니다.
          </p>
          <ItemBlock
            title="카메라 · 사진(선택)"
            rows={[['이용 목적', '기록에 첨부할 사진을 촬영하거나 사진 보관함에서 선택하기 위해 사용합니다.']]}
          />
          <ItemBlock
            title="마이크(선택)"
            rows={[['이용 목적', '기록에 첨부할 음성 메모를 녹음하고, 녹음한 음성을 텍스트로 변환하기 위해 사용합니다.']]}
          />
          <div className="rounded-lg border bg-muted/30 p-3 text-sm leading-relaxed text-muted-foreground space-y-2">
            <p className="font-medium text-foreground">음성-텍스트 변환(STT) 처리 방식</p>
            <p>
              음성을 텍스트로 변환하는 기능은 기기 운영체제가 제공하는 음성 인식 기능(iOS의 Speech 프레임워크,
              Android의 음성 인식 서비스)을 사용합니다. 회사는 이 과정의 음성 데이터를 회사 서버로 전송하거나
              저장하지 않습니다. 다만 운영체제 사업자(Apple 또는 Google)의 정책에 따라 인식 정확도를 위해 음성
              데이터가 해당 사업자의 서버로 전송되어 처리될 수 있으며, 이 경우의 처리는 각 사업자의 개인정보처리방침에
              따릅니다. 변환된 텍스트는 이용자가 기록으로 저장한 경우에만 회사에 저장됩니다.
            </p>
            <p>
              이용자가 직접 녹음하여 기록에 첨부한 음성 파일은 회사의 비공개 저장소에 저장되며, 제3조의 보유기간을
              따릅니다.
            </p>
          </div>
          <p className="text-sm leading-relaxed text-muted-foreground">
            접근권한은 언제든지 기기의 설정(iOS: 설정 &gt; MindSnap, Android: 설정 &gt; 애플리케이션 &gt; MindSnap &gt;
            권한)에서 철회할 수 있습니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제11조 개인정보 자동 수집 장치의 설치·운영 및 거부</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
            <p>
              회사는 로그인 상태 유지와 서비스 이용 편의를 위해 쿠키 및 브라우저·앱의 로컬 저장소(localStorage)를
              사용합니다.
            </p>
            <Bullets
              items={[
                '로그인 세션 정보: 로그인 상태를 유지하기 위해 저장하며, 로그아웃 시 삭제됩니다.',
                '세션 식별자: 하나의 이용 흐름을 구분하기 위한 임의의 값입니다.',
                '화면 표시 설정: 공지 배너를 닫은 상태 등 화면 설정값입니다.',
              ]}
            />
            <p>
              쿠키 저장을 거부하려면 웹 브라우저의 설정에서 쿠키 허용 수준을 변경하거나, 앱의 경우 앱을 삭제하시면
              저장된 값이 함께 제거됩니다. 다만 쿠키 저장을 거부하면 로그인 상태 유지 등 일부 기능을 이용할 수
              없습니다. 회사는 광고 목적의 쿠키나 행태정보 수집·이용을 하지 않습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제12조 이용자와 법정대리인의 권리·의무 및 행사 방법</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
            <p>이용자는 언제든지 다음의 권리를 행사할 수 있습니다.</p>
            <Bullets
              items={[
                '개인정보 열람 요구',
                '오류가 있는 경우 정정 요구',
                '삭제 요구',
                '처리정지 요구',
                '개인정보의 국외 이전 거부(제6조 참조)',
              ]}
            />
            <p>서비스 내에서는 다음과 같이 직접 행사하실 수 있습니다.</p>
            <Bullets
              items={[
                '계정 정보 확인·수정: 설정 > 내 정보 수정',
                '기록 열람·수정·삭제: 저널 및 기록 화면에서 직접 수행',
                '삭제한 기록의 복구: 설정 > 삭제된 기록',
                '회원 탈퇴(계정 및 모든 기록의 삭제): 설정 > 회원탈퇴',
              ]}
            />
            <p>
              그 밖의 요구는 제14조의 연락처로 서면, 전자우편 등을 통해 하실 수 있으며, 회사는 지체 없이 조치합니다.
              이용자가 개인정보의 오류에 대한 정정을 요청한 경우, 정정을 완료하기 전까지 해당 개인정보를 이용하거나
              제공하지 않습니다. 권리 행사는 법정대리인이나 위임을 받은 대리인을 통해서도 가능하며, 이 경우
              「개인정보 처리 방법에 관한 고시」 별지 제11호 서식에 따른 위임장을 제출하셔야 합니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제13조 개인정보의 안전성 확보 조치</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground">
            <Bullets
              items={[
                '접근 권한 통제: 데이터베이스에 행 수준 보안(Row Level Security)을 적용하여 이용자는 자신의 계정으로 생성한 데이터에만 접근할 수 있습니다.',
                '파일 접근 통제: 사진·음성 파일은 공개되지 않는 저장소에 보관하고, 본인 확인 후 짧은 유효시간의 서명된 링크로만 제공합니다.',
                '비밀번호 보호: 비밀번호는 일방향 암호화하여 저장하므로 회사도 평문을 알 수 없습니다.',
                '전송구간 암호화: 모든 통신은 HTTPS(TLS)로 암호화합니다.',
                '개인정보 취급자 최소화: 개인정보에 접근할 수 있는 담당자를 최소한으로 지정하고 관리합니다.',
                '접속 기록의 보관: 서비스 이용 및 오류 대응을 위한 활동 기록을 보관하고 위·변조를 방지합니다.',
              ]}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제14조 개인정보 보호책임자 및 문의처</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm leading-relaxed text-muted-foreground">
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 이용자의 문의·불만처리 및
            피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.
          </p>
          <ItemBlock
            title="개인정보 보호책임자 · 개인정보 열람청구 접수 담당"
            rows={[
              ['상호', COMPANY.name],
              ['대표자', COMPANY.representative],
              ['사업자등록번호', COMPANY.businessNumber],
              ['주소', COMPANY.address],
              ['책임자', `${COMPANY.privacyOfficerName} (${COMPANY.privacyOfficerPosition})`],
              ['이메일', COMPANY.contactEmail],
            ]}
          />
          <p className="text-sm leading-relaxed text-muted-foreground">
            개인정보 보호와 관련한 문의, 불만처리, 피해구제 요청을 위 연락처로 보내주시면 지체 없이 답변하고
            처리하겠습니다.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제15조 권익침해에 대한 구제 방법</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
            <p>
              이용자는 개인정보 침해로 인한 구제를 받기 위하여 아래 기관에 분쟁 해결이나 상담 등을 신청할 수 있습니다.
            </p>
            <Bullets
              items={[
                '개인정보분쟁조정위원회: 1833-6972 (www.kopico.go.kr)',
                '개인정보침해신고센터: (국번없이) 118 (privacy.kisa.or.kr)',
                '대검찰청 사이버수사과: (국번없이) 1301 (www.spo.go.kr)',
                '경찰청 사이버수사국: (국번없이) 182 (ecrm.police.go.kr)',
              ]}
            />
            <p>
              「개인정보 보호법」 제35조(개인정보의 열람), 제36조(개인정보의 정정·삭제), 제37조(개인정보의 처리정지
              등)의 규정에 의한 요구에 대하여 공공기관의 장이 행한 처분 또는 부작위로 인하여 권리 또는 이익의 침해를
              받은 사람은 행정심판법이 정하는 바에 따라 행정심판을 청구할 수 있습니다.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">제16조 개인정보처리방침의 변경</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-sm leading-relaxed text-muted-foreground space-y-3">
            <p>
              본 개인정보처리방침은 {EFFECTIVE_DATE}부터 적용됩니다. 법령·정책 또는 서비스 내용의 변경에 따라 내용이
              추가·삭제·수정되는 경우에는 변경 사항의 시행 7일 전부터 서비스 내 공지사항을 통해 안내합니다. 다만
              수집하는 개인정보의 항목, 이용 목적의 변경 등 이용자의 권리에 중대한 영향을 미치는 변경의 경우에는
              최소 30일 전에 안내하고, 필요한 경우 이용자의 동의를 다시 받겠습니다.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
