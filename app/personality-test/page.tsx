import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Shapes, Users, Brain, ArrowRight } from 'lucide-react'
import Link from 'next/link'

export default function PersonalityTestPage() {
  const testOptions = [
    {
      id: 'shape',
      title: '도형심리 검사',
      description: '도형을 선택하는 방식으로 심리 상태를 분석합니다',
      icon: Shapes,
      color: 'text-blue-500',
      bgColor: 'bg-blue-50',
      href: '/personality-test/shape'
    },
    {
      id: 'enneagram',
      title: '에니어그램 검사',
      description: '9가지 성격 유형을 통해 자신의 성향을 파악합니다',
      icon: Users,
      color: 'text-purple-500',
      bgColor: 'bg-purple-50',
      href: '/personality-test/enneagram'
    }
  ]

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">성격 검사</h1>
        <p className="text-muted-foreground text-mobile-sm">
          자신을 더 깊이 알아보세요
        </p>
      </div>

      {/* 검사 옵션들 */}
      <div className="space-y-4">
        {testOptions.map((test) => (
          <Link key={test.id} href={test.href} className="block">
            <Card className={`hover:shadow-lg transition-all duration-200 cursor-pointer ${test.bgColor}`}>
              <CardHeader>
                <CardTitle className="flex items-center space-x-3 text-xl">
                  <test.icon className={`w-6 h-6 ${test.color}`} />
                  <span>{test.title}</span>
                  <ArrowRight className="w-5 h-5 text-muted-foreground ml-auto" />
                </CardTitle>
                <p className="text-muted-foreground">
                  {test.description}
                </p>
              </CardHeader>
            </Card>
          </Link>
        ))}
      </div>

      {/* 정보 카드 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Brain className="w-5 h-5 text-primary" />
            <span>성격 검사란?</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-mobile-sm text-muted-foreground leading-relaxed">
            성격 검사를 통해 자신의 성향, 강점, 개선점을 파악할 수 있습니다. 
            정기적으로 검사해보면서 자신의 변화와 성장을 추적해보세요.
          </p>
        </CardContent>
      </Card>

      {/* 하단 여백 */}
      <div className="h-20"></div>
    </div>
  )
}
