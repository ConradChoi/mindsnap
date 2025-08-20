import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Bell, Shield, Palette, Database, Info } from 'lucide-react'

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">설정</h1>
        <p className="text-muted-foreground text-mobile-sm">
          앱 사용 환경을 맞춤 설정하세요
        </p>
      </div>

      {/* 계정 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Shield className="w-5 h-5 text-primary" />
            <span>계정</span>
          </CardTitle>
          <CardDescription>
            계정 정보 및 보안 설정
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">사용자 ID</p>
              <p className="text-sm text-muted-foreground">TEMP_USER</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              변경
            </Button>
          </div>
          
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              인증 시스템이 구현되면 로그인/회원가입이 가능합니다
            </p>
            <Button variant="outline" disabled>
              로그인
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 알림 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Bell className="w-5 h-5 text-primary" />
            <span>알림</span>
          </CardTitle>
          <CardDescription>
            푸시 알림 및 리마인더 설정
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">푸시 알림</p>
              <p className="text-sm text-muted-foreground">새 스냅 작성 시 알림</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              활성화
            </Button>
          </div>
          
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              푸시 알림 기능이 곧 추가됩니다
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 테마 설정 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Palette className="w-5 h-5 text-primary" />
            <span>테마</span>
          </CardTitle>
          <CardDescription>
            앱의 외관 및 색상 테마 설정
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">다크 모드</p>
              <p className="text-sm text-muted-foreground">시스템 설정에 따라 자동 변경</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              설정
            </Button>
          </div>
          
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground">
              테마 설정 기능이 곧 추가됩니다
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 데이터 관리 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Database className="w-5 h-5 text-primary" />
            <span>데이터</span>
          </CardTitle>
          <CardDescription>
            데이터 백업 및 동기화 설정
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">동기화</p>
              <p className="text-sm text-muted-foreground">Supabase와 실시간 동기화</p>
            </div>
            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">백업</p>
              <p className="text-sm text-muted-foreground">데이터 내보내기/가져오기</p>
            </div>
            <Button variant="outline" size="sm" disabled>
              백업
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 앱 정보 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Info className="w-5 h-5 text-primary" />
            <span>앱 정보</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">버전</p>
              <p className="text-sm text-muted-foreground">0.1.0</p>
            </div>
          </div>
          
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div>
              <p className="font-medium">빌드</p>
              <p className="text-sm text-muted-foreground">2024.01</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* TODO: 향후 구현 예정 기능들 */}
      <div className="text-center text-sm text-muted-foreground pt-4">
        <p>⚙️ 고급 설정, 사용자 프로필, 데이터 내보내기 등이 곧 추가됩니다</p>
      </div>
    </div>
  )
}
