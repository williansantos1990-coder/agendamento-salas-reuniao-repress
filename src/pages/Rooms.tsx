import { useState, useEffect } from 'react'
import { MapPin, Users, Edit2, Trash2, Plus } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { api, Room } from '@/services/api'
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
import { Textarea } from '@/components/ui/textarea'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from '@/components/ui/card'
import { useToast } from '@/hooks/use-toast'

const roomSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  capacity: z.coerce.number().min(1, 'A capacidade deve ser pelo menos 1'),
  location: z.string().optional(),
  description: z.string().optional(),
})

type RoomFormData = z.infer<typeof roomSchema>

export default function Rooms() {
  const { toast } = useToast()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<RoomFormData>({
    resolver: zodResolver(roomSchema),
  })

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const data = await api.rooms.getAll()
      setRooms(data)
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao carregar salas' })
    }
  }

  const handleAddRoom = () => {
    setSelectedRoom(null)
    reset({ name: '', capacity: 4, location: '', description: '' })
    setIsModalOpen(true)
  }

  const handleEditRoom = (room: Room) => {
    setSelectedRoom(room)
    reset({
      name: room.name,
      capacity: room.capacity,
      location: room.location || '',
      description: room.description || '',
    })
    setIsModalOpen(true)
  }

  const handleDeleteRoom = async (id: string) => {
    if (
      !confirm(
        'Tem certeza que deseja remover esta sala? Todos os agendamentos nela serão perdidos.',
      )
    )
      return

    try {
      await api.rooms.delete(id)
      toast({ title: 'Sala removida com sucesso' })
      fetchRooms()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao remover sala' })
    }
  }

  const onSubmit = async (data: RoomFormData) => {
    try {
      if (selectedRoom) {
        await api.rooms.update(selectedRoom.id, data)
        toast({ title: 'Sala atualizada com sucesso!' })
      } else {
        await api.rooms.create(data)
        toast({ title: 'Sala adicionada com sucesso!' })
      }
      setIsModalOpen(false)
      fetchRooms()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao salvar sala' })
    }
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gerenciamento de Salas</h1>
          <p className="text-slate-500">Adicione ou edite os espaços disponíveis para reserva.</p>
        </div>
        <Button onClick={handleAddRoom}>
          <Plus className="w-4 h-4 mr-2" />
          Adicionar Sala
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Card key={room.id} className="flex flex-col">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">{room.name}</CardTitle>
              <CardDescription className="flex items-center mt-1">
                <MapPin className="w-3.5 h-3.5 mr-1" />
                {room.location || 'Local não especificado'}
              </CardDescription>
            </CardHeader>
            <CardContent className="flex-1 pb-4">
              <div className="flex items-center text-sm font-medium text-slate-700 bg-slate-100 w-fit px-2.5 py-1 rounded-md mb-3">
                <Users className="w-4 h-4 mr-2 text-primary" />
                Capacidade: {room.capacity} pessoas
              </div>
              <p className="text-sm text-slate-600 line-clamp-3">
                {room.description || 'Sem descrição.'}
              </p>
            </CardContent>
            <CardFooter className="pt-0 flex justify-end gap-2 border-t mt-auto px-6 py-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleEditRoom(room)}
                className="text-slate-600"
              >
                <Edit2 className="w-4 h-4 mr-1" /> Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteRoom(room.id)}
                className="text-destructive hover:text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="w-4 h-4 mr-1" /> Remover
              </Button>
            </CardFooter>
          </Card>
        ))}

        {rooms.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white border border-dashed rounded-lg">
            Nenhuma sala cadastrada ainda.
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>{selectedRoom ? 'Editar Sala' : 'Adicionar Nova Sala'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label htmlFor="name">Nome da Sala</Label>
              <Input id="name" placeholder="Ex: Sala de Reuniões 1" {...register('name')} />
              {errors.name && <p className="text-sm text-destructive">{errors.name.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidade</Label>
                <Input id="capacity" type="number" min="1" {...register('capacity')} />
                {errors.capacity && (
                  <p className="text-sm text-destructive">{errors.capacity.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Localização (Opcional)</Label>
              <Input id="location" placeholder="Ex: Andar 2, Bloco B" {...register('location')} />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Descrição (Opcional)</Label>
              <Textarea
                id="description"
                placeholder="Recursos da sala (TV, Quadro branco, etc)"
                className="resize-none h-20"
                {...register('description')}
              />
            </div>

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Salvando...' : 'Salvar Sala'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
