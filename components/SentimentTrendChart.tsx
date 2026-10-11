'use client'

interface TrendPoint {
  date: Date
  score: number
}

interface SentimentTrendChartProps {
  points: TrendPoint[]
}

const CHART_HEIGHT = 160
const PADDING = 16
const POINT_GAP = 24

export default function SentimentTrendChart({ points }: SentimentTrendChartProps) {
  if (points.length === 0) {
    return (
      <div className="text-sm text-muted-foreground text-center py-8">
        아직 분석된 기록이 없어요
      </div>
    )
  }

  const width = Math.max(320, PADDING * 2 + (points.length - 1) * POINT_GAP)
  const plotHeight = CHART_HEIGHT - PADDING * 2
  // sentiment_score는 -1.0 ~ 1.0 범위
  const yFor = (score: number) => PADDING + plotHeight - ((score + 1) / 2) * plotHeight
  const xFor = (index: number) =>
    points.length === 1 ? width / 2 : PADDING + index * ((width - PADDING * 2) / (points.length - 1))

  const linePoints = points.map((p, i) => `${xFor(i)},${yFor(p.score)}`).join(' ')
  const zeroY = yFor(0)

  return (
    <div className="overflow-x-auto">
      <svg width={width} height={CHART_HEIGHT} className="block">
        <line
          x1={PADDING}
          y1={zeroY}
          x2={width - PADDING}
          y2={zeroY}
          stroke="currentColor"
          strokeOpacity={0.15}
          strokeWidth={1}
        />
        <polyline
          points={linePoints}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {points.map((p, i) => (
          <circle key={i} cx={xFor(i)} cy={yFor(p.score)} r={3} fill="hsl(var(--primary))" />
        ))}
      </svg>
    </div>
  )
}
