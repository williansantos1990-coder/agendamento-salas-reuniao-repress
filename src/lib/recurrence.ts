import {
  parse,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  getDay,
  getDate,
  getMonth,
  setDay,
  isBefore,
  isAfter,
  startOfDay,
  isSameDay,
  differenceInDays,
  differenceInWeeks,
  differenceInMonths,
  startOfWeek,
  startOfMonth,
} from 'date-fns'

export type RecurrencePattern = 'daily' | 'weekly' | 'monthly' | 'yearly'
export type RangeEndType = 'end_date' | 'occurrences' | 'no_end'

export interface RecurrenceConfig {
  pattern: RecurrencePattern
  daily: {
    type: 'every_days' | 'every_weekday'
    days: number
  }
  weekly: {
    interval: number
    days: number[] // 0=Sun, 1=Mon...
  }
  monthly: {
    type: 'specific_day' | 'relative'
    day: number
    interval: number
    relativeWeek: number // 1-4, -1 for last
    relativeDay: number // 0-6
  }
  yearly: {
    type: 'specific_date' | 'relative'
    month: number // 1-12
    day: number
    relativeWeek: number
    relativeDay: number
  }
  range: {
    startDate: string // yyyy-MM-dd
    endType: RangeEndType
    endDate: string // yyyy-MM-dd
    occurrences: number
  }
  startTime: string // HH:mm
  endTime: string // HH:mm
}

export const defaultRecurrenceConfig: RecurrenceConfig = {
  pattern: 'weekly',
  daily: { type: 'every_days', days: 1 },
  weekly: { interval: 1, days: [] },
  monthly: { type: 'specific_day', day: 1, interval: 1, relativeWeek: 1, relativeDay: 1 },
  yearly: { type: 'specific_date', month: 1, day: 1, relativeWeek: 1, relativeDay: 1 },
  range: {
    startDate: '',
    endType: 'occurrences',
    endDate: '',
    occurrences: 10,
  },
  startTime: '09:00',
  endTime: '10:00',
}

export function generateOccurrences(config: RecurrenceConfig): { start: Date; end: Date }[] {
  const occurrences: { start: Date; end: Date }[] = []
  const maxOccurrences = config.range.endType === 'occurrences' ? config.range.occurrences : 100 // Hard cap at 100 for safety
  const startDate = parse(config.range.startDate, 'yyyy-MM-dd', new Date())

  let endDate: Date | null = null
  if (config.range.endType === 'end_date' && config.range.endDate) {
    endDate = parse(config.range.endDate, 'yyyy-MM-dd', new Date())
  }

  let current = startDate
  let count = 0

  const [startH, startM] = config.startTime.split(':').map(Number)
  const [endH, endM] = config.endTime.split(':').map(Number)

  const createOccurrence = (date: Date) => {
    const start = new Date(date)
    start.setHours(startH, startM, 0, 0)
    const end = new Date(date)
    end.setHours(endH, endM, 0, 0)
    if (isBefore(end, start)) {
      end.setDate(end.getDate() + 1)
    }
    return { start, end }
  }

  const refWeekStart = startOfWeek(startDate, { weekStartsOn: 0 })
  const refMonthStart = startOfMonth(startDate)

  while (count < maxOccurrences) {
    if (endDate && isAfter(startOfDay(current), startOfDay(endDate))) {
      break
    }

    let isValid = false

    switch (config.pattern) {
      case 'daily': {
        if (config.daily.type === 'every_days') {
          const daysDiff = differenceInDays(startOfDay(current), startOfDay(startDate))
          isValid = daysDiff % config.daily.days === 0
        } else {
          const day = getDay(current)
          isValid = day > 0 && day < 6
        }
        break
      }
      case 'weekly': {
        const weeksDiff = differenceInWeeks(startOfWeek(current, { weekStartsOn: 0 }), refWeekStart)
        if (weeksDiff % config.weekly.interval === 0) {
          isValid = config.weekly.days.includes(getDay(current))
        }
        break
      }
      case 'monthly': {
        const monthsDiff = differenceInMonths(startOfMonth(current), refMonthStart)
        if (monthsDiff % config.monthly.interval === 0) {
          if (config.monthly.type === 'specific_day') {
            isValid = getDate(current) === config.monthly.day
          } else {
            const targetDay = config.monthly.relativeDay
            const week = config.monthly.relativeWeek
            const monthStart = startOfMonth(current)
            let foundDate = setDay(monthStart, targetDay, { weekStartsOn: 0 })
            if (getMonth(foundDate) < getMonth(monthStart)) {
              foundDate = addWeeks(foundDate, 1)
            }
            if (week > 1) {
              foundDate = addWeeks(foundDate, week - 1)
            } else if (week === -1) {
              let nextFound = addWeeks(foundDate, 1)
              while (getMonth(nextFound) === getMonth(monthStart)) {
                foundDate = nextFound
                nextFound = addWeeks(nextFound, 1)
              }
            }
            isValid = isSameDay(current, foundDate)
          }
        }
        break
      }
      case 'yearly': {
        if (config.yearly.type === 'specific_date') {
          isValid =
            getMonth(current) === config.yearly.month - 1 && getDate(current) === config.yearly.day
        } else {
          if (getMonth(current) === config.yearly.month - 1) {
            const targetDay = config.yearly.relativeDay
            const week = config.yearly.relativeWeek
            const monthStart = startOfMonth(current)
            let foundDate = setDay(monthStart, targetDay, { weekStartsOn: 0 })
            if (getMonth(foundDate) < getMonth(monthStart)) {
              foundDate = addWeeks(foundDate, 1)
            }
            if (week > 1) {
              foundDate = addWeeks(foundDate, week - 1)
            } else if (week === -1) {
              let nextFound = addWeeks(foundDate, 1)
              while (getMonth(nextFound) === getMonth(monthStart)) {
                foundDate = nextFound
                nextFound = addWeeks(nextFound, 1)
              }
            }
            isValid = isSameDay(current, foundDate)
          }
        }
        break
      }
    }

    if (isValid && !isBefore(startOfDay(current), startOfDay(startDate))) {
      occurrences.push(createOccurrence(current))
      count++
    }

    current = addDays(current, 1)

    // Break after 5 years from start to avoid infinite loop
    if (isAfter(current, addYears(startDate, 5))) {
      break
    }
  }

  return occurrences
}

export function formatDuration(startStr: string, endStr: string) {
  if (!startStr || !endStr) return ''
  const [sh, sm] = startStr.split(':').map(Number)
  const [eh, em] = endStr.split(':').map(Number)
  let diffMinutes = eh * 60 + em - (sh * 60 + sm)
  if (diffMinutes < 0) diffMinutes += 24 * 60

  const h = Math.floor(diffMinutes / 60)
  const m = diffMinutes % 60
  if (h === 0) return `${m} minutos`
  if (m === 0) return `${h} ${h === 1 ? 'hora' : 'horas'}`
  return `${h},${((m / 60) * 10).toFixed(0)} horas`
}
