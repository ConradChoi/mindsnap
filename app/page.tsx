import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Heart, Camera, Brain, BookOpen } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="space-y-8">
      {/* 로고 영역 */}
      <div className="text-center space-y-4 pt-8">
        <div className="w-32 h-16 mx-auto mb-2">
          <img 
            src="/mindsnap_logo.png" 
            alt="MindSnap Logo" 
            className="w-full h-full object-contain"
          />
        </div>
        <h1 className="text-4xl font-bold text-foreground">MindSnap</h1>
        <p className="text-muted-foreground text-mobile-base">
          마음을 기록하고 성장하는 시간
        </p>
      </div>

      {/* 메인 메뉴 영역 */}
      <div className="space-y-4">
        {/* 마음 기록하기 */}
        <Link href="/daily-mood" className="block">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-xl">
                <Heart className="w-6 h-6 text-red-500" />
                <span>마음 기록하기</span>
              </CardTitle>
              <p className="text-muted-foreground">
                오늘의 마음 상태와 감정을 기록해보세요
              </p>
            </CardHeader>
          </Card>
        </Link>

        {/* 빠른 캡처하기 */}
        <Link href="/capture" className="block">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-xl">
                <Camera className="w-6 h-6 text-blue-500" />
                <span>빠른 캡처하기</span>
              </CardTitle>
              <p className="text-muted-foreground">
                순간의 아이디어나 생각을 빠르게 기록하세요
              </p>
            </CardHeader>
          </Card>
        </Link>

        {/* 성격 검사하기 */}
        <Link href="/personality-test" className="block">
          <Card className="hover:shadow-lg transition-all duration-200 cursor-pointer">
            <CardHeader>
              <CardTitle className="flex items-center space-x-3 text-xl">
                <Brain className="w-6 h-6 text-purple-500" />
                <span>성격 검사하기</span>
              </CardTitle>
              <p className="text-muted-foreground">
                도형심리 검사와 에니어그램 검사로 자신을 알아보세요
              </p>
            </CardHeader>
          </Card>
        </Link>
      </div>

      {/* 하단 여백 */}
      <div className="h-20"></div>
    </div>
  )
}
