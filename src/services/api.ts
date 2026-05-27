import { supabase } from '@/lib/supabase/client'

export interface Room {
  id: string
  name: string
  capacity: number
  location: string | null
  description: string | null
}

export interface Meeting {
  id: string
  title: string
  description: string | null
  start_time: string
  end_time: string
  room_id: string
  user_id: string
  recurrence_id?: string | null
  rooms?: Room
  profiles?: Profile
}

export interface Profile {
  id: string
  full_name: string | null
  avatar_url: string | null
  email?: string | null
  role: string
}

export const api = {
  rooms: {
    async getAll() {
      const { data, error } = await supabase.from('rooms').select('*').order('name')
      if (error) throw error
      return data as Room[]
    },
    async create(room: Omit<Room, 'id'>) {
      const { data, error } = await supabase.from('rooms').insert(room).select().single()
      if (error) throw error
      return data as Room
    },
    async update(id: string, room: Partial<Room>) {
      const { data, error } = await supabase
        .from('rooms')
        .update(room)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Room
    },
    async delete(id: string) {
      const { error } = await supabase.from('rooms').delete().eq('id', id)
      if (error) throw error
    },
  },
  meetings: {
    async getForDateRange(start: Date, end: Date) {
      const { data, error } = await supabase
        .from('meetings')
        .select('*, rooms(*), profiles(*)')
        .gte('end_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time')

      if (error) throw error
      return data as Meeting[]
    },
    async checkAvailability(roomId: string, start: Date, end: Date, excludeMeetingId?: string) {
      let query = supabase
        .from('meetings')
        .select('id')
        .eq('room_id', roomId)
        .lt('start_time', end.toISOString())
        .gt('end_time', start.toISOString())

      if (excludeMeetingId) {
        query = query.neq('id', excludeMeetingId)
      }

      const { data, error } = await query
      if (error) throw error
      return data.length === 0
    },
    async create(meeting: Omit<Meeting, 'id' | 'rooms' | 'profiles'>) {
      const { data, error } = await supabase.from('meetings').insert(meeting).select().single()
      if (error) throw error
      return data as Meeting
    },
    async getSeries(recurrenceId: string) {
      const { data, error } = await supabase
        .from('meetings')
        .select('*')
        .eq('recurrence_id', recurrenceId)
      if (error) throw error
      return data as Meeting[]
    },
    async createBulk(meetings: Omit<Meeting, 'id' | 'rooms' | 'profiles'>[]) {
      const { data, error } = await supabase.from('meetings').insert(meetings).select()
      if (error) throw error
      return data as Meeting[]
    },
    async updateBulk(meetings: Partial<Meeting>[]) {
      const { data, error } = await supabase.from('meetings').upsert(meetings).select()
      if (error) throw error
      return data as Meeting[]
    },
    async update(id: string, meeting: Partial<Meeting>) {
      const { data, error } = await supabase
        .from('meetings')
        .update(meeting)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Meeting
    },
    async delete(id: string) {
      const { error } = await supabase.from('meetings').delete().eq('id', id)
      if (error) throw error
    },
    async deleteSeries(recurrenceId: string) {
      const { error } = await supabase.from('meetings').delete().eq('recurrence_id', recurrenceId)
      if (error) throw error
    },
  },
  profiles: {
    async get(id: string) {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single()
      if (error) throw error
      return data as Profile
    },
    async update(id: string, updates: Partial<Profile>) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
  },
  users: {
    async getAll() {
      const { data, error } = await supabase.from('profiles').select('*').order('full_name')
      if (error) throw error
      return data as Profile[]
    },
    async create(userData: { email: string; full_name: string; role: string; password?: string }) {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'CREATE', ...userData },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data?.user
    },
    async update(id: string, updates: Partial<Profile>) {
      const { data, error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id)
        .select()
        .single()
      if (error) throw error
      return data as Profile
    },
    async delete(id: string) {
      const { data, error } = await supabase.functions.invoke('manage-users', {
        body: { action: 'DELETE', userId: id },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      return data
    },
  },
}
