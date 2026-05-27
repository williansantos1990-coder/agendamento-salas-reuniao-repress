import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  addDays,
} from 'date-fns'
import { supabase } from '@/lib/supabase/client'
import { api, Meeting, Room } from '@/services/api'
import { useToast } from '@/hooks/use-toast'

import { CalendarHeader } from '@/components/calendar/CalendarHeader'
import { MonthGrid } from '@/components/calendar/MonthGrid'
import { TimeGrid } from '@/components/calendar/TimeGrid'
import { MeetingModal } from '@/components/calendar/MeetingModal'

export type CalendarView = 'day' | 'week' | 'month'

export interface LayoutContextType {
  selectedDate: Date
  selectedRooms: string[]
  rooms: Room[]
}

export default function Calendar() {
  const { selectedDate, selectedRooms, rooms } = useOutletContext<LayoutContextType>()
  const { toast } = useToast()

  const [view, setView] = useState<CalendarView>('week')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [modalDefaultDate, setModalDefaultDate] = useState<{ day: Date; hour: number } | null>(null)

  useEffect(() => {
    if (selectedDate) setCurrentDate(selectedDate)
  }, [selectedDate])

  const dateRange = useMemo(() => {
    if (view === 'day') return { start: startOfDay(currentDate), end: endOfDay(currentDate) }
    if (view === 'week')
      return {
        start: startOfWeek(currentDate, { weekStartsOn: 1 }),
        end: endOfWeek(currentDate, { weekStartsOn: 1 }),
      }
    return {
      start: startOfWeek(startOfMonth(currentDate), { weekStartsOn: 1 }),
      end: endOfWeek(endOfMonth(currentDate), { weekStartsOn: 1 }),
    }
  }, [currentDate, view])

  const fetchMeetings = async () => {
    try {
      const data = await api.meetings.getForDateRange(dateRange.start, addDays(dateRange.end, 1))
      setMeetings(data)
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar agendamentos' })
    }
  }

  useEffect(() => {
    fetchMeetings()
    const channel = supabase
      .channel('meetings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, fetchMeetings)
      .subscribe()
    return () => {
      supabase.removeChannel(channel)
    }
  }, [dateRange.start.toISOString(), dateRange.end.toISOString()])

  const filteredMeetings = useMemo(
    () => meetings.filter((m) => selectedRooms.includes(m.room_id)),
    [meetings, selectedRooms],
  )

  const handleGridClick = (day: Date, hour: number) => {
    setModalDefaultDate({ day, hour })
    setSelectedMeeting(null)
    setIsModalOpen(true)
  }

  const handleEdit = (m: Meeting) => {
    setSelectedMeeting(m)
    setIsModalOpen(true)
  }

  return (
    <div className="flex flex-col h-full bg-white relative">
      <CalendarHeader
        currentDate={currentDate}
        setCurrentDate={setCurrentDate}
        view={view}
        setView={setView}
      />

      <div className="flex-1 overflow-hidden">
        {view === 'month' ? (
          <MonthGrid
            currentDate={currentDate}
            dateRange={dateRange}
            meetings={filteredMeetings}
            onGridClick={handleGridClick}
            onEdit={handleEdit}
            onDelete={fetchMeetings}
            rooms={rooms}
          />
        ) : (
          <TimeGrid
            currentDate={currentDate}
            dateRange={dateRange}
            view={view}
            meetings={filteredMeetings}
            onGridClick={handleGridClick}
            onEdit={handleEdit}
            onDelete={fetchMeetings}
            rooms={rooms}
          />
        )}
      </div>

      <MeetingModal
        isOpen={isModalOpen}
        setIsOpen={setIsModalOpen}
        meeting={selectedMeeting}
        defaultDate={modalDefaultDate}
        rooms={rooms}
        selectedRooms={selectedRooms}
        onSuccess={fetchMeetings}
      />
    </div>
  )
}
