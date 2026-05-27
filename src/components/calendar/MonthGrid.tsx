import { format, eachDayOfInterval, isSameDay, isSameMonth, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { MeetingEvent } from './MeetingEvent'
import { Meeting, Room } from '@/services/api'

interface MonthGridProps {
  currentDate: Date
  dateRange: { start: Date; end: Date }
  meetings: Meeting[]
  onGridClick: (day: Date, hour: number) => void
  onEdit: (meeting: Meeting) => void
  onDelete: () => void
  rooms: Room[]
}

export function MonthGrid({
  currentDate,
  dateRange,
  meetings,
  onGridClick,
  onEdit,
  onDelete,
  rooms,
}: MonthGridProps) {
  const days = eachDayOfInterval({ start: dateRange.start, end: dateRange.end })
  const weekDaysHeader = eachDayOfInterval({
    start: dateRange.start,
    end: addDays(dateRange.start, 6),
  })

  return (
    <div className="flex flex-col h-full bg-white">
      <div className="grid grid-cols-7 border-b border-slate-200">
        {weekDaysHeader.map((day) => (
          <div
            key={day.toString()}
            className="py-2 text-center text-xs font-semibold text-slate-500 uppercase"
          >
            {format(day, 'EEEE', { locale: ptBR })}
          </div>
        ))}
      </div>
      <div className="flex-1 grid grid-cols-7 auto-rows-fr">
        {days.map((day, idx) => {
          const dayEvents = meetings.filter((m) => isSameDay(new Date(m.start_time), day))
          const isCurrentMonth = isSameMonth(day, currentDate)
          const isToday = isSameDay(day, new Date())

          return (
            <div
              key={idx}
              className={cn(
                'border-r border-b border-slate-200 p-1 flex flex-col cursor-pointer hover:bg-slate-50 transition-colors overflow-hidden',
                !isCurrentMonth && 'bg-slate-50/50 text-slate-400',
              )}
              onClick={() => onGridClick(day, 9)}
            >
              <div className="flex justify-between items-center px-1 py-0.5 mb-1">
                <span
                  className={cn(
                    'text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full',
                    isToday && 'bg-primary text-white',
                  )}
                >
                  {format(day, 'd')}
                </span>
              </div>
              <div className="flex-1 overflow-hidden flex flex-col gap-0.5 relative">
                {dayEvents.slice(0, 4).map((m) => (
                  <MeetingEvent
                    key={m.id}
                    meeting={m}
                    viewType="flow"
                    rooms={rooms}
                    onEdit={onEdit}
                    onDelete={onDelete}
                  />
                ))}
                {dayEvents.length > 4 && (
                  <div className="text-[10px] font-medium text-slate-500 pl-1">
                    + {dayEvents.length - 4} mais
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
