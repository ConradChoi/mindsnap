'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, Trash2, RotateCcw, Calendar, Heart, Camera } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

interface DeletedItem {
  id: string
  deletedAt: string
  type: 'snap' | 'mood' | 'remember'
  title: string
  date: string
  data: any
}

export default function RestoreDeletedPage() {
  const router = useRouter()
  const { user } = useAuth()
  const [deletedItems, setDeletedItems] = useState<DeletedItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

  // 탭명 가져오기 함수
  const getTabName = (type: 'snap' | 'mood' | 'remember') => {
    switch (type) {
      case 'snap': return '스냅'
      case 'mood': return '마음'
      case 'remember': return '오늘'
      default: return '알 수 없음'
    }
  }

  // 등록 시 입력한 제목 가져오기 함수
  const getOriginalTitle = (type: 'snap' | 'mood' | 'remember', data: any) => {
    switch (type) {
      case 'snap':
        return data?.title || '스냅'
      case 'mood':
        return data?.note || '마음 기록'
      case 'remember':
        return data?.summary || '오늘 기록'
      default:
        return '알 수 없음'
    }
  }

  // 긴 제목을 줄여서 표시하는 함수
  const truncateTitle = (title: string, maxLength: number = 20) => {
    if (title.length <= maxLength) return title
    return title.substring(0, maxLength) + '...'
  }

  // 복구 가능한 D-day 계산 함수
  const getRemainingDays = (dateString: string) => {
    try {
      const deletedDate = new Date(dateString)
      const now = new Date()
      const twoWeeksFromDeleted = new Date(deletedDate)
      twoWeeksFromDeleted.setDate(deletedDate.getDate() + 14)
      
      const diffTime = twoWeeksFromDeleted.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays <= 0) return '만료됨'
      if (diffDays === 1) return 'D-1'
      return `D-${diffDays}`
    } catch (error) {
      return 'D-?'
    }
  }

  // 날짜 포맷팅 함수 (기존 유지)
  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString)
      const now = new Date()
      const diffTime = Math.abs(now.getTime() - date.getTime())
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      if (diffDays === 1) return '오늘'
      if (diffDays === 2) return '어제'
      if (diffDays <= 7) return `${diffDays - 1}일 전`
      
      return date.toLocaleDateString('ko-KR', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    } catch (error) {
      return '날짜 정보 없음'
    }
  }

  // 삭제된 항목 불러오기
  const loadDeletedItems = () => {
    if (!user?.uid) {
      console.log('No user ID available for loading deleted items')
      return
    }

    try {
      const twoWeeksAgo = new Date()
      twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14)
      
      console.log('=== LOADING DELETED ITEMS ===')
      console.log('Loading deleted items for user:', user.uid)
      console.log('Two weeks ago:', twoWeeksAgo)
      console.log('Current time:', new Date())
      
      const items: DeletedItem[] = []
      
      // 스냅 삭제된 항목 처리
      const deletedSnapsData = localStorage.getItem(`deletedSnaps_${user.uid}`)
      console.log('=== LOADING DELETED SNAPS ===')
      console.log('User ID:', user.uid)
      console.log('Storage key:', `deletedSnaps_${user.uid}`)
      console.log('Raw deleted snaps data:', deletedSnapsData)
      
      if (deletedSnapsData) {
        try {
          const data = JSON.parse(deletedSnapsData)
          console.log('Parsed snaps data:', data)
          console.log('Data type:', typeof data)
          console.log('Is array:', Array.isArray(data))
          console.log('Data keys:', Object.keys(data))
          
          if (typeof data === 'object' && !Array.isArray(data)) {
            // 새로운 객체 형태 데이터 처리
            Object.keys(data).forEach(itemId => {
              console.log(`Processing snap item: ${itemId}`)
              console.log('Item data:', data[itemId])
              
              const deletedAt = new Date(data[itemId].deletedAt)
              console.log(`Snap ${itemId}: deletedAt=${deletedAt}, twoWeeksAgo=${twoWeeksAgo}, isAfter=${deletedAt >= twoWeeksAgo}`)
              
              if (deletedAt >= twoWeeksAgo) {
                const snapData = data[itemId].data
                const title = snapData?.title || '스냅'
                const remainingDays = getRemainingDays(data[itemId].deletedAt)
                
                // 만료되지 않은 항목만 추가
                if (remainingDays !== '만료됨') {
                  const originalTitle = getOriginalTitle('snap', snapData)
                  console.log(`Adding snap item: ${itemId}, title: ${originalTitle}, remaining: ${remainingDays}`)
                  console.log('Snap data:', snapData)
                  
                  items.push({
                    id: itemId,
                    deletedAt: data[itemId].deletedAt,
                    type: 'snap',
                    title: originalTitle,
                    date: formatDate(data[itemId].deletedAt),
                    data: snapData
                  })
                } else {
                  console.log(`Snap ${itemId} is expired, skipping`)
                }
              } else {
                console.log(`Snap ${itemId} is too old, skipping`)
              }
            })
          } else if (Array.isArray(data)) {
            // 기존 배열 형태 데이터 처리 (이전 버전 호환성)
            console.log('Processing array format data (legacy)')
            data.forEach((itemId: string) => {
              console.log(`Processing legacy snap item: ${itemId}`)
              
              // 배열 형태에서는 삭제 날짜를 현재 시간으로 설정 (2주 이내로 간주)
              const deletedAt = new Date()
              const title = '스냅'
              
              console.log(`Adding legacy snap item: ${itemId}, title: ${title}`)
              
              items.push({
                id: itemId,
                deletedAt: deletedAt.toISOString(),
                type: 'snap',
                title: title,
                date: formatDate(deletedAt.toISOString()),
                data: null // 기존 데이터는 정보가 없음
              })
            })
          } else {
            console.log('Data is not in expected format (object or array)')
          }
        } catch (e) {
          console.error('Error parsing deleted snaps data:', e)
        }
      } else {
        console.log('No deleted snaps data found in localStorage')
      }
      
      console.log('Total snap items added:', items.filter(item => item.type === 'snap').length)
      console.log('=== FINISHED LOADING DELETED SNAPS ===')
      
      // 마음 기록 삭제된 항목 처리
      const deletedMoodData = localStorage.getItem(`deletedMoodRecords_${user.uid}`)
      console.log('Deleted mood data:', deletedMoodData)
      if (deletedMoodData) {
        try {
          const data = JSON.parse(deletedMoodData)
          console.log('Parsed mood data:', data)
          if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach(itemId => {
              const deletedAt = new Date(data[itemId].deletedAt)
              console.log(`Mood ${itemId}: deletedAt=${deletedAt}, twoWeeksAgo=${twoWeeksAgo}, isAfter=${deletedAt >= twoWeeksAgo}`)
              if (deletedAt >= twoWeeksAgo) {
                const moodData = data[itemId].data
                const title = moodData?.note || '마음 기록'
                const remainingDays = getRemainingDays(data[itemId].deletedAt)
                
                // 만료되지 않은 항목만 추가
                if (remainingDays !== '만료됨') {
                  const originalTitle = getOriginalTitle('mood', moodData)
                  console.log(`Adding mood item: ${itemId}, title: ${originalTitle}, remaining: ${remainingDays}`)
                  items.push({
                    id: itemId,
                    deletedAt: data[itemId].deletedAt,
                    type: 'mood',
                    title: originalTitle,
                    date: formatDate(data[itemId].deletedAt),
                    data: moodData
                  })
                } else {
                  console.log(`Mood ${itemId} is expired, skipping`)
                }
              }
            })
          } else if (Array.isArray(data)) {
            // 기존 배열 형태 데이터 처리 (이전 버전 호환성)
            console.log('Processing array format mood data (legacy)')
            data.forEach((itemId: string) => {
              console.log(`Processing legacy mood item: ${itemId}`)
              
              // 배열 형태에서는 삭제 날짜를 현재 시간으로 설정 (2주 이내로 간주)
              const deletedAt = new Date()
              const title = '마음 기록'
              
              console.log(`Adding legacy mood item: ${itemId}, title: ${title}`)
              
              items.push({
                id: itemId,
                deletedAt: deletedAt.toISOString(),
                type: 'mood',
                title: title,
                date: formatDate(deletedAt.toISOString()),
                data: null // 기존 데이터는 정보가 없음
              })
            })
          }
        } catch (e) {
          console.error('Error parsing deleted mood records data:', e)
        }
      }
      
      // 오늘 기록 삭제된 항목 처리
      const deletedRememberData = localStorage.getItem(`deletedRememberRecords_${user.uid}`)
      console.log('Deleted remember data:', deletedRememberData)
      if (deletedRememberData) {
        try {
          const data = JSON.parse(deletedRememberData)
          console.log('Parsed remember data:', data)
          if (typeof data === 'object' && !Array.isArray(data)) {
            Object.keys(data).forEach(itemId => {
              const deletedAt = new Date(data[itemId].deletedAt)
              console.log(`Remember ${itemId}: deletedAt=${deletedAt}, twoWeeksAgo=${twoWeeksAgo}, isAfter=${deletedAt >= twoWeeksAgo}`)
              if (deletedAt >= twoWeeksAgo) {
                const rememberData = data[itemId].data
                const title = rememberData?.summary || '오늘 기록'
                const remainingDays = getRemainingDays(data[itemId].deletedAt)
                
                // 만료되지 않은 항목만 추가
                if (remainingDays !== '만료됨') {
                  const originalTitle = getOriginalTitle('remember', rememberData)
                  console.log(`Adding remember item: ${itemId}, title: ${originalTitle}, remaining: ${remainingDays}`)
                  items.push({
                    id: itemId,
                    deletedAt: data[itemId].deletedAt,
                    type: 'remember',
                    title: originalTitle,
                    date: formatDate(data[itemId].deletedAt),
                    data: rememberData
                  })
                } else {
                  console.log(`Remember ${itemId} is expired, skipping`)
                }
              }
            })
          } else if (Array.isArray(data)) {
            // 기존 배열 형태 데이터 처리 (이전 버전 호환성)
            console.log('Processing array format remember data (legacy)')
            data.forEach((itemId: string) => {
              console.log(`Processing legacy remember item: ${itemId}`)
              
              // 배열 형태에서는 삭제 날짜를 현재 시간으로 설정 (2주 이내로 간주)
              const deletedAt = new Date()
              const title = '오늘 기록'
              
              console.log(`Adding legacy remember item: ${itemId}, title: ${title}`)
              
              items.push({
                id: itemId,
                deletedAt: deletedAt.toISOString(),
                type: 'remember',
                title: title,
                date: formatDate(deletedAt.toISOString()),
                data: null // 기존 데이터는 정보가 없음
              })
            })
          }
        } catch (e) {
          console.error('Error parsing deleted remember records data:', e)
        }
      }
      
      // 삭제 날짜순으로 정렬 (최신순)
      items.sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime())
      
      console.log('=== FINAL RESULTS ===')
      console.log('Total items found:', items.length)
      console.log('Items by type:', {
        snaps: items.filter(item => item.type === 'snap').length,
        mood: items.filter(item => item.type === 'mood').length,
        remember: items.filter(item => item.type === 'remember').length
      })
      console.log('Final deleted items:', items)
      console.log('=== LOADING COMPLETED ===')
      
      setDeletedItems(items)
    } catch (error) {
      console.error('Error loading deleted items:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadDeletedItems()
  }, [user])

  // 개별 항목 선택/해제
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

  // 전체 선택/해제
  const toggleAllSelection = () => {
    if (selectedItems.size === deletedItems.length) {
      setSelectedItems(new Set())
    } else {
      setSelectedItems(new Set(deletedItems.map(item => item.id)))
    }
  }

  // 선택된 항목 복구
  const restoreSelectedItems = () => {
    if (selectedItems.size === 0) {
      alert('복구할 항목을 선택해주세요.')
      return
    }

    if (confirm(`선택한 ${selectedItems.size}개의 항목을 복구하시겠습니까?`)) {
      try {
        if (!user?.uid) return

        // 각 타입별로 선택된 항목들을 복구
        const selectedSnaps = deletedItems.filter(item => 
          item.type === 'snap' && selectedItems.has(item.id)
        ).map(item => item.id)
        
        const selectedMoodRecords = deletedItems.filter(item => 
          item.type === 'mood' && selectedItems.has(item.id)
        ).map(item => item.id)
        
        const selectedRememberRecords = deletedItems.filter(item => 
          item.type === 'remember' && selectedItems.has(item.id)
        ).map(item => item.id)

        // localStorage에서 선택된 항목들 제거
        if (selectedSnaps.length > 0) {
          const deletedSnapsData = localStorage.getItem(`deletedSnaps_${user.uid}`)
          if (deletedSnapsData) {
            const data = JSON.parse(deletedSnapsData)
            selectedSnaps.forEach(itemId => {
              delete data[itemId]
            })
            
            if (Object.keys(data).length === 0) {
              localStorage.removeItem(`deletedSnaps_${user.uid}`)
            } else {
              localStorage.setItem(`deletedSnaps_${user.uid}`, JSON.stringify(data))
            }
          }
        }

        if (selectedMoodRecords.length > 0) {
          const deletedMoodData = localStorage.getItem(`deletedMoodRecords_${user.uid}`)
          if (deletedMoodData) {
            const data = JSON.parse(deletedMoodData)
            selectedMoodRecords.forEach(itemId => {
              delete data[itemId]
            })
            
            if (Object.keys(data).length === 0) {
              localStorage.removeItem(`deletedMoodRecords_${user.uid}`)
            } else {
              localStorage.setItem(`deletedMoodRecords_${user.uid}`, JSON.stringify(data))
            }
          }
        }

        if (selectedRememberRecords.length > 0) {
          const deletedRememberData = localStorage.getItem(`deletedRememberRecords_${user.uid}`)
          if (deletedRememberData) {
            const data = JSON.parse(deletedRememberData)
            selectedRememberRecords.forEach(itemId => {
              delete data[itemId]
            })
            
            if (Object.keys(data).length === 0) {
              localStorage.removeItem(`deletedRememberRecords_${user.uid}`)
            } else {
              localStorage.setItem(`deletedRememberRecords_${user.uid}`, JSON.stringify(data))
            }
          }
        }

        alert(`${selectedItems.size}개의 항목이 복구되었습니다.\n저널 페이지를 새로고침하면 복구된 항목을 확인할 수 있습니다.`)
        
        // 목록 새로고침
        loadDeletedItems()
        setSelectedItems(new Set())
      } catch (error) {
        console.error('Error restoring selected items:', error)
        alert('복구 중 오류가 발생했습니다.')
      }
    }
  }

  // 전체 복구
  const restoreAllItems = () => {
    if (deletedItems.length === 0) {
      alert('복구할 항목이 없습니다.')
      return
    }

    if (confirm(`모든 ${deletedItems.length}개의 항목을 복구하시겠습니까?`)) {
      try {
        if (!user?.uid) return

        // 모든 삭제된 항목 제거
        localStorage.removeItem(`deletedSnaps_${user.uid}`)
        localStorage.removeItem(`deletedMoodRecords_${user.uid}`)
        localStorage.removeItem(`deletedRememberRecords_${user.uid}`)

        alert(`${deletedItems.length}개의 항목이 복구되었습니다.\n저널 페이지를 새로고침하면 복구된 항목을 확인할 수 있습니다.`)
        
        // 목록 새로고침
        loadDeletedItems()
        setSelectedItems(new Set())
      } catch (error) {
        console.error('Error restoring all items:', error)
        alert('복구 중 오류가 발생했습니다.')
      }
    }
  }

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'snap': return <Camera className="w-4 h-4" />
      case 'mood': return <Heart className="w-4 h-4" />
      case 'remember': return <Calendar className="w-4 h-4" />
      default: return <Trash2 className="w-4 h-4" />
    }
  }

  const getTypeColor = (type: string) => {
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
            className="flex-1"
          >
            {selectedItems.size === deletedItems.length ? '전체 해제' : '전체 선택'}
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={restoreAllItems}
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
                        복구 가능한 {getRemainingDays(item.deletedAt)}
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
