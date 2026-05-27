import { useRef, useEffect } from 'react'
import { format, eachDayOfInterval, isSameDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { MeetingEvent } from './MeetingEvent'
import { Meeting, Room } from '@/services/api'
import { CalendarView } from '@/pages/Index'

const HOURS = Array.from({ length: 24 }, (_, i) => i)
const HOUR_HEIGHT = 60

interface TimeGridProps {
  currentDate: Date
  dateRange: { start: Date; end: Date }
  view: CalendarView
  meetings: Meeting[]
  onGridClick: (day: Date, hour: number) => void
  onEdit: (meeting: Meeting) => void
  onDelete: () => void
  rooms: Room[]
}

export function TimeGrid({
  currentDate,
  dateRange,
  view,
  meetings,
  onGridClick,
  onEdit,
  onDelete,
  rooms,
}: TimeGridProps) {
  const days =
    view === 'day'
      ? [currentDate]
      : eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 7 * HOUR_HEIGHT
  }, [view])

  const renderEvents = (day: Date) => {
    return meetings
      .filter((m) => isSameDay(new Date(m.start_time), day))
      .map((m) => {
        const start = new Date(m.start_time)
        const end = new Date(m.end_time)
        const top = (start.getHours() + start.getMinutes() / 60) * HOUR_HEIGHT
        const height = Math.max(((end.getTime() - start.getTime()) / 60000 / 60) * HOUR_HEIGHT, 20)
        return (
          <MeetingEvent
            key={m.id}
            meeting={m}
            viewType="absolute"
            style={{ top, height }}
            rooms={rooms}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        )
      })
  }

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="flex border-b border-slate-200">
        <div className="w-16 flex-shrink-0 border-r border-slate-200" />
        <div className="flex flex-1">
          {days.map((day, i) => {
            const isToday = isSameDay(day, new Date())
            return (
              <div
                key={i}
                className={cn(
                  'flex-1 flex flex-col items-center justify-center py-3 border-r border-slate-200 last:border-r-0',
                  isToday ? 'bg-primary/5 text-primary' : 'text-slate-700',
                )}
              >
                <span className="text-xs uppercase font-medium text-slate-500 mb-1">
                  {format(day, 'EEE', { locale: ptBR })}
                </span>
                <span
                  className={cn(
                    'text-2xl font-normal w-10 h-10 flex items-center justify-center rounded-full',
                    isToday && 'bg-primary text-white font-medium',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
            )
          })}
        </div>
      </div>
      <div className="flex-1 overflow-y-auto" ref={scrollRef}>
        <div className="flex h-full min-h-[1440px] relative">
          <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-white z-20">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative flex justify-end pr-2 text-xs font-medium text-slate-500"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2.5 bg-white px-1">
                  {hour.toString().padStart(2, '0')}:00
                </span>
              </div>
            ))}
          </div>
          <div className="flex flex-1 relative z-0">
            {days.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className="flex-1 border-r border-slate-100 last:border-r-0 relative"
              >
                {HOURS.map((hour) => (
                  <div
                    key={hour}
                    className="border-b border-slate-100 w-full cursor-pointer hover:bg-slate-50/50 transition-colors"
                    style={{ height: HOUR_HEIGHT }}
                    onClick={() => onGridClick(day, hour)}
                  />
                ))}
                {renderEvents(day)}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
