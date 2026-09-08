'use client'

import { useEffect, useRef, useState } from 'react'
import { MAX_LIFE_CYCLE_AGE } from '@/lib/tarotLifeCycle'

interface LifeCycleChartProps {
  data: number[] // index = 나이(0~99), value = 카드 번호(0~22)
  currentAge: number
  onSelectAge: (age: number) => void
  selectedAge: number
}

const POINT_WIDTH = 28 // 나이 1칸의 가로폭(px) — 24px 이상의 탭 히트 영역 확보
const CHART_HEIGHT = 180
const PADDING_TOP = 20
const PADDING_BOTTOM = 24
const PADDING_LEFT = 28
const Y_MAX = 22

const CHART_WIDTH = PADDING_LEFT + (MAX_LIFE_CYCLE_AGE + 1) * POINT_WIDTH

export default function LifeCycleChart({ data, currentAge, onSelectAge, selectedAge }: LifeCycleChartProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)

  const plotHeight = CHART_HEIGHT - PADDING_TOP - PADDING_BOTTOM
  const xForAge = (age: number) => PADDING_LEFT + age * POINT_WIDTH + POINT_WIDTH / 2
  const yForValue = (value: number) => PADDING_TOP + plotHeight - (value / Y_MAX) * plotHeight

  const points = data.map((value, age) => `${xForAge(age)},${yForValue(value)}`).join(' ')

  // 마운트 시 현재 나이가 화면 가운데 오도록 스크롤
  useEffect(() => {
    if (!scrollRef.current) return
    const el = scrollRef.current
    setContainerWidth(el.clientWidth)
    const targetX = xForAge(currentAge)
    el.scrollLeft = Math.max(0, targetX - el.clientWidth / 2)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentAge])

  const handlePointer = (clientX: number) => {
    const el = scrollRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const xInSvg = clientX - rect.left + el.scrollLeft
    const age = Math.round((xInSvg - PADDING_LEFT - POINT_WIDTH / 2) / POINT_WIDTH)
    const clamped = Math.max(0, Math.min(MAX_LIFE_CYCLE_AGE, age))
    onSelectAge(clamped)
  }

  // y축 기준선(0/11/22)
  const gridValues = [0, 11, 22]

  return (
    <div className="space-y-2">
      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-lg border border-border bg-card"
        style={{ height: CHART_HEIGHT }}
      >
        <svg
          width={CHART_WIDTH}
          height={CHART_HEIGHT}
          onPointerDown={(e) => handlePointer(e.clientX)}
          onPointerMove={(e) => {
            if (e.buttons !== 1 && e.pointerType !== 'touch') return
            handlePointer(e.clientX)
          }}
          className="touch-pan-x"
        >
          {/* 가로 기준선 (recessive, hairline) */}
          {gridValues.map((v) => (
            <g key={v}>
              <line
                x1={PADDING_LEFT}
                x2={CHART_WIDTH}
                y1={yForValue(v)}
                y2={yForValue(v)}
                stroke="hsl(var(--border))"
                strokeWidth={1}
              />
              <text x={4} y={yForValue(v) + 4} fontSize={10} fill="hsl(var(--muted-foreground))">
                {v}
              </text>
            </g>
          ))}

          {/* 나이 눈금 (10세 단위) */}
          {Array.from({ length: 10 }, (_, i) => i * 10).map((age) => (
            <text
              key={age}
              x={xForAge(age)}
              y={CHART_HEIGHT - 6}
              fontSize={10}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
            >
              {age}세
            </text>
          ))}

          {/* 데이터 라인 */}
          <polyline points={points} fill="none" stroke="hsl(var(--primary))" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />

          {/* 선택된 나이 크로스헤어 */}
          <line
            x1={xForAge(selectedAge)}
            x2={xForAge(selectedAge)}
            y1={PADDING_TOP}
            y2={PADDING_TOP + plotHeight}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={1}
            strokeDasharray="2,2"
          />
          <circle
            cx={xForAge(selectedAge)}
            cy={yForValue(data[selectedAge])}
            r={5}
            fill="hsl(var(--primary))"
            stroke="hsl(var(--card))"
            strokeWidth={2}
          />

          {/* 현재 나이 표시 (선택된 나이와 다를 때만 별도 라벨) */}
          {selectedAge !== currentAge && (
            <text
              x={xForAge(currentAge)}
              y={yForValue(data[currentAge]) - 10}
              fontSize={10}
              textAnchor="middle"
              fill="hsl(var(--muted-foreground))"
            >
              지금
            </text>
          )}
        </svg>
      </div>
      <p className="text-xs text-muted-foreground text-center">가로로 스크롤하고, 그래프를 탭해서 나이별 카드를 확인하세요.</p>
    </div>
  )
}
