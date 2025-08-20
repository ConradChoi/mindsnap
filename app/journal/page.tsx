'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Tag, Calendar, Heart, Camera, Brain, Smile, Meh, Frown, Mic } from 'lucide-react'
import Link from 'next/link'
import { ListSnapsRes } from '@/contracts/snaps'

// 마음 기록 목록 컴포넌트
const MoodRecordList = ({ 
  searchTerm, 
  displayedRecords, 
  hasMore, 
  isLoadingMore,
  rememberTodayRecords 
}: { 
  searchTerm: string
  displayedRecords: any[]
  hasMore: boolean
  isLoadingMore: boolean
  rememberTodayRecords: any[]
}) => {
  // 마음 기록과 오늘을 기억할래 기록을 합쳐서 표시
  const combinedRecords = [
    ...displayedRecords.map(record => ({ ...record, type: 'mood' })),
    ...rememberTodayRecords.map(record => ({ ...record, type: 'remember' }))
  ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  const filteredRecords = combinedRecords.filter(record => {
    const searchLower = searchTerm.toLowerCase()
    if (record.type === 'mood') {
      return record.note?.toLowerCase().includes(searchLower) ||
        record.activities?.some((activity: string) => 
          activity.toLowerCase().includes(searchLower)
        )
    } else if (record.type === 'remember') {
      return record.summary?.toLowerCase().includes(searchLower) ||
        record.memorableEvent?.toLowerCase().includes(searchLower) ||
        record.action?.toLowerCase().includes(searchLower)
    }
    return false
  })

  const getMoodIcon = (mood: number) => {
    if (mood >= 7) return <Smile className="w-4 h-4 text-green-500" />
    if (mood >= 4) return <Meh className="w-4 h-4 text-yellow-500" />
    return <Frown className="w-4 h-4 text-blue-500" />
  }

  const getMoodLabel = (mood: number) => {
    if (mood >= 7) return '행복'
    if (mood >= 4) return '보통'
    return '우울'
  }

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'mood': return '마음'
      case 'remember': return '오늘하루'
      default: return '기타'
    }
  }

  if (filteredRecords.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Heart className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">
            {searchTerm ? '검색 결과가 없습니다' : '아직 기록이 없습니다'}
          </h3>
          <p className="text-muted-foreground text-mobile-sm mt-1">
            {searchTerm ? '다른 검색어를 시도해보세요' : '기록을 남겨보세요'}
          </p>
        </div>
        {!searchTerm && (
          <Link href="/daily-mood">
            <Button>
              <Heart className="w-4 h-4 mr-2" />
              마음 기록하기
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredRecords.map((record) => (
        <Card key={record.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                {/* 타입 표시 */}
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-md font-medium ${
                    record.type === 'mood' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-blue-100 text-blue-700'
                  }`}>
                    {record.type === 'mood' ? '마음 기록' : '오늘을 기억할래'}
                  </span>
                </div>

                {/* 제목 */}
                <h3 className="font-medium text-foreground line-clamp-2 text-base">
                  {record.type === 'mood' 
                    ? (record.note || '마음 기록')
                    : record.summary
                  }
                </h3>
                
                {/* 내용 미리보기 */}
                {record.type === 'remember' && (
                  <p className="text-sm text-muted-foreground line-clamp-2">
                    {record.memorableEvent}
                  </p>
                )}
                
                {/* 기분 (마음 기록인 경우) */}
                {record.type === 'mood' && (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      {getMoodIcon(record.mood)}
                      <span className="text-xs text-muted-foreground">
                        {getMoodLabel(record.mood)} ({record.mood}/10)
                      </span>
                    </div>
                  </div>
                )}

                {/* 기분 (오늘을 기억할래인 경우) */}
                {record.type === 'remember' && (
                  <div className="flex items-center space-x-3">
                    <div className="flex items-center space-x-1">
                      {record.mood === 'happy' && <Smile className="w-4 h-4 text-green-500" />}
                      {record.mood === 'neutral' && <Meh className="w-4 h-4 text-yellow-500" />}
                      {record.mood === 'sad' && <Frown className="w-4 h-4 text-blue-500" />}
                      <span className="text-xs text-muted-foreground">
                        {record.mood === 'happy' ? '행복' : record.mood === 'neutral' ? '보통' : '우울'}
                      </span>
                    </div>
                  </div>
                )}
                
                {/* 활동 (마음 기록인 경우) */}
                {record.type === 'mood' && record.activities && record.activities.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {record.activities.map((activity: string, index: number) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-muted text-xs rounded-md text-muted-foreground"
                      >
                        {activity}
                      </span>
                    ))}
                  </div>
                )}
                
                {/* 등록일시 */}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(record.createdAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    }).replace(/\./g, '-').replace(/,/g, '')}
                  </span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* 로딩 인디케이터 */}
      {isLoadingMore && (
        <div className="text-center py-4">
          <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground mt-2">더 많은 기록을 불러오는 중...</p>
        </div>
      )}
      
      {/* 더 이상 로드할 데이터가 없을 때 */}
      {!hasMore && displayedRecords.length > 0 && (
        <div className="text-center py-4">
          <p className="text-sm text-muted-foreground">모든 기록을 불러왔습니다</p>
        </div>
      )}
    </div>
  )
}

// 스냅 목록 컴포넌트
const SnapList = ({ 
  filteredSnaps, 
  searchTerm,
  displayedSnaps,
  hasMore,
  isLoadingMore
}: { 
  filteredSnaps: ListSnapsRes['snaps']
  searchTerm: string
  displayedSnaps: ListSnapsRes['snaps']
  hasMore: boolean
  isLoadingMore: boolean
}) => {
  if (filteredSnaps.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Camera className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h3 className="font-medium text-foreground">
            {searchTerm ? '검색 결과가 없습니다' : '아직 스냅이 없습니다'}
          </h3>
          <p className="text-muted-foreground text-mobile-sm mt-1">
            {searchTerm ? '다른 검색어를 시도해보세요' : '첫 번째 스냅을 작성해보세요'}
          </p>
        </div>
        {!searchTerm && (
          <Link href="/capture">
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              스냅 작성하기
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {displayedSnaps.map((snap) => (
        <Card key={snap.id} className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                {/* 제목 */}
                <h3 className="font-medium text-foreground line-clamp-2 text-base">
                  {snap.title}
                </h3>
                
                {/* 음성 및 사진 유무 표시 */}
                <div className="flex items-center space-x-3">
                  {/* 음성 유무 */}
                  <div className="flex items-center space-x-1">
                    <Mic className="w-4 h-4 text-blue-500" />
                    <span className="text-xs text-muted-foreground">
                      {snap.note && snap.note.includes('🎤 음성 메모:') ? '음성 있음' : '음성 없음'}
                    </span>
                  </div>
                  
                  {/* 사진 유무 */}
                  <div className="flex items-center space-x-1">
                    <Camera className="w-4 h-4 text-green-500" />
                    <span className="text-xs text-muted-foreground">
                      {snap.imageUrl ? '사진 있음' : '사진 없음'}
                    </span>
                  </div>
                </div>
                
                {/* 등록일시 */}
                <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                  <Calendar className="w-4 h-4" />
                  <span>
                    {new Date(snap.capturedAt).toLocaleString('ko-KR', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: false
                    }).replace(/\./g, '-').replace(/,/g, '')}
                  </span>
                </div>
                
                {/* 태그 (선택적) */}
                {snap.tags && snap.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {snap.tags.slice(0, 3).map((tag, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 bg-muted text-xs rounded-md text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                    {snap.tags.length > 3 && (
                      <span className="px-2 py-1 bg-muted text-xs rounded-md text-muted-foreground">
                        +{snap.tags.length - 3}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
      
      {/* 로딩 인디케이터 */}
      {isLoadingMore && (
        <div className="text-center py-4">
          <div className="flex items-center justify-center space-x-2 text-muted-foreground">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
            <span>더 많은 스냅을 불러오는 중...</span>
          </div>
        </div>
      )}
      
      {/* 더 이상 로드할 데이터가 없을 때 */}
      {!hasMore && displayedSnaps.length > 0 && (
        <div className="text-center py-4">
          <span className="text-sm text-muted-foreground">모든 스냅을 불러왔습니다</span>
        </div>
      )}
    </div>
  )
}

// 성격 목록 컴포넌트
const PersonalityList = () => {
  return (
    <div className="text-center py-12 space-y-4">
      <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
        <Brain className="w-8 h-8 text-muted-foreground" />
      </div>
      <div>
        <h3 className="font-medium text-foreground">아직 성격 검사 결과가 없습니다</h3>
        <p className="text-muted-foreground text-mobile-sm mt-1">
          성격 검사를 통해 자신을 알아보세요
        </p>
      </div>
      <Link href="/personality-test">
        <Button>
          <Brain className="w-4 h-4 mr-2" />
          성격 검사하기
        </Button>
      </Link>
    </div>
  )
}

export default function JournalPage() {
  const [snaps, setSnaps] = useState<ListSnapsRes['snaps']>([])
  const [filteredSnaps, setFilteredSnaps] = useState<ListSnapsRes['snaps']>([])
  const [moodRecords, setMoodRecords] = useState<any[]>([])
  const [rememberTodayRecords, setRememberTodayRecords] = useState<any[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('snaps')
  
  // 무한 스크롤 관련 상태
  const [displayedSnaps, setDisplayedSnaps] = useState<ListSnapsRes['snaps']>([])
  const [displayedMoodRecords, setDisplayedMoodRecords] = useState<any[]>([])
  const [hasMoreSnaps, setHasMoreSnaps] = useState(true)
  const [hasMoreMoodRecords, setHasMoreMoodRecords] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  useEffect(() => {
    fetchSnaps()
    fetchMoodRecords()
    fetchRememberTodayRecords()
  }, [])

  useEffect(() => {
    // 검색어에 따른 필터링
    if (!searchTerm.trim()) {
      setFilteredSnaps(snaps)
    } else {
      const filtered = snaps.filter(snap => 
        snap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snap.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredSnaps(filtered)
    }
  }, [searchTerm, snaps])

  const fetchSnaps = async () => {
    try {
      const response = await fetch('/api/snaps')
      if (response.ok) {
        const data: ListSnapsRes = await response.json()
        setSnaps(data.snaps)
        setFilteredSnaps(data.snaps)
      } else {
        console.error('Failed to fetch snaps')
      }
    } catch (error) {
      console.error('Error fetching snaps:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const fetchMoodRecords = async () => {
    try {
      const response = await fetch('/api/mood-records')
      if (response.ok) {
        const data = await response.json()
        setMoodRecords(data.records || [])
        setDisplayedMoodRecords(data.records?.slice(0, ITEMS_PER_PAGE) || [])
        setHasMoreMoodRecords((data.records?.length || 0) > ITEMS_PER_PAGE)
      } else {
        console.error('Failed to fetch mood records')
      }
    } catch (error) {
      console.error('Error fetching mood records:', error)
    }
  }

  const fetchRememberTodayRecords = async () => {
    try {
      const response = await fetch('/api/remember-today')
      if (response.ok) {
        const data = await response.json()
        setRememberTodayRecords(data.records || [])
      } else {
        console.error('Failed to fetch remember today records')
      }
    } catch (error) {
      console.error('Error fetching remember today records:', error)
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffTime = Math.abs(now.getTime() - date.getTime())
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

    if (diffDays === 1) return '오늘'
    if (diffDays === 2) return '어제'
    if (diffDays <= 7) return `${diffDays - 1}일 전`
    
    return date.toLocaleDateString('ko-KR', {
      month: 'short',
      day: 'numeric'
    })
  }

  // 무한 스크롤 관련 함수들
  const ITEMS_PER_PAGE = 30

  const loadMoreSnaps = () => {
    if (isLoadingMore || !hasMoreSnaps) return
    
    setIsLoadingMore(true)
    setTimeout(() => {
      const currentLength = displayedSnaps.length
      const nextItems = filteredSnaps.slice(currentLength, currentLength + ITEMS_PER_PAGE)
      
      if (nextItems.length > 0) {
        setDisplayedSnaps(prev => [...prev, ...nextItems])
        setHasMoreSnaps(currentLength + ITEMS_PER_PAGE < filteredSnaps.length)
      } else {
        setHasMoreSnaps(false)
      }
      setIsLoadingMore(false)
    }, 500) // 로딩 효과를 위한 지연
  }

  const loadMoreMoodRecords = () => {
    if (isLoadingMore || !hasMoreMoodRecords) return
    
    setIsLoadingMore(true)
    setTimeout(() => {
      const currentLength = displayedMoodRecords.length
      const nextItems = moodRecords.slice(currentLength, currentLength + ITEMS_PER_PAGE)
      
      if (nextItems.length > 0) {
        setDisplayedMoodRecords(prev => [...prev, ...nextItems])
        setHasMoreMoodRecords(currentLength + ITEMS_PER_PAGE < moodRecords.length)
      } else {
        setHasMoreMoodRecords(false)
      }
      setIsLoadingMore(false)
    }, 500)
  }

  // 스크롤 이벤트 핸들러
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget
    const threshold = 100 // 스크롤 끝에서 100px 전에 로드 시작
    
    if (scrollHeight - scrollTop - clientHeight < threshold) {
      if (activeTab === 'snaps' && hasMoreSnaps) {
        loadMoreSnaps()
      } else if (activeTab === 'mood' && hasMoreMoodRecords) {
        loadMoreMoodRecords()
      }
    }
  }

  // 탭 변경 시 초기화
  useEffect(() => {
    if (activeTab === 'snaps') {
      setDisplayedSnaps(filteredSnaps.slice(0, ITEMS_PER_PAGE))
      setHasMoreSnaps(filteredSnaps.length > ITEMS_PER_PAGE)
    } else if (activeTab === 'mood') {
      // TODO: 실제 마음 기록 데이터 API 연동
      const mockMoodRecords = [
        {
          id: '1',
          type: 'mood',
          title: '오늘은 정말 행복한 하루였어요',
          summary: '친구들과 즐거운 시간을 보냈습니다',
          mood: 'happy',
          createdAt: '2024-01-15 14:30:00'
        },
        {
          id: '2',
          type: 'remember',
          title: '프로젝트 완성의 기쁨',
          summary: '오늘 하루 중 가장 인상깊었던 일을 자세히 적어보세요',
          mood: 'neutral',
          createdAt: '2024-01-14 09:15:00'
        }
      ]
      setDisplayedMoodRecords(mockMoodRecords.slice(0, ITEMS_PER_PAGE))
      setHasMoreMoodRecords(mockMoodRecords.length > ITEMS_PER_PAGE)
    }
  }, [activeTab, filteredSnaps])

  const tabs = [
    { id: 'mood', label: '마음 기록', icon: Heart },
    { id: 'snaps', label: '스냅', icon: Camera },
    { id: 'personality', label: '나의 성격', icon: Brain }
  ]

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-4">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">스냅을 불러오는 중...</p>
        </div>
      </div>
    )
  }

     return (
     <div className="space-y-6" onScroll={handleScroll} style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
       {/* 헤더 */}
       <div className="text-center">
         <h1 className="text-2xl font-bold">저널</h1>
                 <p className="text-muted-foreground text-mobile-sm">
          {activeTab === 'snaps' ? `${filteredSnaps.length}개의 스냅` : 
           activeTab === 'mood' ? `${displayedMoodRecords.length + rememberTodayRecords.length}개의 기록` : '성격 검사 결과'}
        </p>
       </div>

      {/* 탭 메뉴 */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center space-x-2 py-3 px-3 rounded-md text-sm font-medium transition-colors min-h-[44px] whitespace-nowrap ${
                activeTab === tab.id
                  ? 'bg-background text-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="제목이나 태그로 검색하세요"
          className="pl-10 h-12 text-mobile-base"
        />
      </div>

                                       {/* 탭별 콘텐츠 */}
              {activeTab === 'mood' && (
                <MoodRecordList 
                  searchTerm={searchTerm}
                  displayedRecords={displayedMoodRecords}
                  hasMore={hasMoreMoodRecords}
                  isLoadingMore={isLoadingMore}
                  rememberTodayRecords={rememberTodayRecords}
                />
              )}
              {activeTab === 'snaps' && (
                <SnapList 
                  filteredSnaps={filteredSnaps} 
                  searchTerm={searchTerm}
                  displayedSnaps={displayedSnaps}
                  hasMore={hasMoreSnaps}
                  isLoadingMore={isLoadingMore}
                />
              )}
              {activeTab === 'personality' && (
                <PersonalityList />
              )}

           </div>
   )
 }
