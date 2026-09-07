'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trash2, RotateCcw, Calendar, Heart, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { getTrashItems, restoreTrashItem } from '@/lib/supabase-service'
import { TrashItem } from '@/lib/types'

// T5: 휴지통은 localStorage가 아니라 DB의 deleted_at(소프트 삭제) 컬럼을 기준으로 조회한다.
// 이렇게 해야 다른 기기/브라우저에서 로그인해도 동일한 휴지통을 볼 수 있다.
const TRASH_RETENTION_DAYS = 14

export default function RestoreDeletedPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [deletedItems, setDeletedItems] = useState<TrashItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRestoring, setIsRestoring] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  const getTabName = (type: TrashItem['type']) => {
    switch (type) {
      case 'snap': return '스냅'
      case 'mood': return '마음'
      case 'remember': return '오늘'
      default: return '알 수 없음'
    }
  }

  const truncateTitle = (title: string, maxLength: number = 20) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  // 복구 가능한 D-day 계산 (삭제일 + 14일 기준)
  const getRemainingDays = (deletedAt: Date) => {
    try {
      const expiresAt = new Date(deletedAt)
      expiresAt.setDate(expiresAt.getDate() + TRASH_RETENTION_DAYS)

      const diffTime = expiresAt.getTime() - Date.now()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays <= 0) return '만료됨'
      if (diffDays === 1) return 'D-1'
      return `D-${diffDays}`
    } catch (error) {
      return 'D-?'
    }
  }

  const formatDate = (date: Date) => {
    try {
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

      if (diffDays === 1) return '오늘'
      if (diffDays === 2) return '어제'
      if (diffDays <= 7) return `${diffDays - 1}일 전`

      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    } catch (error) {
      return '날짜 정보 없음'
    }
  }

  const loadDeletedItems = useCallback(async () => {
    if (!user?.uid) return
    setIsLoading(true)
    try {
      const items = await getTrashItems(user.uid)
      setDeletedItems(items)
    } catch (error) {
      console.error('Error loading deleted items:', error)
      setDeletedItems([])
    } finally {
      setIsLoading(false)
    }
  }, [user?.uid])

  useEffect(() => {
    loadDeletedItems()
  }, [loadDeletedItems])

  const toggleItemSelection = (itemId: string) => {
    setSelectedItems(prev => {
      const newSet = new Set(prev)
      if (newSet.has(itemId)) {
        newSet.delete(itemId)
      } else {
        newSet.add(itemId)
      }
      return newSet
    })
  }

  const toggleAllSelection = () => {
    if (selectedItems.size === deletedItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(deletedItems.map(item => item.id)))
    }
  }

  const restoreItems = async (items: TrashItem[]) => {
    if (!user?.uid || items.length === 0) return
    setIsRestoring(true)
    try {
      // 항목마다 타입이 다른 테이블이라 순차적으로 복원한다 (개수가 적어 성능 영향 없음)
      for (const item of items) {
        await restoreTrashItem(item.type, item.id, user.uid)
      }
      alert(`${items.length}개의 항목이 복구되었습니다.`)
      setSelectedItems(new Set())
      await loadDeletedItems()
    } catch (error) {
      console.error('Error restoring items:', error)
      alert('복구 중 오류가 발생했습니다. 다시 시도해주세요.')
    } finally {
      setIsRestoring(false)
    }
  }

  const restoreSelectedItems = () => {
    if (selectedItems.size === 0) {
      alert('복구할 항목을 선택해주세요.')
      return
    }
    if (confirm(`선택한 ${selectedItems.size}개의 항목을 복구하시겠습니까?`)) {
      restoreItems(deletedItems.filter(item => selectedItems.has(item.id)))
    }
  }

  const restoreAllItems = () => {
    if (deletedItems.length === 0) {
      alert('복구할 항목이 없습니다.')
      return
    }
    if (confirm(`모든 ${deletedItems.length}개의 항목을 복구하시겠습니까?`)) {
      restoreItems(deletedItems)
    }
  }

  const getTypeIcon = (type: TrashItem['type']) => {
    switch (type) {
      case 'snap': return <Camera className="w-4 h-4" />
      case 'mood': return <Heart className="w-4 h-4" />
      case 'remember': return <Calendar className="w-4 h-4" />
      default: return <Trash2 className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: TrashItem['type']) => {
    switch (type) {
      case 'snap': return 'text-blue-500'
      case 'mood': return 'text-red-500'
      case 'remember': return 'text-green-500'
      default: return 'text-gray-500'
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">삭제된 항목을 불러오는 중...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-28">
      {/* 헤더 */}
      <div className="flex items-center space-x-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.back()}
          className="p-2"
        >
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">삭제된 기록</h1>
          <p className="text-muted-foreground text-mobile-sm">
            2주 이내 삭제한 항목들을 복구할 수 있습니다
          </p>
        </div>
      </div>

      {/* 액션 버튼들 */}
      {deletedItems.length > 0 && (
        <div className="flex space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAllSelection}
            disabled={isRestoring}
            className="flex-1"
          >
            {selectedItems.size === deletedItems.length ? '전체 해제' : '전체 선택'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={restoreAllItems}
            disabled={isRestoring}
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            전체 복구
          </Button>
        </div>
      )}

      {/* 선택된 항목 복구 버튼 */}
      {selectedItems.size > 0 && (
        <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 p-4 -mx-4 border-b">
          <Button
            onClick={restoreSelectedItems}
            disabled={isRestoring}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            선택한 {selectedItems.size}개 항목 복구
          </Button>
        </div>
      )}

      {/* 삭제된 항목 목록 */}
      {deletedItems.length === 0 ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
            <Trash2 className="w-8 h-8 text-muted-foreground" />
          </div>
          <div>
            <h3 className="font-medium text-foreground">
              복구 가능한 항목이 없습니다
            </h3>
            <p className="text-muted-foreground text-mobile-sm mt-1">
              2주 이내에 삭제한 항목이 없거나<br />
              모든 항목이 이미 복구되었습니다
            </p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {deletedItems.map((item) => (
            <Card
              key={item.id}
              className={`cursor-pointer transition-colors ${
                selectedItems.has(item.id)
                  ? 'ring-2 ring-primary bg-primary/5'
                  : 'hover:bg-muted/50'
              }`}
              onClick={() => toggleItemSelection(item.id)}
            >
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-full bg-muted ${getTypeColor(item.type)}`}>
                      {getTypeIcon(item.type)}
                    </div>
                    <div>
                      <p className="font-medium truncate max-w-[200px]" title={item.title}>
                        {getTabName(item.type)}, {truncateTitle(item.title)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {formatDate(item.deletedAt)} 삭제 · 복구 가능한 {getRemainingDays(item.deletedAt)}
                      </p>
                    </div>
                  </div>
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center ${
                    selectedItems.has(item.id)
                      ? 'bg-primary border-primary text-primary-foreground'
                      : 'border-muted-foreground'
                  }`}>
                    {selectedItems.has(item.id) && (
                      <div className="w-2 h-2 bg-primary-foreground rounded-full" />
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* 안내 메시지 */}
      {deletedItems.length > 0 && (
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            💡 2주가 지난 항목은 자동으로 복구할 수 없습니다
          </p>
        </div>
      )}
    </div>
  )
}
