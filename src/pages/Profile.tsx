import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { User, ShieldCheck } from 'lucide-react'

import { useAuth } from '@/hooks/use-auth'
import { api } from '@/services/api'
import { supabase } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useToast } from '@/hooks/use-toast'

const profileSchema = z.object({
  full_name: z.string().min(2, 'Nome muito curto'),
})

const passwordSchema = z
  .object({
    new_password: z.string().min(6, 'Mínimo de 6 caracteres'),
    confirm_password: z.string(),
  })
  .refine((data) => data.new_password === data.confirm_password, {
    message: 'As senhas não coincidem',
    path: ['confirm_password'],
  })

export default function Profile() {
  const { user } = useAuth()
  const { toast } = useToast()
  const [isLoadingProfile, setIsLoadingProfile] = useState(false)
  const [isLoadingPassword, setIsLoadingPassword] = useState(false)

  const profileForm = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
  })

  const passwordForm = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
  })

  useEffect(() => {
    if (user) {
      loadProfile()
    }
  }, [user])

  const loadProfile = async () => {
    try {
      const data = await api.profiles.get(user!.id)
      profileForm.reset({ full_name: data.full_name || '' })
    } catch (error) {
      console.error(error)
    }
  }

  const onProfileSubmit = async (data: z.infer<typeof profileSchema>) => {
    setIsLoadingProfile(true)
    try {
      await api.profiles.update(user!.id, { full_name: data.full_name })

      // Update auth metadata as well for the token
      await supabase.auth.updateUser({
        data: { full_name: data.full_name },
      })

      toast({ title: 'Perfil atualizado com sucesso' })
    } catch (error) {
      toast({ variant: 'destructive', title: 'Erro ao atualizar perfil' })
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const onPasswordSubmit = async (data: z.infer<typeof passwordSchema>) => {
    setIsLoadingPassword(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: data.new_password,
      })

      if (error) throw error

      toast({ title: 'Senha atualizada com sucesso' })
      passwordForm.reset()
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Erro', description: error.message })
    } finally {
      setIsLoadingPassword(false)
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Meu Perfil</h1>
        <p className="text-slate-500">
          Gerencie suas informações pessoais e configurações de segurança.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Dados Pessoais */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <User className="w-5 h-5 text-primary" />
              <CardTitle>Dados Pessoais</CardTitle>
            </div>
            <CardDescription>Atualize seu nome de exibição no sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label>E-mail (Login)</Label>
                <Input disabled value={user?.email || ''} className="bg-slate-50" />
                <p className="text-xs text-slate-500">O e-mail não pode ser alterado.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="full_name">Nome Completo</Label>
                <Input id="full_name" {...profileForm.register('full_name')} />
                {profileForm.formState.errors.full_name && (
                  <p className="text-sm text-destructive">
                    {profileForm.formState.errors.full_name.message}
                  </p>
                )}
              </div>
              <Button type="submit" disabled={isLoadingProfile} className="mt-2">
                {isLoadingProfile ? 'Salvando...' : 'Salvar Alterações'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Segurança */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2 mb-1">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              <CardTitle>Segurança</CardTitle>
            </div>
            <CardDescription>Altere sua senha de acesso ao sistema.</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="new_password">Nova Senha</Label>
                <Input
                  id="new_password"
                  type="password"
                  {...passwordForm.register('new_password')}
                />
                {passwordForm.formState.errors.new_password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.new_password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirm_password">Confirmar Nova Senha</Label>
                <Input
                  id="confirm_password"
                  type="password"
                  {...passwordForm.register('confirm_password')}
                />
                {passwordForm.formState.errors.confirm_password && (
                  <p className="text-sm text-destructive">
                    {passwordForm.formState.errors.confirm_password.message}
                  </p>
                )}
              </div>
              <Button
                type="submit"
                variant="secondary"
                disabled={isLoadingPassword}
                className="mt-2"
              >
                {isLoadingPassword ? 'Atualizando...' : 'Atualizar Senha'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
