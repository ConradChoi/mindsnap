import { SentimentAnalysis } from '@/lib/types'

const labelFor = (score: number): string => {
  if (score >= 0.25) return '😊 긍정적인 기록이에요'
  if (score <= -0.25) return '😔 힘든 하루였나봐요'
  return '😐 담담한 하루였네요'
}

export function SentimentBadge({ analysis }: { analysis?: SentimentAnalysis }) {
  if (!analysis || analysis.status === 'failed') return null

  if (analysis.status === 'pending') {
    return (
      <div className="flex items-center space-x-1 text-xs text-muted-foreground">
        <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
        <span>감정 분석 중...</span>
      </div>
    )
  }

  if (analysis.sentimentScore === undefined) return null

  return <div className="text-xs text-muted-foreground">{labelFor(analysis.sentimentScore)}</div>
}
