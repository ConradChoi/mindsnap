'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera as CameraIcon, Save, Tag, X, Upload, Mic, MicOff, Play, Square } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createSnap } from '@/lib/supabase-service'
import { useAuth } from '@/contexts/AuthContext'
import { logPageView, logUserActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } from '@/lib/analytics'
import { Camera, MediaTypeSelection } from '@capacitor/camera'

// Web Speech API 타입 정의
interface SpeechRecognition extends EventTarget {
  continuous: boolean
  interimResults: boolean
  lang: string
  maxAlternatives: number
  start(): void
  stop(): void
  abort(): void
  onresult: ((event: SpeechRecognitionEvent) => void) | null
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null
  onend: (() => void) | null
  onstart: (() => void) | null
}

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList
  resultIndex: number
}

interface SpeechRecognitionResultList {
  length: number
  item(index: number): SpeechRecognitionResult
  [index: number]: SpeechRecognitionResult
}

interface SpeechRecognitionResult {
  length: number
  item(index: number): SpeechRecognitionAlternative
  [index: number]: SpeechRecognitionAlternative
  isFinal: boolean
}

interface SpeechRecognitionAlternative {
  transcript: string
  confidence: number
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string
  message: string
}

declare global {
  interface Window {
    SpeechRecognition: {
      new (): SpeechRecognition
    }
    webkitSpeechRecognition: {
      new (): SpeechRecognition
    }
  }
}

export default function CapturePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
  // T4: 미리보기용 blob: URL(selectedImage)과 별개로, 실제 업로드에 쓸 File/Blob 원본을 보관한다.
  // blob: URL은 브라우저 세션에서만 유효하므로 DB에는 절대 저장하지 않는다.
  const [selectedImageFile, setSelectedImageFile] = useState<File | Blob | null>(null)
  const [tags, setTags] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // 음성 녹음 관련 상태
  const [isRecording, setIsRecording] = useState(false)
  const [isPlaying, setIsPlaying] = useState(false)
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null)
  const [audioUrl, setAudioUrl] = useState<string | null>(null)
  const [recordingTime, setRecordingTime] = useState(0)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null)
  
  // 음성-텍스트 변환 관련 상태
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcriptionText, setTranscriptionText] = useState('')
  const [transcriptionProgress, setTranscriptionProgress] = useState('')

  // 페이지 뷰 로깅
  useEffect(() => {
    if (user?.uid) {
      logPageView(user.uid, 'capture', {
        timestamp: new Date().toISOString()
      })
    }
  }, [user])

  const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024 // 10MB

  // Capacitor Camera 플러그인이 반환하는 webPath(네이티브에서는 capacitor:// 스킴,
  // 웹 폴백에서는 blob: URL)를 fetch로 읽어 실제 업로드용 Blob으로 변환한다.
  // selectedImage(미리보기)에는 webPath를 그대로 쓰고, DB에는 절대 저장하지 않는다(T4 원칙 유지).
  const applyPickedImage = async (webPath: string | undefined) => {
    if (!webPath) return

    try {
      const response = await fetch(webPath)
      const blob = await response.blob()

      if (blob.size > MAX_IMAGE_SIZE_BYTES) {
        alert('파일 크기는 10MB 이하여야 합니다.')
        return
      }

      setSelectedImage(webPath)
      setSelectedImageFile(blob)
    } catch (error) {
      console.error('이미지를 불러오지 못했습니다:', error)
      alert('선택한 이미지를 불러오지 못했습니다. 다시 시도해주세요.')
    }
  }

  // 후면 카메라로 즉시 촬영 (iOS/Android: 네이티브 카메라 UI, 웹: 파일 입력 폴백)
  const handleTakePhoto = async () => {
    try {
      const result = await Camera.takePhoto({
        quality: 80,
        editable: 'no',
        saveToGallery: false,
        correctOrientation: true,
      })
      await applyPickedImage(result.webPath)
    } catch (error) {
      // 사용자가 촬영을 취소한 경우도 이 catch로 들어오므로 별도 alert는 띄우지 않는다
      console.warn('카메라 촬영이 취소되었거나 실패했습니다:', error)
    }
  }

  // 갤러리에서 사진 선택
  const handleSelectPhoto = async () => {
    try {
      const result = await Camera.chooseFromGallery({
        mediaType: MediaTypeSelection.Photo,
        allowMultipleSelection: false,
      })
      await applyPickedImage(result.results[0]?.webPath)
    } catch (error) {
      // 사용자가 선택을 취소한 경우도 이 catch로 들어오므로 별도 alert는 띄우지 않는다
      console.warn('사진 선택이 취소되었거나 실패했습니다:', error)
    }
  }

  // 음성 녹음 시작
  const startRecording = async () => {
    try {
      // 더 안정적인 오디오 설정
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: 44100
        }
      })
      
      // 지원되는 MIME 타입 확인
      let mimeType = 'audio/webm'
      if (!MediaRecorder.isTypeSupported('audio/webm')) {
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          mimeType = 'audio/mp4'
        } else if (MediaRecorder.isTypeSupported('audio/wav')) {
          mimeType = 'audio/wav'
        } else {
          mimeType = 'audio/webm' // 기본값
        }
      }
      
      const recorder = new MediaRecorder(stream, { mimeType })
      const chunks: Blob[] = []
      
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data)
        }
      }
      
      // 녹음 시간 카운터
      const timer = setInterval(() => {
        setRecordingTime(prev => prev + 1)
      }, 1000)
      
      recorder.onstop = () => {
        clearInterval(timer)
        const blob = new Blob(chunks, { type: mimeType })
        const url = URL.createObjectURL(blob)
        setAudioBlob(blob)
        setAudioUrl(url)
        setRecordingTime(0)
        stream.getTracks().forEach(track => track.stop())
        
        // 녹음 완료 후 바로 음성 인식 시작 (간단한 방식)
        startSimpleSpeechRecognition()
      }
      
      recorder.start()
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingTime(0)
      
      // 녹음 시작 로깅
      if (user?.uid) {
        await logUserActivity(
          user.uid,
          ACTIVITY_ACTIONS.START_RECORDING,
          ACTIVITY_CATEGORIES.CAPTURE,
          {
            timestamp: new Date().toISOString()
          }
        )
      }
    } catch (error) {
      console.error('음성 녹음을 시작할 수 없습니다:', error)
      alert('마이크 권한이 필요합니다.')
    }
  }

  // 음성 녹음 중지
  const stopRecording = async () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop()
      setIsRecording(false)
      
      // 녹음 중지 로깅
      if (user?.uid) {
        await logUserActivity(
          user.uid,
          ACTIVITY_ACTIONS.STOP_RECORDING,
          ACTIVITY_CATEGORIES.CAPTURE,
          {
            recordingDuration: recordingTime,
            timestamp: new Date().toISOString()
          }
        )
      }
    }
  }

  // 음성 재생
  const playAudio = () => {
    if (audioUrl && !isPlaying) {
      const audio = new Audio(audioUrl)
      audio.onended = () => setIsPlaying(false)
      audio.play()
      setIsPlaying(true)
    }
  }

  // 음성 재생 중지
  const stopAudio = () => {
    setIsPlaying(false)
  }

  // 녹음된 음성 삭제
  const deleteAudio = () => {
    setAudioBlob(null)
    setAudioUrl(null)
    if (audioUrl) {
      URL.revokeObjectURL(audioUrl)
    }
  }

  // 녹음 시간을 mm:ss 형식으로 변환
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  }

  // 음성-텍스트 변환 (Web Speech API 사용)
  const transcribeAudio = async (audioBlob: Blob) => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.')
      return
    }

    setIsTranscribing(true)
    setTranscriptionProgress('음성을 텍스트로 변환 중...')

    try {
      // 오디오 파일 크기 확인
      if (audioBlob.size === 0) {
        throw new Error('녹음된 오디오 데이터가 없습니다.')
      }

      console.log('Audio blob size:', audioBlob.size, 'type:', audioBlob.type)

      // 간단한 직접 음성 인식 방식 사용
      await startDirectSpeechRecognition()
      
    } catch (error) {
      console.error('음성-텍스트 변환 오류:', error)
      setTranscriptionProgress('변환 실패')
      setIsTranscribing(false)
      
      // 오류 시 수동 입력 안내
      const manualText = prompt('음성-텍스트 변환에 실패했습니다. 직접 입력해주세요:')
      if (manualText) {
        setTranscriptionText(manualText)
        setNote(prev => {
          const separator = prev.trim() ? '\n\n' : ''
          return prev + separator + `🎤 음성 메모: ${manualText}`
        })
      }
    }
  }

  // 간단한 음성 인식 (녹음 완료 후 바로 시작)
  const startSimpleSpeechRecognition = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('이 브라우저는 음성 인식을 지원하지 않습니다.')
      return
    }

    setIsTranscribing(true)
    setTranscriptionProgress('음성 인식 중... (다시 말씀해주세요)')

    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.lang = 'ko-KR'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      
      recognition.onstart = () => {
        console.log('음성 인식 시작됨')
        setTranscriptionProgress('음성 인식 중...')
      }
      
      recognition.onresult = async (event) => {
        console.log('음성 인식 결과:', event.results)
        const transcript = event.results[0][0].transcript
        console.log('인식된 텍스트:', transcript)
        
        setTranscriptionText(transcript)
        setTranscriptionProgress('변환 완료!')
        
        // 음성-텍스트 변환 성공 로깅
        if (user?.uid) {
          await logUserActivity(
            user.uid,
            ACTIVITY_ACTIONS.SPEECH_TO_TEXT,
            ACTIVITY_CATEGORIES.CAPTURE,
            {
              transcriptLength: transcript.length,
              success: true,
              timestamp: new Date().toISOString()
            }
          )
        }
        
        // 메모 영역에 변환된 텍스트 추가
        setNote(prev => {
          const separator = prev.trim() ? '\n\n' : ''
          const newText = prev + separator + `🎤 음성 메모: ${transcript}`
          console.log('메모에 추가된 텍스트:', newText)
          return newText
        })
      }
      
      recognition.onerror = (event) => {
        console.error('음성 인식 오류:', event.error)
        setTranscriptionProgress('음성 인식 실패')
        
        const manualText = prompt('음성 인식에 실패했습니다. 직접 입력해주세요:')
        if (manualText) {
          setTranscriptionText(manualText)
          setNote(prev => {
            const separator = prev.trim() ? '\n\n' : ''
            return prev + separator + `🎤 음성 메모: ${manualText}`
          })
        }
      }
      
      recognition.onend = () => {
        console.log('음성 인식 종료됨')
        setIsTranscribing(false)
      }
      
      console.log('음성 인식 시작 중...')
      recognition.start()
    } catch (error) {
      console.error('음성 인식 오류:', error)
      setIsTranscribing(false)
      setTranscriptionProgress('음성 인식 실패')
    }
  }

  // 직접 음성 인식 (오디오 재생 없이)
  const startDirectSpeechRecognition = async () => {
    try {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
      const recognition = new SpeechRecognition()
      
      recognition.lang = 'ko-KR'
      recognition.continuous = false
      recognition.interimResults = false
      recognition.maxAlternatives = 1
      
      recognition.onstart = () => {
        setTranscriptionProgress('음성 인식 중... (다시 말씀해주세요)')
        console.log('음성 인식 시작됨')
      }
      
      recognition.onresult = (event) => {
        console.log('음성 인식 결과:', event.results)
        const transcript = event.results[0][0].transcript
        console.log('인식된 텍스트:', transcript)
        
        setTranscriptionText(transcript)
        setTranscriptionProgress('변환 완료!')
        
        // 메모 영역에 변환된 텍스트 추가
        setNote(prev => {
          const separator = prev.trim() ? '\n\n' : ''
          const newText = prev + separator + `🎤 음성 메모: ${transcript}`
          console.log('메모에 추가된 텍스트:', newText)
          return newText
        })
      }
      
      recognition.onerror = (event) => {
        console.error('직접 음성 인식 오류:', event.error)
        setTranscriptionProgress('음성 인식 실패')
        
        const manualText = prompt('음성 인식에 실패했습니다. 직접 입력해주세요:')
        if (manualText) {
          setTranscriptionText(manualText)
          setNote(prev => {
            const separator = prev.trim() ? '\n\n' : ''
            return prev + separator + `🎤 음성 메모: ${manualText}`
          })
        }
      }
      
      recognition.onend = () => {
        console.log('음성 인식 종료됨')
        setIsTranscribing(false)
      }
      
      console.log('음성 인식 시작 중...')
      recognition.start()
    } catch (error) {
      console.error('직접 음성 인식 오류:', error)
      setIsTranscribing(false)
      setTranscriptionProgress('음성 인식 실패')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return
    if (!user?.uid) {
      alert('로그인이 필요합니다.')
      router.push('/login')
      return
    }

    setIsSubmitting(true)
    try {
      const snapData = {
        title: title.trim(),
        note: note.trim() || undefined,
        imageFile: selectedImageFile || undefined,
        audioFile: audioBlob || undefined,
        tags: tags.trim() ? tags.split(',').map(tag => tag.trim()) : [],
        capturedAt: new Date(),
        userId: user.uid,
      }

      const result = await createSnap(snapData)
      console.log('Snap created:', result.id)
      
      // 성공 시 저널 페이지로 이동
      router.push('/journal?tab=snaps')
    } catch (error) {
      console.error('Error creating snap:', error)
      alert('스냅 저장에 실패했습니다. 다시 시도해주세요.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <h1 className="text-2xl font-bold">새 스냅 작성</h1>
        <p className="text-muted-foreground text-mobile-sm">
          순간의 아이디어를 빠르게 기록하세요
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <CameraIcon className="w-5 h-5 text-primary" />
              <span>스냅 정보</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* 제목 입력 */}
            <div className="space-y-2">
              <label htmlFor="title" className="text-sm font-medium">
                제목 *
              </label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="스냅의 제목을 입력하세요"
                required
                className="h-12 text-mobile-base"
              />
            </div>

            {/* 메모 입력 */}
            <div className="space-y-2">
              <label htmlFor="note" className="text-sm font-medium">
                메모
              </label>
              <div className="space-y-3">
                <textarea
                  id="note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="추가적인 메모가 있다면 입력하세요"
                  className="w-full h-24 px-3 py-2 border border-input rounded-md bg-background text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                />
                
                {/* 음성 녹음 영역 */}
                <div className="space-y-3">
                  {!audioUrl ? (
                    <div className="flex items-center space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={isRecording ? stopRecording : startRecording}
                        className={`flex items-center space-x-2 ${
                          isRecording ? 'bg-red-50 border-red-200 text-red-700' : ''
                        }`}
                      >
                        {isRecording ? (
                          <>
                            <Square className="w-4 h-4" />
                            <span>녹음 중지</span>
                          </>
                        ) : (
                          <>
                            <Mic className="w-4 h-4" />
                            <span>음성으로 녹음하기</span>
                          </>
                        )}
                      </Button>
                      
                      {isRecording && (
                        <div className="flex items-center space-x-2 text-sm text-red-600">
                          <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                          <span>녹음 중... {formatTime(recordingTime)}</span>
                        </div>
                      )}
                    </div>
                                     ) : (
                     <div className="space-y-2">
                       <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                         <div className="flex items-center space-x-2">
                           <Mic className="w-4 h-4 text-primary" />
                           <span className="text-sm font-medium">녹음된 음성</span>
                         </div>
                         <div className="flex items-center space-x-2">
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={isPlaying ? stopAudio : playAudio}
                             className="h-8 px-2"
                           >
                             {isPlaying ? (
                               <Square className="w-3 h-3" />
                             ) : (
                               <Play className="w-3 h-3" />
                             )}
                           </Button>
                           <Button
                             type="button"
                             variant="outline"
                             size="sm"
                             onClick={deleteAudio}
                             className="h-8 px-2 text-red-600 hover:text-red-700"
                           >
                             <X className="w-3 h-3" />
                           </Button>
                         </div>
                       </div>
                       
                       {/* 음성-텍스트 변환 상태 표시 */}
                       {isTranscribing && (
                         <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                           <div className="flex items-center space-x-2 text-blue-700">
                             <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                             <span className="text-sm font-medium">{transcriptionProgress}</span>
                           </div>
                         </div>
                       )}
                       
                       {/* 변환된 텍스트 표시 */}
                       {transcriptionText && !isTranscribing && (
                         <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                           <div className="flex items-center space-x-2 text-green-700">
                             <span className="text-sm font-medium">🎤 변환된 음성:</span>
                           </div>
                           <p className="text-sm mt-2 text-green-800">{transcriptionText}</p>
                         </div>
                       )}
                       
                       <Button
                         type="button"
                         variant="outline"
                         size="sm"
                         onClick={startRecording}
                         className="w-full"
                       >
                         <Mic className="w-4 h-4 mr-2" />
                         다시 녹음하기
                       </Button>
                     </div>
                   )}
                </div>
              </div>
            </div>

            {/* 사진 */}
            <div className="space-y-2">
              <label className="text-sm font-medium">
                사진 (선택사항)
              </label>
              <div className="space-y-3">
                {selectedImage ? (
                  <div className="relative">
                    <img
                      src={selectedImage}
                      alt="선택된 사진"
                      className="w-full h-48 object-cover rounded-lg border border-input"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedImage) URL.revokeObjectURL(selectedImage)
                        setSelectedImage(null)
                        setSelectedImageFile(null)
                      }}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-input rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <div className="space-y-3">
                      <CameraIcon className="w-12 h-12 text-muted-foreground mx-auto" />
                      <div>
                        <p className="text-sm font-medium text-foreground">사진을 추가해보세요</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          촬영하거나 갤러리에서 선택할 수 있습니다
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleTakePhoto}
                          className="flex-1"
                        >
                          <CameraIcon className="w-4 h-4 mr-2" />
                          촬영
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSelectPhoto}
                          className="flex-1"
                        >
                          <Upload className="w-4 h-4 mr-2" />
                          선택
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* 태그 입력 */}
            <div className="space-y-2">
              <label htmlFor="tags" className="text-sm font-medium flex items-center space-x-2">
                <Tag className="w-4 h-4" />
                <span>태그</span>
              </label>
              <Input
                id="tags"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="쉼표로 구분하여 태그를 입력하세요 (예: 아이디어, 작업, 개인)"
                className="h-12 text-mobile-sm"
              />
              <p className="text-xs text-muted-foreground">
                태그는 쉼표(,)로 구분하여 입력하세요
              </p>
            </div>
          </CardContent>
        </Card>

        {/* 액션 버튼들 */}
        <div className="space-y-3">
          <Button
            id="save-button"
            type="submit"
            disabled={!title.trim() || isSubmitting}
            className="w-full h-12 text-lg bg-primary text-primary-foreground"
          >
            {isSubmitting ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>저장 중...</span>
              </div>
            ) : (
              <div className="flex items-center space-x-2">
                <Save className="w-5 h-5" />
                <span>스냅 저장</span>
              </div>
            )}
          </Button>

          <Button
            id="cancel-button"
            type="button"
            variant="outline"
            onClick={() => router.back()}
            className="w-full h-12 text-lg bg-red-50 border-red-200 text-red-700"
          >
            취소
          </Button>
        </div>
      </form>



      {/* 하단 네비게이션과 겹치지 않도록 여백 추가 */}
      <div className="h-12"></div>
    </div>
  )
}
