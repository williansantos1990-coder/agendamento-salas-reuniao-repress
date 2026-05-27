import { useEffect } from 'react'
import { format, parse, setHours, setMinutes } from 'date-fns'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
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
}

export function MeetingModal({
  isOpen,
  setIsOpen,
  meeting,
  defaultDate,
  rooms,
  selectedRooms,
  onSuccess,
}: MeetingModalProps) {
  const { user } = useAuth()
  const { toast } = useToast()

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
      } else if (defaultDate) {
        reset({
          title: '',
          room_id: selectedRooms.length ? selectedRooms[0] : '',
          date: format(defaultDate.day, 'yyyy-MM-dd'),
          start_time: `${defaultDate.hour.toString().padStart(2, '0')}:00`,
          end_time: `${(defaultDate.hour + 1).toString().padStart(2, '0')}:00`,
          description: '',
        })
      }
    }
  }, [isOpen, meeting, defaultDate, selectedRooms, reset])

  const onSubmit = async (data: any) => {
    try {
      const baseDate = parse(data.date, 'yyyy-MM-dd', new Date())
      const [startH, startM] = data.start_time.split(':').map(Number)
      const [endH, endM] = data.end_time.split(':').map(Number)
      const startDateTime = setMinutes(setHours(baseDate, startH), startM)
      const endDateTime = setMinutes(setHours(baseDate, endH), endM)

      const isAvailable = await api.meetings.checkAvailability(
        data.room_id,
        startDateTime,
        endDateTime,
        meeting?.id,
      )
      if (!isAvailable) return toast({ variant: 'destructive', title: 'Sala Indisponível' })

      const payload: any = {
        title: data.title,
        description: data.description || null,
        room_id: data.room_id,
        user_id: user!.id,
        start_time: startDateTime.toISOString(),
        end_time: endDateTime.toISOString(),
      }

      if (meeting) {
        await api.meetings.update(meeting.id, payload)
        toast({ title: 'Atualizado com sucesso' })
      } else {
        await api.meetings.create(payload)
        toast({ title: 'Reserva criada' })
        const room = rooms.find((r: any) => r.id === data.room_id)
        supabase.functions.invoke('send-meeting-notification', {
          body: {
            action: 'CREATE',
            meeting: { ...payload, room_name: room?.name },
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
            <Input type="date" {...register('date')} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Início</Label>
              <Input type="time" {...register('start_time')} />
            </div>
            <div className="space-y-2">
              <Label>Término</Label>
              <Input type="time" {...register('end_time')} />
              {errors.end_time && (
                <p className="text-xs text-destructive">{errors.end_time.message as string}</p>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea {...register('description')} className="resize-none h-20" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Salvando...' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
