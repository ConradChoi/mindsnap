'use client'

import { useState } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { cn } from '@/lib/utils'

// iOS WKWebView에서 <input type="date">가 빈 화면으로 깨지고, 네이티브 피커가 기기 로케일에
// 따라 영어로 뜨는 문제가 있어 완전히 커스텀 구현으로 대체한다. value/onChange는 기존
// <input type="date">와 동일하게 'YYYY-MM-DD' 문자열을 사용해 호출부 변경을 최소화한다.

interface DatePickerProps {
  id?: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const parseValue = (value: string): Date | null => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [y, m, d] = value.split('-').map(Number)
  const date = new Date(y, m - 1, d)
  return Number.isNaN(date.getTime()) ? null : date
}

const formatValue = (date: Date): string => {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

const formatDisplay = (date: Date): string => `${date.getFullYear()}년 ${date.getMonth() + 1}월 ${date.getDate()}일`

const isSameDay = (a: Date, year: number, month: number, day: number): boolean =>
  a.getFullYear() === year && a.getMonth() === month && a.getDate() === day

export function DatePicker({ id, value, onChange, placeholder = '날짜를 선택하세요', className }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const selected = parseValue(value)
  const today = new Date()
  const [viewDate, setViewDate] = useState<Date>(selected ?? today)

  const openDialog = () => {
    setViewDate(selected ?? today)
    setOpen(true)
  }

  const year = viewDate.getFullYear()
  const month = viewDate.getMonth() // 0-indexed

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  const cells: (number | null)[] = [
    ...Array(firstDayOfWeek).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]

  const goPrevMonth = () => setViewDate(new Date(year, month - 1, 1))
  const goNextMonth = () => setViewDate(new Date(year, month + 1, 1))

  const handleSelectDay = (day: number) => {
    onChange(formatValue(new Date(year, month, day)))
    setOpen(false)
  }

  return (
    <>
      <button
        type="button"
        id={id}
        onClick={openDialog}
        className={cn(
          'w-full h-12 px-3 py-2 border border-input rounded-md bg-background text-base text-left flex items-center justify-between focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          !selected && 'text-muted-foreground',
          className
        )}
      >
        <span>{selected ? formatDisplay(selected) : placeholder}</span>
        <CalendarIcon className="w-5 h-5 text-muted-foreground shrink-0" />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>날짜 선택</DialogTitle>
          </DialogHeader>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goPrevMonth}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="이전 달"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="font-semibold">
              {year}년 {month + 1}월
            </span>
            <button
              type="button"
              onClick={goNextMonth}
              className="p-2 rounded-md hover:bg-muted transition-colors"
              aria-label="다음 달"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
            {WEEKDAYS.map((w) => (
              <div key={w} className="py-1">
                {w}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <div key={`empty-${i}`} />
              const isToday = isSameDay(today, year, month, day)
              const isSelected = selected ? isSameDay(selected, year, month, day) : false
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelectDay(day)}
                  className={cn(
                    'aspect-square rounded-md text-sm flex items-center justify-center transition-colors hover:bg-primary/10',
                    isSelected && 'bg-primary text-primary-foreground hover:bg-primary',
                    !isSelected && isToday && 'border border-primary text-primary'
                  )}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
