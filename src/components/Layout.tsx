import { useState, useEffect } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import {
  Calendar as CalendarIcon,
  MapPin,
  User,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
} from 'lucide-react'
import { format, addMonths, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { useAuth } from '@/hooks/use-auth'
import { api, Room, Profile } from '@/services/api'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'
import { getRoomColor } from '@/lib/constants'

// Context to pass down to main content areas
export interface LayoutContextType {
  selectedDate: Date
  setSelectedDate: (date: Date) => void
  selectedRooms: string[]
  rooms: Room[]
  profile: Profile | null
}

export default function Layout() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedRooms, setSelectedRooms] = useState<string[]>([])
  const [profile, setProfile] = useState<Profile | null>(null)
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    fetchRooms()
    if (user) {
      api.profiles.get(user.id).then(setProfile).catch(console.error)
    }
  }, [user])

  const fetchRooms = async () => {
    try {
      const data = await api.rooms.getAll()
      setRooms(data)
      setSelectedRooms(data.map((r) => r.id))
    } catch (error) {
      console.error('Error fetching rooms:', error)
    }
  }

  const toggleRoom = (roomId: string) => {
    setSelectedRooms((prev) =>
      prev.includes(roomId) ? prev.filter((id) => id !== roomId) : [...prev, roomId],
    )
  }

  const handleLogout = async () => {
    await signOut()
    navigate('/login')
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50">
        <Sidebar className="border-r border-slate-200">
          <SidebarHeader className="border-b border-slate-200 px-4 py-4">
            <div className="flex items-center gap-2 font-bold text-primary text-lg">
              <CalendarIcon className="h-6 w-6" />
              <span>Reserva de Salas</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="flex flex-col gap-6 p-4 pt-6">
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/'}>
                  <Link to="/">
                    <CalendarIcon />
                    <span>Calendário</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.pathname === '/rooms'}>
                  <Link to="/rooms">
                    <MapPin />
                    <span>Gerenciar Salas</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {profile?.role === 'admin' && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={location.pathname === '/users'}>
                    <Link to="/users">
                      <Users />
                      <span>Gerenciar Usuários</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>

            {/* Room Filters */}
            <div className="flex flex-col gap-3">
              <h3 className="text-sm font-semibold text-slate-500 uppercase tracking-wider px-2">
                Salas
              </h3>
              <div className="space-y-1">
                {rooms.map((room, idx) => {
                  const colorClasses = getRoomColor(idx)
                  const bgColor = colorClasses.split(' ')[0].replace('bg-', '')

                  return (
                    <div
                      key={room.id}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-slate-100 transition-colors cursor-pointer"
                      onClick={() => toggleRoom(room.id)}
                    >
                      <div
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          selectedRooms.includes(room.id)
                            ? `${colorClasses.split(' ')[0]} border-transparent`
                            : 'border-slate-300 bg-white'
                        }`}
                      >
                        {selectedRooms.includes(room.id) && (
                          <CheckSquare className="w-3 h-3 text-white" />
                        )}
                      </div>
                      <span className="text-sm text-slate-700 truncate flex-1">{room.name}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          </SidebarContent>
        </Sidebar>

        <div className="flex flex-col flex-1 w-full min-w-0">
          <header className="h-16 flex-shrink-0 border-b border-slate-200 bg-white flex items-center justify-between px-4 sm:px-6 shadow-sm z-10">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="md:hidden" />

              {/* Contextual Header based on route */}
              {location.pathname === '/' ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedDate(new Date())}
                    className="hidden sm:flex"
                  >
                    Hoje
                  </Button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDate(subMonths(selectedDate, 1))}
                      className="h-8 w-8"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedDate(addMonths(selectedDate, 1))}
                      className="h-8 w-8"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                  <h2 className="text-xl font-medium text-slate-800 capitalize min-w-[150px]">
                    {format(selectedDate, 'MMMM yyyy', { locale: ptBR })}
                  </h2>
                </>
              ) : (
                <h2 className="text-xl font-medium text-slate-800">
                  {location.pathname === '/rooms'
                    ? 'Gerenciar Salas'
                    : location.pathname === '/users'
                      ? 'Gerenciar Usuários'
                      : 'Meu Perfil'}
                </h2>
              )}
            </div>

            <div className="flex items-center gap-4">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                    <Avatar className="h-9 w-9 border border-slate-200">
                      <AvatarImage
                        src={user?.user_metadata?.avatar_url}
                        alt={user?.user_metadata?.full_name || 'Avatar'}
                      />
                      <AvatarFallback className="bg-primary/10 text-primary">
                        {user?.email?.charAt(0).toUpperCase() ?? 'U'}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {user?.user_metadata?.full_name || 'Usuário'}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">{user?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link to="/profile" className="w-full cursor-pointer flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Meu Perfil & Segurança
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive focus:bg-destructive/10 cursor-pointer"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Sair
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </header>

          <main className="flex-1 overflow-auto bg-slate-50">
            <Outlet
              context={
                {
                  selectedDate,
                  setSelectedDate,
                  selectedRooms,
                  rooms,
                  profile,
                } satisfies LayoutContextType
              }
            />
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}
