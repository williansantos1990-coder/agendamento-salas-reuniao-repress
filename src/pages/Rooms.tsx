import { useState, useEffect } from 'react'
import { MapPin, Users, Edit2, Trash2, Plus, Image as ImageIcon, X } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'

import { api, Room } from '@/services/api'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/use-auth'
import { supabase } from '@/lib/supabase/client'
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

import sala2Img from '@/assets/sala2-358f3.jpg'

const roomSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  capacity: z.coerce.number().min(1, 'A capacidade deve ser pelo menos 1'),
  location: z.string().optional(),
  description: z.string().optional(),
})

type RoomFormData = z.infer<typeof roomSchema>

export const getRoomImageUrl = (url: string | null | undefined) => {
  if (url === 'src/assets/sala2-358f3.jpg') return sala2Img
  return url
}

export default function Rooms() {
  const { toast } = useToast()
  const { user } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  const [selectedImageFile, setSelectedImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)

  useEffect(() => {
    const checkAdmin = async () => {
      if (!user) return

      const adminEmails = [
        'willian.santos1990@gmail.com',
        'gil.araujo@repress.com.br',
        'douglas.manoel@repress.com.br',
      ]

      if (user.email && adminEmails.includes(user.email)) {
        setIsAdmin(true)
        return
      }

      try {
        const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()

        if ((data as any)?.role === 'admin') {
          setIsAdmin(true)
        }
      } catch (e) {
        console.error('Error fetching user role:', e)
      }
    }
    checkAdmin()
  }, [user])

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
    setSelectedImageFile(null)
    setImagePreview(null)
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
    setSelectedImageFile(null)
    setImagePreview(room.image_url || null)
    setIsModalOpen(true)
  }

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        toast({ variant: 'destructive', title: 'Formato de imagem inválido' })
        return
      }
      setSelectedImageFile(file)
      setImagePreview(URL.createObjectURL(file))
    }
  }

  const removeImage = () => {
    setImagePreview(null)
    setSelectedImageFile(null)
  }

  const handleDeleteRoom = async (id: string) => {
    if (
      !confirm(
        'Tem certeza que deseja remover esta sala? Todos os agendamentos nela serão perdidos.',
      )
    )
      return

    const room = rooms.find((r) => r.id === id)
    try {
      if (room?.image_url?.includes('supabase.co')) {
        const urlParts = room.image_url.split('/room-images/')
        if (urlParts.length === 2) {
          const filePath = urlParts[1].split('?')[0]
          await supabase.storage.from('room-images').remove([filePath])
        }
      }
      await api.rooms.delete(id)
      toast({ title: 'Sala removida com sucesso' })
      fetchRooms()
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao remover sala' })
    }
  }

  const onSubmit = async (data: RoomFormData) => {
    try {
      let imageUrl = imagePreview

      if (selectedImageFile) {
        const fileExt = selectedImageFile.name.split('.').pop()
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`
        const { error: uploadError } = await supabase.storage
          .from('room-images')
          .upload(fileName, selectedImageFile)

        if (uploadError) throw uploadError

        const { data: publicUrlData } = supabase.storage.from('room-images').getPublicUrl(fileName)

        imageUrl = publicUrlData.publicUrl
      }

      if (selectedRoom?.image_url && selectedRoom.image_url !== imageUrl) {
        if (selectedRoom.image_url.includes('supabase.co')) {
          const urlParts = selectedRoom.image_url.split('/room-images/')
          if (urlParts.length === 2) {
            const filePath = urlParts[1].split('?')[0]
            await supabase.storage.from('room-images').remove([filePath])
          }
        }
      }

      const roomPayload = { ...data, image_url: imageUrl }

      if (selectedRoom) {
        await api.rooms.update(selectedRoom.id, roomPayload)
        toast({ title: 'Sala atualizada com sucesso!' })
      } else {
        await api.rooms.create(roomPayload)
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
          <p className="text-slate-500">
            {isAdmin
              ? 'Adicione ou edite os espaços disponíveis para reserva.'
              : 'Veja os espaços disponíveis para reserva.'}
          </p>
        </div>
        {isAdmin && (
          <Button onClick={handleAddRoom}>
            <Plus className="w-4 h-4 mr-2" />
            Adicionar Sala
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {rooms.map((room) => (
          <Card key={room.id} className="flex flex-col overflow-hidden">
            {room.image_url ? (
              <div className="w-full h-48 bg-slate-100 shrink-0 border-b">
                <img
                  src={getRoomImageUrl(room.image_url)}
                  alt={room.name}
                  className="w-full h-full object-cover"
                />
              </div>
            ) : (
              <div className="w-full h-48 bg-slate-50 shrink-0 flex flex-col items-center justify-center text-slate-400 border-b">
                <ImageIcon className="w-10 h-10 mb-2 opacity-30" />
                <span className="text-xs font-medium uppercase tracking-wider">Sem Imagem</span>
              </div>
            )}
            <CardHeader className="pb-3 pt-4">
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
            {isAdmin && (
              <CardFooter className="pt-0 flex justify-end gap-2 border-t mt-auto px-6 py-4 bg-slate-50/50">
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
            )}
          </Card>
        ))}

        {rooms.length === 0 && (
          <div className="col-span-full py-12 text-center text-slate-500 bg-white border border-dashed rounded-lg">
            Nenhuma sala cadastrada ainda.
          </div>
        )}
      </div>

      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="sm:max-w-[480px]">
          <DialogHeader>
            <DialogTitle>{selectedRoom ? 'Editar Sala' : 'Adicionar Nova Sala'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>Imagem da Sala</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <div className="relative w-32 h-24 rounded-md overflow-hidden border shrink-0 bg-slate-100">
                    <img
                      src={getRoomImageUrl(imagePreview)}
                      alt="Preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-1 hover:bg-black/70 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <div className="w-32 h-24 rounded-md border border-dashed flex items-center justify-center bg-slate-50 text-slate-400 shrink-0">
                    <ImageIcon className="w-6 h-6" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    key={selectedImageFile ? selectedImageFile.name : 'empty-file'}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleImageChange}
                    className="cursor-pointer file:cursor-pointer text-sm h-9"
                  />
                  <p className="text-xs text-slate-500 mt-1.5">
                    Formatos suportados: JPG, PNG, WEBP.
                  </p>
                </div>
              </div>
            </div>

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
