import {
  format,
  isSameMonth,
  setMonth,
  setYear,
  addDays,
  subDays,
  addWeeks,
  subWeeks,
  addMonths,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CalendarView } from '@/pages/Index'

interface CalendarHeaderProps {
  currentDate: Date
  setCurrentDate: (date: Date) => void
  view: CalendarView
  setView: (view: CalendarView) => void
}

export function CalendarHeader({
  currentDate,
  setCurrentDate,
  view,
  setView,
}: CalendarHeaderProps) {
  const formatHeaderDate = () => {
    if (view === 'day') return format(currentDate, "d 'de' MMMM, yyyy", { locale: ptBR })
    if (view === 'week') {
      const start = subDays(currentDate, currentDate.getDay() === 0 ? 6 : currentDate.getDay() - 1)
      const end = addDays(start, 6)
      if (isSameMonth(start, end))
        return `${format(start, 'd')} - ${format(end, 'd')} de ${format(start, 'MMMM, yyyy', { locale: ptBR })}`
      if (start.getFullYear() === end.getFullYear())
        return `${format(start, "d 'de' MMM", { locale: ptBR })} - ${format(end, "d 'de' MMM, yyyy", { locale: ptBR })}`
      return `${format(start, "d 'de' MMM, yyyy", { locale: ptBR })} - ${format(end, "d 'de' MMM, yyyy", { locale: ptBR })}`
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
  }

  const handlePrev = () => {
    if (view === 'day') setCurrentDate(subDays(currentDate, 1))
    if (view === 'week') setCurrentDate(subWeeks(currentDate, 1))
    if (view === 'month') setCurrentDate(subMonths(currentDate, 1))
  }

  const handleNext = () => {
    if (view === 'day') setCurrentDate(addDays(currentDate, 1))
    if (view === 'week') setCurrentDate(addWeeks(currentDate, 1))
    if (view === 'month') setCurrentDate(addMonths(currentDate, 1))
  }

  return (
    <div className="flex flex-col md:flex-row items-center justify-between gap-4 p-4 border-b border-slate-200 bg-white">
      <Tabs
        value={view}
        onValueChange={(v) => setView(v as CalendarView)}
        className="w-full md:w-auto order-1 md:order-2"
      >
        <TabsList className="h-9 w-full grid grid-cols-3 md:flex md:w-auto">
          <TabsTrigger value="day" className="text-xs">
            Dia
          </TabsTrigger>
          <TabsTrigger value="week" className="text-xs">
            Semana
          </TabsTrigger>
          <TabsTrigger value="month" className="text-xs">
            Mês
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="flex flex-wrap md:flex-nowrap items-center justify-center md:justify-start gap-2 md:gap-4 w-full md:w-auto order-2 md:order-1">
        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            className="h-9 px-4 font-medium"
            onClick={() => setCurrentDate(new Date())}
          >
            Hoje
          </Button>
          <div className="flex items-center ml-1 md:ml-2 border rounded-md">
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-none border-r"
              onClick={handlePrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-none"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              className="h-9 text-base md:text-xl font-normal px-2 capitalize hover:bg-slate-100"
            >
              <span className="truncate max-w-[200px] md:max-w-none">{formatHeaderDate()}</span>
              <CalendarIcon className="ml-2 h-5 w-5 opacity-50 shrink-0" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-4">
            <div className="flex gap-2">
              <Select
                value={currentDate.getMonth().toString()}
                onValueChange={(v) => setCurrentDate(setMonth(currentDate, parseInt(v)))}
              >
                <SelectTrigger className="w-[140px] capitalize">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 12 }, (_, i) => (
                    <SelectItem key={i} value={i.toString()} className="capitalize">
                      {format(setMonth(new Date(), i), 'MMMM', { locale: ptBR })}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={currentDate.getFullYear().toString()}
                onValueChange={(v) => setCurrentDate(setYear(currentDate, parseInt(v)))}
              >
                <SelectTrigger className="w-[100px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 15 }, (_, i) => {
                    const y = new Date().getFullYear() - 5 + i
                    return (
                      <SelectItem key={y} value={y.toString()}>
                        {y}
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  )
}
