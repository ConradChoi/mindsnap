'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Camera, Save, Tag, X, Upload, Mic, MicOff, Play, Square } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { createSnap } from '@/lib/firebase-service'
import { useAuth } from '@/contexts/AuthContext'
import { logPageView, logUserActivity, ACTIVITY_ACTIONS, ACTIVITY_CATEGORIES } from '@/lib/analytics'

// Web Speech API 타입 정의
declare global {
  interface Window {
    SpeechRecognition: typeof SpeechRecognition
    webkitSpeechRecognition: typeof SpeechRecognition
  }
}

export default function CapturePage() {
  const router = useRouter()
  const { user } = useAuth()
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [selectedImage, setSelectedImage] = useState<string | null>(null)
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

  const handleTakePhoto = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment', // 후면 카메라 우선
          width: { ideal: 1920 },
          height: { ideal: 1080 }
        } 
      })
      
      // 카메라 스트림을 비디오 요소에 연결
      const video = document.createElement('video')
      video.srcObject = stream
      video.autoplay = true
      video.style.width = '100%'
      video.style.height = '100%'
      video.style.objectFit = 'cover'
      
      // 카메라 모달 생성
      const modal = document.createElement('div')
      modal.style.position = 'fixed'
      modal.style.top = '0'
      modal.style.left = '0'
      modal.style.width = '100%'
      modal.style.height = '100%'
      modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)'
      modal.style.zIndex = '9999'
      modal.style.display = 'flex'
      modal.style.flexDirection = 'column'
      modal.style.alignItems = 'center'
      modal.style.justifyContent = 'center'
      
      // 카메라 뷰어 컨테이너
      const cameraContainer = document.createElement('div')
      cameraContainer.style.width = '90%'
      cameraContainer.style.maxWidth = '500px'
      cameraContainer.style.height = '400px'
      cameraContainer.style.position = 'relative'
      cameraContainer.style.borderRadius = '12px'
      cameraContainer.style.overflow = 'hidden'
      cameraContainer.style.backgroundColor = '#000'
      
      // 카메라 뷰어에 비디오 추가
      cameraContainer.appendChild(video)
      
      // 촬영 버튼
      const captureButton = document.createElement('button')
      captureButton.innerHTML = '📸 촬영'
      captureButton.style.position = 'absolute'
      captureButton.style.bottom = '20px'
      captureButton.style.left = '50%'
      captureButton.style.transform = 'translateX(-50%)'
      captureButton.style.padding = '12px 24px'
      captureButton.style.backgroundColor = '#fff'
      captureButton.style.color = '#000'
      captureButton.style.border = 'none'
      captureButton.style.borderRadius = '25px'
      captureButton.style.fontSize = '16px'
      captureButton.style.fontWeight = 'bold'
      captureButton.style.cursor = 'pointer'
      captureButton.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)'
      
      // 취소 버튼
      const cancelButton = document.createElement('button')
      cancelButton.innerHTML = '❌ 취소'
      cancelButton.style.position = 'absolute'
      cancelButton.style.top = '20px'
      cancelButton.style.right = '20px'
      cancelButton.style.padding = '8px 16px'
      cancelButton.style.backgroundColor = 'rgba(255,255,255,0.2)'
      cancelButton.style.color = '#fff'
      cancelButton.style.border = 'none'
      cancelButton.style.borderRadius = '20px'
      cancelButton.style.fontSize = '14px'
      cancelButton.style.cursor = 'pointer'
      
      // 카메라 뷰어에 버튼들 추가
      cameraContainer.appendChild(captureButton)
      cameraContainer.appendChild(cancelButton)
      
      // 모달에 카메라 뷰어 추가
      modal.appendChild(cameraContainer)
      document.body.appendChild(modal)
      
      // 촬영 버튼 클릭 이벤트
      captureButton.onclick = () => {
        // 캔버스 생성하여 비디오 프레임 캡처
        const canvas = document.createElement('canvas')
        const context = canvas.getContext('2d')
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        
        if (context) {
          context.drawImage(video, 0, 0, canvas.width, canvas.height)
          
          // 캔버스를 Blob으로 변환
          canvas.toBlob((blob) => {
            if (blob) {
              const url = URL.createObjectURL(blob)
              setSelectedImage(url)
              
              // 모달 제거 및 스트림 정리
              document.body.removeChild(modal)
              stream.getTracks().forEach(track => track.stop())
            }
          }, 'image/jpeg', 0.8)
        }
      }
      
      // 취소 버튼 클릭 이벤트
      cancelButton.onclick = () => {
        document.body.removeChild(modal)
        stream.getTracks().forEach(track => track.stop())
      }
      
      // 모달 외부 클릭 시 닫기
      modal.onclick = (e) => {
        if (e.target === modal) {
          document.body.removeChild(modal)
          stream.getTracks().forEach(track => track.stop())
        }
      }
      
    } catch (error) {
      console.error('카메라에 접근할 수 없습니다:', error)
      alert('카메라 권한이 필요하거나 카메라를 사용할 수 없습니다.')
    }
  }

  const handleSelectPhoto = () => {
    // 파일 입력 요소 생성
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/*'
    input.style.display = 'none'
    
    // 파일 선택 이벤트
    input.onchange = (e) => {
      const target = e.target as HTMLInputElement
      if (target.files && target.files[0]) {
        const file = target.files[0]
        
        // 파일 크기 검증 (10MB 이하)
        if (file.size > 10 * 1024 * 1024) {
          alert('파일 크기는 10MB 이하여야 합니다.')
          return
        }
        
        // 파일 타입 검증
        if (!file.type.startsWith('image/')) {
          alert('이미지 파일만 선택할 수 있습니다.')
          return
        }
        
        // 파일을 URL로 변환하여 이미지 설정
        const url = URL.createObjectURL(file)
        setSelectedImage(url)
        
        // 파일 입력 요소 제거
        document.body.removeChild(input)
      }
    }
    
    // 파일 선택 다이얼로그 열기
    document.body.appendChild(input)
    input.click()
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
        note: note.trim() || null,
        imageUrl: selectedImage || null,
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
              <Camera className="w-5 h-5 text-primary" />
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
                      onClick={() => setSelectedImage(null)}
                      className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed border-input rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <div className="space-y-3">
                      <Camera className="w-12 h-12 text-muted-foreground mx-auto" />
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
                          <Camera className="w-4 h-4 mr-2" />
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
