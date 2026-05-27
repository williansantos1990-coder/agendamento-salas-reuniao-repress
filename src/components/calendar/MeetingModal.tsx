import { useState, useEffect } from 'react'
import { format, parse, setHours, setMinutes } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { RefreshCw } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
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
import { api, Meeting, Room } from '@/services/api'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'
import { RecurrenceDialog } from './RecurrenceDialog'
import { RecurrenceConfig, generateOccurrences } from '@/lib/recurrence'
import { DeleteRecurringModal } from './DeleteRecurringModal'

const schema = z
  .object({
    title: z.string().min(1, 'Obrigatório'),
    room_id: z.string().min(1, 'Selecione a sala'),
    date: z.string(),
    start_time: z.string(),
    end_time: z.string(),
    description: z.string().optional(),
  })
  .refine((d) => d.start_time < d.end_time, {
    message: 'Término deve ser posterior ao início',
    path: ['end_time'],
  })

interface MeetingModalProps {
  isOpen: boolean
  setIsOpen: (o: boolean) => void
  meeting: Meeting | null
  defaultDate: { day: Date; hour: number } | null
  rooms: Room[]
  selectedRooms: string[]
  onSuccess: () => void
  onDeleteRequest?: (meeting: Meeting) => void
}

export function MeetingModal({
  isOpen,
  setIsOpen,
  meeting,
  defaultDate,
  rooms,
  selectedRooms,
  onSuccess,
  onDeleteRequest,
}: MeetingModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()

  const [showRecurrence, setShowRecurrence] = useState(false)
  const [recurrenceConfig, setRecurrenceConfig] = useState<RecurrenceConfig | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      room_id: '',
      date: '',
      start_time: '09:00',
      end_time: '10:00',
      description: '',
    },
  })

  const selectedRoomId = watch('room_id')
  const selectedRoomDetails = rooms?.find((r: any) => r.id === selectedRoomId)

  useEffect(() => {
    if (isOpen) {
      if (meeting) {
        reset({
          title: meeting.title,
          room_id: meeting.room_id,
          date: format(new Date(meeting.start_time), 'yyyy-MM-dd'),
          start_time: format(new Date(meeting.start_time), 'HH:mm'),
          end_time: format(new Date(meeting.end_time), 'HH:mm'),
          description: meeting.description || '',
        })
        setRecurrenceConfig(null)
      } else if (defaultDate) {
        reset({
          title: '',
          room_id: selectedRooms.length ? selectedRooms[0] : '',
          date: format(defaultDate.day, 'yyyy-MM-dd'),
          start_time: `${defaultDate.hour.toString().padStart(2, '0')}:00`,
          end_time: `${(defaultDate.hour + 1).toString().padStart(2, '0')}:00`,
          description: '',
        })
        setRecurrenceConfig(null)
      }
    }
  }, [isOpen, meeting, defaultDate, selectedRooms, reset])

  const handleRecurrenceSave = (config: RecurrenceConfig | null) => {
    setRecurrenceConfig(config)
    setShowRecurrence(false)
    if (config) {
      reset({
        ...watch(),
        date: config.range.startDate,
        start_time: config.startTime,
        end_time: config.endTime,
      })
    }
  }

  const handleDeleteClick = () => {
    if (meeting?.recurrence_id) {
      setShowDeleteModal(true)
    } else {
      if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return
      performDelete(false)
    }
  }

  const performDelete = async (deleteSeries: boolean) => {
    if (!meeting) return
    try {
      if (deleteSeries && meeting.recurrence_id) {
        await api.meetings.deleteSeries(meeting.recurrence_id)
      } else {
        await api.meetings.delete(meeting.id)
      }

      const room = rooms.find((r: any) => r.id === meeting.room_id)
      supabase.functions.invoke('send-meeting-notification', {
        body: {
          action: 'CANCEL',
          meeting: {
            title: meeting.title,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            room_name: room?.name || '',
          },
          requester_email: user?.email,
        },
      })

      toast({ title: deleteSeries ? 'Série cancelada' : 'Agendamento cancelado' })
      setIsOpen(false)
      setShowDeleteModal(false)
      onSuccess()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao cancelar' })
    }
  }

  const onSubmit = async (data: any) => {
    try {
      let occurrences: { startDateTime: Date; endDateTime: Date }[] = []

      if (recurrenceConfig) {
        const generated = generateOccurrences(recurrenceConfig)
        occurrences = generated.map((o) => ({ startDateTime: o.start, endDateTime: o.end }))
        if (occurrences.length === 0) {
          return toast({
            variant: 'destructive',
            title: 'Nenhuma data válida gerada pela recorrência.',
          })
        }
      } else {
        const [startH, startM] = data.start_time.split(':').map(Number)
        const [endH, endM] = data.end_time.split(':').map(Number)
        const currentDate = parse(data.date, 'yyyy-MM-dd', new Date())
        const startDateTime = setMinutes(setHours(currentDate, startH), startM)
        const endDateTime = setMinutes(setHours(currentDate, endH), endM)
        occurrences = [{ startDateTime, endDateTime }]
      }

      for (const occ of occurrences) {
        const isAvailable = await api.meetings.checkAvailability(
          data.room_id,
          occ.startDateTime,
          occ.endDateTime,
          meeting?.id,
        )
        if (!isAvailable) {
          const unavailableDate = format(occ.startDateTime, 'dd/MM/yyyy HH:mm')
          return toast({
            variant: 'destructive',
            title: 'Conflito de horário detectado em uma ou mais datas da recorrência.',
            description: `A sala já está reservada em ${unavailableDate}`,
          })
        }
      }

      const recurrence_id = recurrenceConfig ? crypto.randomUUID() : null

      const payloads = occurrences.map((occ) => ({
        title: data.title,
        description: data.description || null,
        room_id: data.room_id,
        user_id: user!.id,
        start_time: occ.startDateTime.toISOString(),
        end_time: occ.endDateTime.toISOString(),
        recurrence_id,
      }))

      if (meeting) {
        await api.meetings.update(meeting.id, payloads[0])
        toast({ title: 'Atualizado com sucesso' })
      } else {
        await api.meetings.createBulk(payloads)
        toast({ title: recurrenceConfig ? 'Reservas recorrentes criadas' : 'Reserva criada' })
        const room = rooms.find((r: any) => r.id === data.room_id)
        supabase.functions.invoke('send-meeting-notification', {
          body: {
            action: 'CREATE',
            meeting: { ...payloads[0], room_name: room?.name },
            requester_email: user?.email,
          },
        })
      }
      setIsOpen(false)
      onSuccess()
    } catch (e) {
      toast({ variant: 'destructive', title: 'Erro ao salvar' })
    }
  }

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{meeting ? 'Editar Reserva' : 'Nova Reserva'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Título</Label>
              <Input {...register('title')} />
              {errors.title && (
                <p className="text-xs text-destructive">{errors.title.message as string}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Sala</Label>
              <Controller
                control={control}
                name="room_id"
                render={({ field }) => (
                  <Select onValueChange={field.onChange} value={field.value}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione uma sala" />
                    </SelectTrigger>
                    <SelectContent>
                      {rooms?.map((r: any) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name} ({r.capacity} pessoas)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.room_id && (
                <p className="text-xs text-destructive">{errors.room_id.message as string}</p>
              )}
              {selectedRoomId && (
                <div className="mt-2 text-sm text-muted-foreground bg-muted/50 p-3 rounded-md">
                  {selectedRoomDetails?.description ? (
                    <p className="whitespace-pre-line">{selectedRoomDetails.description}</p>
                  ) : (
                    <p className="italic">Nenhuma informação adicional para esta sala.</p>
                  )}
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label>Data</Label>
              <Input type="date" {...register('date')} disabled={!!recurrenceConfig} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Início</Label>
                <Input type="time" {...register('start_time')} disabled={!!recurrenceConfig} />
              </div>
              <div className="space-y-2">
                <Label>Término</Label>
                <Input type="time" {...register('end_time')} disabled={!!recurrenceConfig} />
                {errors.end_time && (
                  <p className="text-xs text-destructive">{errors.end_time.message as string}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea {...register('description')} className="resize-none h-20" />
            </div>

            {!meeting && (
              <div className="flex items-center justify-between py-2 border rounded-md px-3 bg-muted/20">
                <div className="flex items-center space-x-2 text-sm">
                  <RefreshCw className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {recurrenceConfig
                      ? 'Esta é uma reunião recorrente'
                      : 'Repetir este compromisso?'}
                  </span>
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setShowRecurrence(true)}
                >
                  {recurrenceConfig ? 'Editar recorrência' : 'Tornar recorrente'}
                </Button>
              </div>
            )}

            <DialogFooter className={meeting ? 'sm:justify-between' : ''}>
              {meeting && (
                <Button type="button" variant="destructive" onClick={handleDeleteClick}>
                  Excluir
                </Button>
              )}
              <div className="flex flex-col-reverse sm:flex-row gap-2 sm:gap-0 sm:space-x-2 mt-4 sm:mt-0">
                <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : 'Salvar'}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {showRecurrence && (
        <RecurrenceDialog
          isOpen={showRecurrence}
          onClose={() => setShowRecurrence(false)}
          onSave={handleRecurrenceSave}
          initialConfig={recurrenceConfig}
          baseDate={watch('date') || format(new Date(), 'yyyy-MM-dd')}
          baseStart={watch('start_time') || '09:00'}
          baseEnd={watch('end_time') || '10:00'}
        />
      )}

      {showDeleteModal && meeting && (
        <DeleteRecurringModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          onConfirm={performDelete}
          meetingTitle={meeting.title}
        />
      )}
    </>
  )
}
