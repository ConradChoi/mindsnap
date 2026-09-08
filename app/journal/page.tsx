'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Search, Plus, Tag, Calendar, Heart, Camera, Brain, Smile, Meh, Frown, Mic, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { ListSnapsRes } from '@/contracts/snaps'
import {
  getMoodRecords,
  getRememberToday,
  getSnaps,
  getPersonalityTestResults,
  deleteSnap,
  deleteMoodRecord,
  deleteRememberToday,
} from '@/lib/supabase-service'
import { useAuth } from '@/contexts/AuthContext'
import { logPageView, logTabSwitch } from '@/lib/analytics'
import { PersonalityTestResult } from '@/lib/types'
import shapeContent from '@/data/shape-psychology-content.json'
import enneagramContent from '@/data/enneagram-content.json'

// 날짜 포맷팅 함수
const formatDate = (date: Date | any) => {
  try {
    // Firestore Timestamp 객체인지 확인
    const dateObj = date?.toDate?.() || new Date(date)
    if (isNaN(dateObj.getTime())) {
      return '날짜 정보 없음'
    }
    
    const year = dateObj.getFullYear()
    const month = String(dateObj.getMonth() + 1).padStart(2, '0')
    const day = String(dateObj.getDate()).padStart(2, '0')
    const hours = String(dateObj.getHours()).padStart(2, '0')
    const minutes = String(dateObj.getMinutes()).padStart(2, '0')
    const seconds = String(dateObj.getSeconds()).padStart(2, '0')
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
  } catch (error) {
    console.error('Date formatting error:', error, date)
    return '날짜 정보 없음'
  }
}

// 스와이프 삭제 컴포넌트
const SwipeToDeleteCard = ({ 
  children, 
  onDelete, 
  itemId 
}: { 
  children: React.ReactNode
  onDelete: (id: string) => void
  itemId: string
}) => {
  const [startX, setStartX] = useState(0)
  const [currentX, setCurrentX] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const [showDelete, setShowDelete] = useState(false)

  const handleTouchStart = (e: React.TouchEvent) => {
    setStartX(e.touches[0].clientX)
    setIsDragging(true)
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isDragging) return
    
    const deltaX = e.touches[0].clientX - startX
    setCurrentX(deltaX)
    
    // 오른쪽으로 스와이프할 때만 삭제 버튼 표시
    if (deltaX < -50) {
      setShowDelete(true)
    } else {
      setShowDelete(false)
    }
  }

  const handleTouchEnd = () => {
    setIsDragging(false)
    
    // 스와이프 거리가 충분하면 삭제 버튼 유지, 아니면 원래 위치로
    if (currentX < -50) {
      setCurrentX(-80) // 삭제 버튼이 보이도록
    } else {
      setCurrentX(0)
      setShowDelete(false)
    }
  }

  const handleDelete = () => {
    onDelete(itemId)
    setCurrentX(0)
    setShowDelete(false)
  }

  return (
    <div className="relative overflow-hidden">
      <div
        className="transition-transform duration-200 ease-out"
        style={{ transform: `translateX(${currentX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {children}
      </div>
      
      {/* 삭제 버튼 */}
      {showDelete && (
        <div className="absolute right-0 top-0 h-full w-20 bg-red-500 flex items-center justify-center">
          <button
            onClick={handleDelete}
            className="p-2 text-white hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      )}
    </div>
  )
}

// 마음 기록 목록 컴포넌트
const MoodRecordList = ({ 
  searchTerm, 
  displayedRecords, 
  hasMore, 
  isLoadingMore,
  onDelete
}: { 
  searchTerm: string
  displayedRecords: any[]
  hasMore: boolean
  isLoadingMore: boolean
  onDelete: (recordId: string) => void
}) => {
  console.log('MoodRecordList props:', { displayedRecords }) // 디버깅용

  const filteredRecords = displayedRecords.filter(record => {
    if (!searchTerm.trim()) return true
    
    const searchLower = searchTerm.toLowerCase()
      return record.note?.toLowerCase().includes(searchLower) ||
        record.activities?.some((activity: string) => 
          activity.toLowerCase().includes(searchLower)
        )
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
            {searchTerm ? '검색 결과가 없습니다' : '아직 마음 기록이 없습니다'}
          </h3>
          <p className="text-muted-foreground text-mobile-sm mt-1">
            {searchTerm ? '다른 검색어를 시도해보세요' : '마음 기록을 남겨보세요'}
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
        <SwipeToDeleteCard
          key={record.id}
          itemId={record.id}
          onDelete={onDelete}
        >
          <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                  {/* 제목 */}
                  <h3 className="font-medium text-foreground text-base">
                    {record.note || '마음 기록'}
                  </h3>
                  
                  {/* 등록일시 */}
                  <div className="text-sm text-muted-foreground">
                    {formatDate(record.createdAt)}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </SwipeToDeleteCard>
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
          <p className="text-sm text-muted-foreground">모든 마음 기록을 불러왔습니다</p>
                  </div>
                )}
    </div>
  )
}

// 오늘을 기억할래 목록 컴포넌트
const RememberTodayList = ({ 
  searchTerm, 
  displayedRecords, 
  hasMore, 
  isLoadingMore,
  onDelete
}: { 
  searchTerm: string
  displayedRecords: any[]
  hasMore: boolean
  isLoadingMore: boolean
  onDelete: (recordId: string) => void
}) => {
  console.log('RememberTodayList props:', { displayedRecords }) // 디버깅용

  const filteredRecords = displayedRecords.filter(record => {
    if (!searchTerm.trim()) return true
    
    const searchLower = searchTerm.toLowerCase()
    return record.summary?.toLowerCase().includes(searchLower) ||
      record.memorableEvent?.toLowerCase().includes(searchLower) ||
      record.action?.toLowerCase().includes(searchLower)
  })

  if (filteredRecords.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto">
          <Calendar className="w-8 h-8 text-muted-foreground" />
                    </div>
        <div>
          <h3 className="font-medium text-foreground">
            {searchTerm ? '검색 결과가 없습니다' : '아직 오늘 기록이 없습니다'}
          </h3>
          <p className="text-muted-foreground text-mobile-sm mt-1">
            {searchTerm ? '다른 검색어를 시도해보세요' : '오늘을 기억할래 기록을 남겨보세요'}
          </p>
                  </div>
        {!searchTerm && (
          <Link href="/remember-today">
            <Button>
              <Calendar className="w-4 h-4 mr-2" />
              오늘을 기억할래
            </Button>
          </Link>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {filteredRecords.map((record) => (
        <SwipeToDeleteCard
          key={record.id}
          itemId={record.id}
          onDelete={onDelete}
        >
          <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1 space-y-3">
                  {/* 제목 */}
                  <h3 className="font-medium text-foreground text-base">
                    {record.summary}
                  </h3>
                
                {/* 등록일시 */}
                  <div className="text-sm text-muted-foreground">
                    {formatDate(record.createdAt)}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </SwipeToDeleteCard>
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
          <p className="text-sm text-muted-foreground">모든 오늘 기록을 불러왔습니다</p>
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
  isLoadingMore,
  onDelete
}: { 
  filteredSnaps: ListSnapsRes['snaps']
  searchTerm: string
  displayedSnaps: ListSnapsRes['snaps']
  hasMore: boolean
  isLoadingMore: boolean
  onDelete: (snapId: string) => void
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
        <SwipeToDeleteCard
          key={snap.id}
          itemId={snap.id}
          onDelete={onDelete}
        >
          <Card className="hover:shadow-md transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-3">
                {/* 제목 */}
                  <h3 className="font-medium text-foreground text-base">
                  {snap.title}
                </h3>
                
                  {/* 음성파일여부 */}
                  <div className="flex items-center space-x-2">
                    <Mic className="w-4 h-4 text-blue-500" />
                    <span className="text-sm text-muted-foreground">
                      {snap.note && snap.note.includes('🎤 음성 메모:') ? '음성파일 있음' : '음성파일 없음'}
                    </span>
                  </div>
                  
                  {/* 이미지여부 */}
                  <div className="flex items-center space-x-2">
                    <Camera className="w-4 h-4 text-green-500" />
                    <span className="text-sm text-muted-foreground">
                      {snap.imageUrl ? '이미지 있음' : '이미지 없음'}
                    </span>
                </div>
                
                {/* 등록일시 */}
                  <div className="text-sm text-muted-foreground">
                    {formatDate(snap.capturedAt)}
                  </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </SwipeToDeleteCard>
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

// 도형심리 결과 콘텐츠에서 제목만 참조 (본문은 검사 화면에서만 보여줌)
const shapeTitles = shapeContent as unknown as Record<string, { title: string }>
const enneagramTypeTitles = (enneagramContent as any).types as Record<string, { title: string }>

// 성격 목록 컴포넌트
const PersonalityList = ({ results }: { results: PersonalityTestResult[] }) => {
  if (results.length === 0) {
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

  return (
    <div className="space-y-3">
      {results.map((result) => (
        <Card key={result.id}>
          <CardContent className="py-4 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">
                {result.testType === 'shape'
                  ? `도형심리 · ${shapeTitles[result.resultKey]?.title ?? result.resultKey}`
                  : result.testType === 'enneagram'
                  ? `에니어그램 · ${enneagramTypeTitles[result.resultKey]?.title ?? result.resultKey}`
                  : result.testType}
              </p>
              <p className="text-mobile-sm text-muted-foreground mt-1">{formatDate(result.createdAt)}</p>
            </div>
          </CardContent>
        </Card>
      ))}
      <Link href="/personality-test" className="block">
        <Button variant="outline" className="w-full">
          <Brain className="w-4 h-4 mr-2" />
          새로 검사하기
        </Button>
      </Link>
    </div>
  )
}

export default function JournalPage() {
  const { user } = useAuth()
  const [snaps, setSnaps] = useState<ListSnapsRes['snaps']>([])
  const [filteredSnaps, setFilteredSnaps] = useState<ListSnapsRes['snaps']>([])
  const [moodRecords, setMoodRecords] = useState<any[]>([])
  const [rememberTodayRecords, setRememberTodayRecords] = useState<any[]>([])
  const [personalityResults, setPersonalityResults] = useState<PersonalityTestResult[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('snaps')

  // 탭 전환 핸들러 (로깅 포함)
  const handleTabChange = async (newTab: string) => {
    if (newTab !== activeTab && user?.uid) {
      // 탭 전환 로깅
      await logTabSwitch(user.uid, activeTab, newTab)
    }
    setActiveTab(newTab)
  }

  // URL 파라미터에서 탭 정보 가져오기
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const tabParam = urlParams.get('tab')
    if (tabParam === 'mood') {
      setActiveTab('mood')
    } else if (tabParam === 'remember') {
      setActiveTab('remember')
    } else if (tabParam === 'snaps') {
      setActiveTab('snaps')
    } else if (tabParam === 'personality') {
      setActiveTab('personality')
    }
  }, [])
  
  // 무한 스크롤 관련 상태
  const [displayedSnaps, setDisplayedSnaps] = useState<ListSnapsRes['snaps']>([])
  const [displayedMoodRecords, setDisplayedMoodRecords] = useState<any[]>([])
  const [displayedRememberRecords, setDisplayedRememberRecords] = useState<any[]>([])
  const [hasMoreSnaps, setHasMoreSnaps] = useState(true)
  const [hasMoreMoodRecords, setHasMoreMoodRecords] = useState(true)
  const [hasMoreRememberRecords, setHasMoreRememberRecords] = useState(true)
  const [isLoadingMore, setIsLoadingMore] = useState(false)

  // T5: 삭제 상태는 더 이상 localStorage에 보관하지 않는다. 삭제는 DB의 deleted_at
  // 컬럼(소프트 삭제)에 즉시 반영되고(휴지통은 설정 > 삭제된 기록에서 복원), 여기서는
  // 삭제 요청이 성공한 항목을 화면에서 즉시 감추기 위한 낙관적(optimistic) UI 상태만 둔다.
  const [deletedSnaps, setDeletedSnaps] = useState<Set<string>>(new Set())
  const [deletedMoodRecords, setDeletedMoodRecords] = useState<Set<string>>(new Set())
  const [deletedRememberRecords, setDeletedRememberRecords] = useState<Set<string>>(new Set())

  // 삭제 함수들: DB에 소프트 삭제(deleted_at) 반영 후 화면에서 즉시 제거
  const handleDeleteSnap = async (snapId: string) => {
    try {
      await deleteSnap(snapId, user?.uid)
      setDeletedSnaps(prev => new Set(prev).add(snapId))
    } catch (error) {
      console.error('Error deleting snap:', error)
      alert('스냅 삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleDeleteMoodRecord = async (recordId: string) => {
    try {
      await deleteMoodRecord(recordId, user?.uid)
      setDeletedMoodRecords(prev => new Set(prev).add(recordId))
    } catch (error) {
      console.error('Error deleting mood record:', error)
      alert('마음 기록 삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }

  const handleDeleteRememberRecord = async (recordId: string) => {
    try {
      await deleteRememberToday(recordId, user?.uid)
      setDeletedRememberRecords(prev => new Set(prev).add(recordId))
    } catch (error) {
      console.error('Error deleting remember record:', error)
      alert('오늘 기록 삭제에 실패했습니다. 다시 시도해주세요.')
    }
  }

  useEffect(() => {
    if (user?.uid) {
      console.log('Fetching data for user:', user.uid)
      setIsLoading(true)
      
      // 새 사용자/재조회 시 이전 세션의 낙관적 삭제 표시를 초기화
      // (getSnaps/getMoodRecords/getRememberToday는 deleted_at IS NULL만 반환하므로
      //  재조회 결과에는 어차피 삭제된 항목이 없다)
      setDeletedSnaps(new Set())
      setDeletedMoodRecords(new Set())
      setDeletedRememberRecords(new Set())

      // 일반적인 데이터 페칭 방식으로 변경
      const fetchData = async () => {
        try {
          // 페이지 뷰 로깅
          await logPageView(user.uid, 'journal', {
            activeTab: activeTab,
            timestamp: new Date().toISOString()
          })
          
          // 병렬로 데이터 페칭
          const [snapsData, moodData, rememberData, personalityData] = await Promise.all([
            getSnaps(user.uid),
            getMoodRecords(user.uid),
            getRememberToday(user.uid),
            getPersonalityTestResults(user.uid)
          ])

          console.log('Data fetched successfully:', {
            snaps: snapsData.length,
            moodRecords: moodData.length,
            rememberToday: rememberData.length,
            personalityResults: personalityData.length
          })

          // 데이터 설정 (삭제된 항목은 나중에 필터링됨)
          setSnaps(snapsData)
          setMoodRecords(moodData)
          setRememberTodayRecords(rememberData)
          setPersonalityResults(personalityData)
          
          setIsLoading(false)
        } catch (error) {
          console.error('Error fetching data:', error)
          setIsLoading(false)
          
          // 에러 발생 시 빈 배열로 설정
          setSnaps([])
          setFilteredSnaps([])
          setDisplayedSnaps([])
          setMoodRecords([])
          setDisplayedMoodRecords([])
          setRememberTodayRecords([])
          setDisplayedRememberRecords([])
        }
      }
      
      fetchData()
    } else {
      // 사용자가 없으면 로딩 상태 해제
      setIsLoading(false)
    }
  }, [user])

  // 삭제된 항목을 필터링하는 useEffect
  useEffect(() => {
    // 스냅 필터링
    const filteredSnapsData = snaps.filter(snap => !deletedSnaps.has(snap.id))
    setFilteredSnaps(filteredSnapsData)
    setDisplayedSnaps(filteredSnapsData.slice(0, ITEMS_PER_PAGE))
    setHasMoreSnaps(filteredSnapsData.length > ITEMS_PER_PAGE)
    
    // 마음 기록 필터링
    const filteredMoodData = moodRecords.filter(record => !deletedMoodRecords.has(record.id))
    setDisplayedMoodRecords(filteredMoodData.slice(0, ITEMS_PER_PAGE))
    setHasMoreMoodRecords(filteredMoodData.length > ITEMS_PER_PAGE)
    
    // 오늘 기록 필터링
    const filteredRememberData = rememberTodayRecords.filter(record => !deletedRememberRecords.has(record.id))
    setDisplayedRememberRecords(filteredRememberData.slice(0, ITEMS_PER_PAGE))
    setHasMoreRememberRecords(filteredRememberData.length > ITEMS_PER_PAGE)
  }, [deletedSnaps, deletedMoodRecords, deletedRememberRecords, snaps, moodRecords, rememberTodayRecords])

  useEffect(() => {
    // 검색어에 따른 필터링 (삭제된 항목 제외)
    const availableSnaps = snaps.filter(snap => !deletedSnaps.has(snap.id))
    
    if (!searchTerm.trim()) {
      setFilteredSnaps(availableSnaps)
    } else {
      const filtered = availableSnaps.filter(snap => 
        snap.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        snap.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredSnaps(filtered)
    }
  }, [searchTerm, snaps, deletedSnaps])

  // 실시간 리스너로 대체되어 더 이상 사용하지 않음
  // const fetchSnaps = async () => { ... }
  // const fetchMoodRecords = async () => { ... }
  // const fetchRememberTodayRecords = async () => { ... }

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
      const filteredMoodData = moodRecords.filter(record => !deletedMoodRecords.has(record.id))
      const nextItems = filteredMoodData.slice(currentLength, currentLength + ITEMS_PER_PAGE)
      
      if (nextItems.length > 0) {
        setDisplayedMoodRecords(prev => [...prev, ...nextItems])
        setHasMoreMoodRecords(currentLength + ITEMS_PER_PAGE < filteredMoodData.length)
      } else {
        setHasMoreMoodRecords(false)
      }
      setIsLoadingMore(false)
    }, 500)
  }

  const loadMoreRememberRecords = () => {
    if (isLoadingMore || !hasMoreRememberRecords) return
    
    setIsLoadingMore(true)
    setTimeout(() => {
      const currentLength = displayedRememberRecords.length
      const filteredRememberData = rememberTodayRecords.filter(record => !deletedRememberRecords.has(record.id))
      const nextItems = filteredRememberData.slice(currentLength, currentLength + ITEMS_PER_PAGE)
      
      if (nextItems.length > 0) {
        setDisplayedRememberRecords(prev => [...prev, ...nextItems])
        setHasMoreRememberRecords(currentLength + ITEMS_PER_PAGE < filteredRememberData.length)
      } else {
        setHasMoreRememberRecords(false)
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
      } else if (activeTab === 'remember' && hasMoreRememberRecords) {
        loadMoreRememberRecords()
      }
    }
  }

  // 탭 변경 시 초기화 (activeTab만 감지)
  // 탭 변경 시 로그만 출력 (실제 데이터 설정은 삭제 필터링 useEffect에서 처리)
  useEffect(() => {
    console.log('Tab changed to:', activeTab)
  }, [activeTab])

  const tabs = [
    { id: 'mood', label: '마음', icon: Heart },
    { id: 'remember', label: '오늘', icon: Calendar },
    { id: 'snaps', label: '스냅', icon: Camera },
    { id: 'personality', label: '내 성향', icon: Brain }
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
           activeTab === 'mood' ? `${moodRecords.length}개의 마음 기록` :
           activeTab === 'remember' ? `${rememberTodayRecords.length}개의 오늘 기록` : '성격 검사 결과'}
        </p>
       </div>

      {/* 탭 메뉴 */}
      <div className="flex space-x-1 bg-muted p-1 rounded-lg">
        {tabs.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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
                <>
                  {console.log('Rendering mood tab with:', { displayedMoodRecords, moodRecords })}
                <MoodRecordList 
                  searchTerm={searchTerm}
                  displayedRecords={displayedMoodRecords}
                  hasMore={hasMoreMoodRecords}
                  isLoadingMore={isLoadingMore}
                    onDelete={handleDeleteMoodRecord}
                  />
                </>
              )}
              {activeTab === 'remember' && (
                <>
                  {console.log('Rendering remember tab with:', { displayedRememberRecords, rememberTodayRecords })}
                  <RememberTodayList 
                    searchTerm={searchTerm}
                    displayedRecords={displayedRememberRecords}
                    hasMore={hasMoreRememberRecords}
                    isLoadingMore={isLoadingMore}
                    onDelete={handleDeleteRememberRecord}
                  />
                </>
              )}
              {activeTab === 'snaps' && (
                <>
                  {console.log('Rendering snaps tab with:', { displayedSnaps, filteredSnaps, snaps })}
                <SnapList 
                  filteredSnaps={filteredSnaps} 
                  searchTerm={searchTerm}
                  displayedSnaps={displayedSnaps}
                  hasMore={hasMoreSnaps}
                  isLoadingMore={isLoadingMore}
                    onDelete={handleDeleteSnap}
                />
                </>
              )}
              {activeTab === 'personality' && (
                <PersonalityList results={personalityResults} />
              )}

           </div>
   )
 }
