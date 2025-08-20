'use client'

import React, { useState } from 'react'
import { X, Bell, Info, AlertTriangle, CheckCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface BannerProps {
  type?: 'info' | 'success' | 'warning' | 'event'
  title: string
  description?: string
  onClose?: () => void
  className?: string
  closable?: boolean
  showReopenButton?: boolean
  reopenButtonText?: string
}

const bannerConfig = {
  info: {
    icon: Info,
    bgClass: 'bg-blue-500',
    gradientClass: 'from-blue-500 to-blue-600',
    iconClass: 'text-blue-100'
  },
  success: {
    icon: CheckCircle,
    bgClass: 'bg-green-500',
    gradientClass: 'from-green-500 to-green-600',
    iconClass: 'text-green-100'
  },
  warning: {
    icon: AlertTriangle,
    bgClass: 'bg-yellow-500',
    gradientClass: 'from-yellow-500 to-yellow-600',
    iconClass: 'text-yellow-100'
  },
  event: {
    icon: Bell,
    bgClass: 'bg-purple-500',
    gradientClass: 'from-purple-500 to-blue-600',
    iconClass: 'text-purple-100'
  }
}

export function Banner({
  type = 'info',
  title,
  description,
  onClose,
  className,
  closable = true,
  showReopenButton = false,
  reopenButtonText = "다시 보기"
}: BannerProps) {
  const [isVisible, setIsVisible] = useState(true)
  const [shouldRender, setShouldRender] = useState(true)
  const config = bannerConfig[type]
  const Icon = config.icon

  const handleClose = () => {
    setIsVisible(false)
    // 애니메이션 완료 후 DOM에서 제거
    setTimeout(() => {
      setShouldRender(false)
      onClose?.()
    }, 300)
  }

  const handleReopen = () => {
    setShouldRender(true)
    setIsVisible(true)
  }

  if (!shouldRender) {
    // 재표시 버튼이 활성화된 경우에만 버튼 표시
    if (showReopenButton) {
      return (
        <div className="bg-muted/50 px-4 py-2 text-center">
          <button
            onClick={handleReopen}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            📢 {reopenButtonText}
          </button>
        </div>
      )
    }
    return null
  }

  return (
    <div className={cn(
      'bg-gradient-to-r text-white px-4 py-3 relative transition-all duration-300 ease-in-out',
      config.gradientClass,
      className,
      isVisible ? 'opacity-100 transform translate-y-0' : 'opacity-0 transform -translate-y-full'
    )}>
      {isVisible && (
        <>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon className={cn('w-4 h-4', config.iconClass)} />
              <span className="text-sm font-medium">{title}</span>
            </div>
            {closable && (
              <button
                onClick={handleClose}
                className="text-white/80 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                aria-label="배너 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
          {description && (
            <p className="text-xs text-white/80 mt-1 leading-relaxed">
              {description}
            </p>
          )}
        </>
      )}
    </div>
  )
}

// 특정 용도별 배너 컴포넌트들
export function EventBanner({ title, description, onClose }: Omit<BannerProps, 'type'>) {
  return (
    <Banner
      type="event"
      title={title}
      description={description}
      onClose={onClose}
      showReopenButton={true}
      reopenButtonText="공지사항 보기"
    />
  )
}

export function InfoBanner({ title, description, onClose }: Omit<BannerProps, 'type'>) {
  return (
    <Banner
      type="info"
      title={title}
      description={description}
      onClose={onClose}
    />
  )
}

export function SuccessBanner({ title, description, onClose }: Omit<BannerProps, 'type'>) {
  return (
    <Banner
      type="success"
      title={title}
      description={description}
      onClose={onClose}
    />
  )
}

export function WarningBanner({ title, description, onClose }: Omit<BannerProps, 'type'>) {
  return (
    <Banner
      type="warning"
      title={title}
      description={description}
      onClose={onClose}
    />
  )
}
