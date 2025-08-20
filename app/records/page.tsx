import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Heart, Camera, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function RecordsPage() {
  const recordOptions = [
    {
      id: 'daily-mood',
      title: '마음 기록',
      description: '오늘의 마음 상태와 감정을 기록합니다',
      icon: Heart,
      color: 'text-red-500',
      bgColor: 'bg-red-50',
      href: '/daily-mood'
    },
    {
      id: 'capture',
      title: '빠른 캡처',
      description: '순간의 아이디어나 생각을 빠르게 기록합니다',
      icon: Camera,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      href: '/capture'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">기록하기</h1>
        <p className="text-muted-foreground text-mobile-sm">
          어떤 것을 기록하고 싶으신가요?
        </p>
      </div>

      {/* 기록 옵션들 */}
      <div className="space-y-4">
        {recordOptions.map((option) => (
          <Link key={option.id} href={option.href} className="block">
            <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${option.bgColor}`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <option.icon className={`w-6 h-6 ${option.color}`} />
                  <span>{option.title}</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
                </CardTitle>
                <p className="text-muted-foreground">
                  {option.description}
                </p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* 하단 여백 */}
      <div className="h-20"></div>
    </div>
  )
}
