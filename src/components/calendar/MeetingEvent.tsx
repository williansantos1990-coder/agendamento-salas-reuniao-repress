import { useState } from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { MapPin, User as UserIcon, Clock, Trash2, Edit2 } from 'lucide-react'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { getRoomColor } from '@/lib/constants'
import { useAuth } from '@/hooks/use-auth'
import { api, Meeting, Room } from '@/services/api'
import { supabase } from '@/lib/supabase/client'
import { useToast } from '@/hooks/use-toast'

interface MeetingEventProps {
  meeting: Meeting
  viewType: 'absolute' | 'flow'
  style?: React.CSSProperties
  rooms: Room[]
  onEdit: (meeting: Meeting) => void
  onDelete: () => void
}

export function MeetingEvent({
  meeting,
  viewType,
  style,
  rooms,
  onEdit,
  onDelete,
}: MeetingEventProps) {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isOpen, setIsOpen] = useState(false)

  const isOwner = meeting.user_id === user?.id
  const start = new Date(meeting.start_time)
  const end = new Date(meeting.end_time)

  const roomIndex = rooms.findIndex((r) => r.id === meeting.room_id)
  const colorClass = getRoomColor(roomIndex >= 0 ? roomIndex : 0)

  const handleDelete = async () => {
    if (!confirm('Tem certeza que deseja cancelar este agendamento?')) return
    try {
      await api.meetings.delete(meeting.id)
      supabase.functions.invoke('send-meeting-notification', {
        body: {
          action: 'CANCEL',
          meeting: {
            title: meeting.title,
            start_time: meeting.start_time,
            end_time: meeting.end_time,
            room_name: meeting.rooms?.name || '',
          },
          requester_email: user?.email,
          participants: meeting.participants || [],
        },
      })
      toast({ title: 'Agendamento cancelado' })
      setIsOpen(false)
      onDelete()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao cancelar' })
    }
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <div
          onClick={(e) => e.stopPropagation()}
          className={cn(
            'cursor-pointer overflow-hidden transition-all',
            colorClass,
            isOwner ? 'border-[1.5px] border-black/20' : 'border border-white/50',
            viewType === 'absolute'
              ? 'absolute inset-x-1 rounded-md px-2 py-1 shadow-sm hover:shadow-md z-10 text-xs'
              : 'relative rounded px-1.5 py-0.5 mb-1 truncate leading-tight shadow-sm hover:shadow-md text-[10px]',
          )}
          style={style}
        >
          {viewType === 'absolute' ? (
            <div className="h-full flex flex-col">
              <div className="font-semibold truncate leading-tight flex items-center gap-1">
                <span className="truncate">{meeting.title}</span>
                {isOwner && <UserIcon className="w-3 h-3 flex-shrink-0 opacity-70" />}
              </div>
              <div className="opacity-80 truncate text-[10px] leading-tight mt-0.5">
                {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-1">
              <span className="font-medium whitespace-nowrap opacity-80">
                {format(start, 'HH:mm')}
              </span>
              <span className="truncate font-semibold">{meeting.title}</span>
            </div>
          )}
        </div>
      </PopoverTrigger>
      <PopoverContent
        className="w-80 p-0 shadow-lg border-slate-200"
        align="start"
        side="right"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cn('h-2 w-full rounded-t-md', colorClass.split(' ')[0])} />
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
              <span className="capitalize">
                {format(start, "EEEE, d 'de' MMMM", { locale: ptBR })}
              </span>
            </p>
            <p className="text-sm text-slate-500 ml-6">
              {format(start, 'HH:mm')} - {format(end, 'HH:mm')}
            </p>
          </div>
          <div className="space-y-2 text-sm">
            <div className="flex items-start">
              <MapPin className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
              <span>{meeting.rooms?.name || 'Sem sala'}</span>
            </div>
            <div className="flex items-start">
              <UserIcon className="w-4 h-4 mr-2 text-slate-400 mt-0.5" />
              <span>{meeting.profiles?.full_name || 'Usuário'}</span>
            </div>
            {meeting.description && (
              <div className="pt-2 border-t mt-2 text-slate-600 text-sm whitespace-pre-wrap">
                {meeting.description}
              </div>
            )}
          </div>
          {isOwner && (
            <div className="flex justify-end gap-2 pt-3 border-t mt-3">
              <Button variant="outline" size="sm" onClick={handleDelete}>
                <Trash2 className="w-4 h-4 mr-1" /> Excluir
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  setIsOpen(false)
                  onEdit(meeting)
                }}
              >
                <Edit2 className="w-4 h-4 mr-1" /> Editar
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
