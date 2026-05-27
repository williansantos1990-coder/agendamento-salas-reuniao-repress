import { useState, useEffect } from 'react'
import { api, Profile } from '@/services/api'
import { useToast } from '@/hooks/use-toast'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Badge } from '@/components/ui/badge'
import { Edit2, Trash2, Plus, Loader2, AlertCircle } from 'lucide-react'
import { useOutletContext } from 'react-router-dom'
import { LayoutContextType } from '@/components/Layout'

export default function Users() {
  const { profile: currentUserProfile } = useOutletContext<LayoutContextType>()
  const { toast } = useToast()

  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)

  const [isFormOpen, setIsFormOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)

  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    role: 'user',
    password: '',
  })

  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (currentUserProfile?.role === 'admin') {
      fetchUsers()
    }
  }, [currentUserProfile])

  const fetchUsers = async () => {
    try {
      const data = await api.users.getAll()
      setUsers(data)
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar usuários',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const handleOpenForm = (user?: Profile) => {
    if (user) {
      setEditingUser(user)
      setFormData({
        full_name: user.full_name || '',
        email: user.email || '',
        role: user.role,
        password: '',
      })
    } else {
      setEditingUser(null)
      setFormData({
        full_name: '',
        email: '',
        role: 'user',
        password: '',
      })
    }
    setIsFormOpen(true)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.full_name || !formData.email || (!editingUser && !formData.password)) {
      toast({ title: 'Preencha os campos obrigatórios', variant: 'destructive' })
      return
    }

    setIsSubmitting(true)
    try {
      if (editingUser) {
        await api.users.update(editingUser.id, {
          full_name: formData.full_name,
          role: formData.role,
        })
        toast({ title: 'Usuário atualizado com sucesso' })
      } else {
        await api.users.create({
          full_name: formData.full_name,
          email: formData.email,
          role: formData.role,
          password: formData.password,
        })
        toast({ title: 'Usuário criado com sucesso' })
      }
      setIsFormOpen(false)
      fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!userToDelete) return
    setIsDeleting(true)
    try {
      await api.users.delete(userToDelete.id)
      toast({ title: 'Usuário excluído com sucesso' })
      setDeleteConfirmOpen(false)
      fetchUsers()
    } catch (error: any) {
      toast({
        title: 'Erro ao excluir',
        description: error.message,
        variant: 'destructive',
      })
    } finally {
      setIsDeleting(false)
    }
  }

  if (currentUserProfile && currentUserProfile.role !== 'admin') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-4 p-6">
        <AlertCircle className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-semibold text-slate-800">Acesso Negado</h2>
        <p>Você não tem permissão para acessar esta página.</p>
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 animate-fade-in-up">
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Usuários</h1>
          <p className="text-slate-500">Gerencie os acessos e permissões do sistema.</p>
        </div>
        <Button onClick={() => handleOpenForm()}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Usuário
        </Button>
      </div>

      <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader className="bg-slate-50">
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Perfil</TableHead>
                <TableHead className="w-[100px] text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto text-slate-400" />
                  </TableCell>
                </TableRow>
              ) : users.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="h-24 text-center text-slate-500">
                    Nenhum usuário encontrado.
                  </TableCell>
                </TableRow>
              ) : (
                users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell className="font-medium">{u.full_name || '—'}</TableCell>
                    <TableCell>{u.email || '—'}</TableCell>
                    <TableCell>
                      <Badge
                        variant={u.role === 'admin' ? 'default' : 'secondary'}
                        className={
                          u.role === 'admin' ? '' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                        }
                      >
                        {u.role === 'admin' ? 'Administrador' : 'Usuário'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1 sm:gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleOpenForm(u)}
                          className="h-8 w-8 text-slate-500 hover:text-primary"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setUserToDelete(u)
                            setDeleteConfirmOpen(true)
                          }}
                          className="h-8 w-8 text-slate-500 hover:text-destructive"
                          disabled={currentUserProfile?.id === u.id}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingUser ? 'Editar Usuário' : 'Novo Usuário'}</DialogTitle>
            <DialogDescription>
              {editingUser
                ? 'Atualize as permissões e dados do usuário.'
                : 'Crie um novo acesso ao sistema.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSave} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="full_name">Nome Completo</Label>
              <Input
                id="full_name"
                value={formData.full_name}
                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                placeholder="Ex: João da Silva"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Ex: joao@empresa.com"
                required
                disabled={!!editingUser}
              />
              {editingUser && (
                <p className="text-xs text-slate-500">O email não pode ser alterado.</p>
              )}
            </div>
            {!editingUser && (
              <div className="space-y-2">
                <Label htmlFor="password">Senha Inicial</Label>
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  placeholder="Mínimo 6 caracteres"
                  minLength={6}
                  required
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="role">Perfil de Acesso</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o perfil" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Usuário</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Salvar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir Usuário</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir o usuário <strong>{userToDelete?.full_name}</strong>?
              Esta ação removerá o acesso ao sistema e todas as suas reuniões associadas. Esta ação
              não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-4">
            <Button
              variant="outline"
              onClick={() => setDeleteConfirmOpen(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
