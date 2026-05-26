import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import {
  format,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameDay,
  parse,
  setHours,
  setMinutes,
  isBefore,
  isAfter,
  startOfDay,
  addHours,
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Plus, Clock, MapPin, User, Trash2, Edit2 } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { LayoutContextType } from '@/components/Layout'
import { api, Meeting } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { getRoomColor } from '@/lib/constants'
import { cn } from '@/lib/utils'
import { useToast } from '@/hooks/use-toast'

import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { ScrollArea } from '@/components/ui/scroll-area'

const HOURS = Array.from({ length: 15 }, (_, i) => i + 7) // 7:00 to 21:00
const CALENDAR_START_HOUR = 7
const HOUR_HEIGHT = 64 // px

const meetingSchema = z
  .object({
    title: z.string().min(1, 'Título é obrigatório'),
    room_id: z.string().min(1, 'Selecione uma sala'),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    description: z.string().optional(),
  })
  .refine(
    (data) => {
      return data.start_time < data.end_time
    },
    {
      message: 'O horário de término deve ser posterior ao início',
      path: ['end_time'],
    },
  )

type MeetingFormData = z.infer<typeof meetingSchema>

export default function Calendar() {
  const { selectedDate, selectedRooms, rooms } = useOutletContext<LayoutContextType>()
  const { user } = useAuth()
  const { toast } = useToast()

  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)
  const [popoverOpenId, setPopoverOpenId] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    control,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<MeetingFormData>({
    resolver: zodResolver(meetingSchema),
    defaultValues: {
      date: format(new Date(), 'yyyy-MM-dd'),
      start_time: '09:00',
      end_time: '10:00',
      description: '',
    },
  })

  // Calculate week bounds
  const startDate = startOfWeek(selectedDate, { weekStartsOn: 1 }) // Start on Monday
  const endDate = endOfWeek(selectedDate, { weekStartsOn: 1 })
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(startDate, i))

  useEffect(() => {
    fetchMeetings()

    // Realtime subscription
    const channel = supabase
      .channel('meetings_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'meetings' }, () => {
        fetchMeetings()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [startDate.toISOString(), endDate.toISOString()]) // Refetch when week changes

  const fetchMeetings = async () => {
    try {
      setIsLoading(true)
      const data = await api.meetings.getForDateRange(startDate, addDays(endDate, 1))
      setMeetings(data)
    } catch (error) {
      console.error(error)
      toast({ variant: 'destructive', title: 'Erro ao carregar agendamentos' })
    } finally {
      setIsLoading(false)
    }
  }

  const filteredMeetings = useMemo(() => {
    return meetings.filter((m) => selectedRooms.includes(m.room_id))
  }, [meetings, selectedRooms])

  const handleGridClick = (day: Date, hour: number) => {
    reset({
      title: '',
      date: format(day, 'yyyy-MM-dd'),
      start_time: `${hour.toString().padStart(2, '0')}:00`,
      end_time: `${(hour + 1).toString().padStart(2, '0')}:00`,
      room_id: selectedRooms.length > 0 ? selectedRooms[0] : '',
      description: '',
    })
    setSelectedMeeting(null)
    setIsModalOpen(true)
  }

  const handleEditMeeting = (meeting: Meeting) => {
    setPopoverOpenId(null)
    setSelectedMeeting(meeting)
    const start = new Date(meeting.start_time)
    const end = new Date(meeting.end_time)

    reset({
      title: meeting.title,
      room_id: meeting.room_id,
      date: format(start, 'yyyy-MM-dd'),
      start_time: format(start, 'HH:mm'),
      end_time: format(end, 'HH:mm'),
      description: meeting.description || '',
    })
    setIsModalOpen(true)
  }

  const handleDeleteMeeting = async (id: string) => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return

    try {
      await api.meetings.delete(id)
      toast({ title: 'Agendamento cancelado' })
      setPopoverOpenId(null)
      fetchMeetings()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao cancelar' })
    }
  }

  const onSubmit = async (data: MeetingFormData) => {
    try {
      const baseDate = parse(data.date, 'yyyy-MM-dd', new Date())

      const [startH, startM] = data.start_time.split(':').map(Number)
      const startDateTime = setMinutes(setHours(baseDate, startH), startM)

      const [endH, endM] = data.end_time.split(':').map(Number)
      const endDateTime = setMinutes(setHours(baseDate, endH), endM)

      // Validate availability
      const isAvailable = await api.meetings.checkAvailability(
        data.room_id,
        startDateTime,
        endDateTime,
        selectedMeeting?.id,
      )

      if (!isAvailable) {
        toast({
          variant: 'destructive',
          title: 'Sala Indisponível',
          description: 'Já existe um agendamento para esta sala neste horário.',
        })
        return
      }

      const payload = {
        title: data.title,
        description: data.description || null,
        room_id: data.room_id,
        user_id: user!.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
      }

      if (selectedMeeting) {
        await api.meetings.update(selectedMeeting.id, payload)
        toast({ title: 'Agendamento atualizado com sucesso!' })
      } else {
        await api.meetings.create(payload)
        toast({ title: 'Sala reservada com sucesso!' })
      }

      setIsModalOpen(false)
      fetchMeetings()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar agendamento' })
    }
  }

  // Helper to render events
  const renderEventsForDay = (day: Date) => {
    const dayEvents = filteredMeetings.filter((m) => isSameDay(new Date(m.start_time), day))

    return dayEvents.map((meeting) => {
      const start = new Date(meeting.start_time)
      const end = new Date(meeting.end_time)

      const startMinutes = (start.getHours() - CALENDAR_START_HOUR) * 60 + start.getMinutes()
      const durationMinutes = (end.getTime() - start.getTime()) / (1000 * 60)

      // Calculate top and height
      const top = (startMinutes / 60) * HOUR_HEIGHT
      const height = (durationMinutes / 60) * HOUR_HEIGHT

      // Find room color index
      const roomIndex = rooms.findIndex((r) => r.id === meeting.room_id)
      const colorClass = getRoomColor(roomIndex >= 0 ? roomIndex : 0)
      const isOwner = meeting.user_id === user?.id

      return (
        <Popover
          key={meeting.id}
          open={popoverOpenId === meeting.id}
          onOpenChange={(o) => setPopoverOpenId(o ? meeting.id : null)}
        >
          <PopoverTrigger asChild>
            <div
              className={cn(
                'absolute inset-x-1 rounded-md px-2 py-1 text-xs overflow-hidden cursor-pointer shadow-sm hover:shadow-md transition-all',
                colorClass,
                isOwner ? 'border-2 border-black/20' : 'border border-white/50',
                height < 40 ? 'flex items-center gap-1' : 'flex flex-col gap-0.5',
              )}
              style={{ top: `${top}px`, height: `${height}px`, zIndex: 10 }}
            >
              <div className="font-semibold truncate leading-tight flex items-center gap-1">
                <span className="truncate">{meeting.title}</span>
                {isOwner && <User className="w-3 h-3 flex-shrink-0 opacity-70" />}
              </div>
              <div className="opacity-80 truncate text-[10px] leading-tight">
                {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
              </div>
            </div>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="start" side="right">
            <div className={cn('h-2 w-full', colorClass.split(' ')[0])} />
            <div className="p-4 space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h4 className="font-semibold text-base">{meeting.title}</h4>
                  {isOwner && (
                    <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full whitespace-nowrap">
                      Sua reserva
                    </span>
                  )}
                </div>
                <p className="text-sm text-slate-500 flex items-center mt-1">
                  <Clock className="w-4 h-4 mr-2" />
                  {format(start, "EEEE, d 'de' MMMM", { locale: ptBR })}
                  <br />
                  {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
                </p>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex items-start">
                  <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
                  <span>{meeting.rooms?.name}</span>
                </div>
                <div className="flex items-start">
                  <User className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
                  <span>{meeting.profiles?.full_name || 'Usuário'}</span>
                </div>
                {meeting.description && (
                  <div className="pt-2 border-t mt-2 text-slate-600">{meeting.description}</div>
                )}
              </div>

              {isOwner && (
                <div className="flex justify-end gap-2 pt-3 border-t mt-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleDeleteMeeting(meeting.id)}
                  >
                    <Trash2 className="w-4 h-4 mr-1" /> Excluir
                  </Button>
                  <Button size="sm" onClick={() => handleEditMeeting(meeting)}>
                    <Edit2 className="w-4 h-4 mr-1" /> Editar
                  </Button>
                </div>
              )}
            </div>
          </PopoverContent>
        </Popover>
      )
    })
  }

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Calendar Header */}
      <div className="flex border-b border-slate-200">
        <div className="w-16 flex-shrink-0 border-r border-slate-200" />{' '}
        {/* Time column header spacer */}
        <div className="flex flex-1">
          {weekDays.map((day, i) => (
            <div
              key={i}
              className={cn(
                'flex-1 flex flex-col items-center justify-center py-3 border-r border-slate-200 last:border-r-0',
                isSameDay(day, new Date()) ? 'bg-primary/5 text-primary' : 'text-slate-700',
              )}
            >
              <span className="text-xs uppercase font-medium text-slate-500 mb-1">
                {format(day, 'EEE', { locale: ptBR })}
              </span>
              <span
                className={cn(
                  'text-2xl font-normal w-10 h-10 flex items-center justify-center rounded-full',
                  isSameDay(day, new Date()) ? 'bg-primary text-white font-medium' : '',
                )}
              >
                {format(day, 'd')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <ScrollArea className="flex-1">
        <div className="flex h-full min-h-[800px] relative">
          {/* Time Column */}
          <div className="w-16 flex-shrink-0 border-r border-slate-200 bg-white z-20">
            {HOURS.map((hour) => (
              <div
                key={hour}
                className="relative flex justify-end pr-2 text-xs text-slate-400"
                style={{ height: HOUR_HEIGHT }}
              >
                <span className="absolute -top-2.5 bg-white px-1">{hour}:00</span>
              </div>
            ))}
          </div>

          {/* Days Columns */}
          <div className="flex flex-1 relative z-0">
            {weekDays.map((day, dayIdx) => (
              <div
                key={dayIdx}
                className="flex-1 border-r border-slate-100 last:border-r-0 relative"
              >
                {/* Horizontal grid lines */}
                {HOURS.map((hour, i) => (
                  <div
                    key={i}
                    className="border-b border-slate-100 w-full cursor-pointer hover:bg-slate-50/50 transition-colors"
                    style={{ height: HOUR_HEIGHT }}
                    onClick={() => handleGridClick(day, hour)}
                  />
                ))}

                {/* Render Events */}
                {renderEventsForDay(day)}
              </div>
            ))}
          </div>
        </div>
      </ScrollArea>

      {/* Modal - New/Edit Meeting */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedMeeting ? 'Editar Reserva' : 'Nova Reserva de Sala'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="title">Título da Reunião</Label>
              <Input id="title" placeholder="Ex: Reunião de Planejamento" {...register('title')} />
              {errors.title && <p className="text-sm text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label htmlFor="room_id">Sala</Label>
              <Controller
                control={control}
                name="room_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sala" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          {room.name} ({room.capacity} pessoas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.room_id && (
                <p className="text-sm text-destructive">{errors.room_id.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="date">Data</Label>
              <Input id="date" type="date" {...register('date')} />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="start_time">Início</Label>
                <Input id="start_time" type="time" {...register('start_time')} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="end_time">Término</Label>
                <Input id="end_time" type="time" {...register('end_time')} />
                {errors.end_time && (
                  <p className="text-sm text-destructive">{errors.end_time.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea
                id="description"
                placeholder="Detalhes ou pauta da reunião..."
                className="resize-none h-20"
                {...register('description')}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Reserva'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Floating Add Button for mobile */}
      <Button
        className="md:hidden absolute bottom-6 right-6 h-14 w-14 rounded-full shadow-lg"
        size="icon"
        onClick={() => handleGridClick(selectedDate, 9)}
      >
        <Plus className="h-6 w-6" />
      </Button>
    </div>
  )
}
