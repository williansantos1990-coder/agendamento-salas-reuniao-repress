import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const payload = await req.json()

    let action = ''
    let title = ''
    let start_time = ''
    let end_time = ''
    let room_id = ''
    let room_name = ''
    let user_id = ''
    let requester_email = ''
    let participants: string[] = []

    let old_title = ''
    let old_start_time = ''
    let old_end_time = ''
    let old_room_id = ''
    let old_room_name = ''
    let old_participants: string[] = []
    let has_old_record = false

    // Parse payload depending on source (Webhook vs Direct Invocation)
    if (payload.table === 'meetings' && payload.type) {
      action = payload.type === 'DELETE' ? 'CANCEL' : (payload.type === 'UPDATE' ? 'UPDATE' : 'CREATE')
      const record = payload.type === 'DELETE' ? payload.old_record : payload.record
      title = record.title
      start_time = record.start_time
      end_time = record.end_time
      room_id = record.room_id
      user_id = record.user_id
      participants = record.participants || []

      if (action === 'UPDATE' && payload.old_record) {
        has_old_record = true
        old_title = payload.old_record.title
        old_start_time = payload.old_record.start_time
        old_end_time = payload.old_record.end_time
        old_room_id = payload.old_record.room_id
        old_participants = payload.old_record.participants || []
      }
    } else if (payload.table === 'audit_logs' && payload.type === 'INSERT') {
      const record = payload.record
      action = record.action === 'CANCEL_MEETING' ? 'CANCEL' : (record.action === 'UPDATE_MEETING' || record.action === 'UPDATE_MEETING_SERIES' ? 'UPDATE' : 'CREATE')
      user_id = record.user_id
      const details = record.details || {}
      title = details.title
      start_time = details.start_time
      end_time = details.end_time
      room_id = details.room_id
      participants = details.participants || []
    } else if (payload.action && payload.meeting) {
      action = payload.action
      title = payload.meeting.title
      start_time = payload.meeting.start_time
      end_time = payload.meeting.end_time
      room_name = payload.meeting.room_name
      room_id = payload.meeting.room_id
      user_id = payload.meeting.user_id
      requester_email = payload.requester_email
      participants = payload.participants || []

      if (action === 'UPDATE' && payload.old_meeting) {
        has_old_record = true
        old_title = payload.old_meeting.title
        old_start_time = payload.old_meeting.start_time
        old_end_time = payload.old_meeting.end_time
        old_room_id = payload.old_meeting.room_id
        old_room_name = payload.old_meeting.room_name
        old_participants = payload.old_meeting.participants || []
      }
    } else {
      throw new Error('Invalid payload format')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Create admin client to query user data
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    let requester_name = 'O Organizador'

    // Retrieve the meeting owner's email from auth.users if we have the user_id
    if (user_id) {
      const { data: userAdmin, error: userError } = await supabase.auth.admin.getUserById(user_id)
      if (userAdmin?.user?.email) {
        requester_email = userAdmin.user.email
      } else {
        console.warn('Could not fetch user email for user_id:', user_id, userError)
      }

      // Fetch from profiles to resolve full_name context if needed
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('full_name, email')
        .eq('id', user_id)
        .single()

      if (profileData) {
        if (profileData.full_name) requester_name = profileData.full_name
        if (profileData.email && !requester_email) requester_email = profileData.email
      } else {
        console.warn('Could not fetch user profile for user_id:', user_id, profileError)
      }
    }

    // Retrieve the room name if not provided (e.g., from webhooks)
    if (!room_name && room_id) {
      const { data: roomData } = await supabase
        .from('rooms')
        .select('name')
        .eq('id', room_id)
        .single()
      if (roomData?.name) {
        room_name = roomData.name
      }
    }

    // Retrieve the old room name if applicable
    if (action === 'UPDATE' && has_old_record) {
      if (!old_room_name && old_room_id) {
        if (old_room_id === room_id) {
          old_room_name = room_name
        } else {
          const { data: oldRoomData } = await supabase
            .from('rooms')
            .select('name')
            .eq('id', old_room_id)
            .single()
          if (oldRoomData?.name) {
            old_room_name = oldRoomData.name
          }
        }
      }
    }

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || Deno.env.get('resend_api_key')

    // Process participants: handle arrays and comma-separated strings to treat them individually
    const parseParticipants = (input: any): string[] => {
      if (!input) return []
      if (Array.isArray(input)) {
        return input.flatMap(parseParticipants)
      }
      if (typeof input === 'string') {
        // Handle postgres array syntax: {"a@b.com","c@d.com"} or {a@b.com,c@d.com}
        const cleaned = input.replace(/^\{|\}$/g, '')
        return cleaned
          .split(',')
          .map((e) => e.replace(/(^"|"$)/g, '').trim())
          .filter(Boolean)
      }
      return []
    }

    const parsedParticipants = parseParticipants(participants)
    const oldParsedParticipants = parseParticipants(old_participants)

    // Combine and deduplicate. We validate email formats so malformed ones won't break the delivery
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const toList = [requester_email, ...parsedParticipants].filter(Boolean)
    
    // In case of an update, we might want to notify people who were removed from the meeting
    if (action === 'UPDATE' && has_old_record) {
      toList.push(...oldParsedParticipants)
    }

    const uniqueTo = [...new Set(toList)].filter((email: string) => emailRegex.test(email))

    if (uniqueTo.length === 0) {
      console.warn('No valid recipient emails found. Skipping email send.')
      return new Response(JSON.stringify({ message: 'No valid recipients' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set. Mocking email send to:', uniqueTo)
      return new Response(JSON.stringify({ message: 'Success (mocked)', to: uniqueTo }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let subject = ''
    let titleText = ''
    let titleColor = ''

    if (action === 'CREATE') {
      subject = `Confirmação de Reserva: ${title}`
      titleText = 'Reunião Confirmada'
      titleColor = '#0f172a'
    } else if (action === 'UPDATE') {
      subject = `Alteração de Reserva: ${title}`
      titleText = 'Reunião Alterada'
      titleColor = '#eab308'
    } else {
      subject = `Cancelamento de Reserva: ${title}`
      titleText = 'Reunião Cancelada'
      titleColor = '#ef4444'
    }

    const timeZone = 'America/Sao_Paulo'
    const formatDate = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleDateString('pt-BR', { timeZone }) : 'Data não especificada'
    const formatTime = (dateStr: string) => dateStr ? new Date(dateStr).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone,
    }) : '--:--'

    const date = formatDate(start_time)
    const start = formatTime(start_time)
    const end = formatTime(end_time)

    let changesHtml = ''
    if (action === 'UPDATE' && has_old_record) {
      const changes = []
      
      if (old_title && title !== old_title) {
        changes.push(`<li><strong>Título:</strong> De "${old_title}" para "${title}"</li>`)
      }
      
      const oldDate = formatDate(old_start_time)
      if (old_start_time && date !== oldDate) {
        changes.push(`<li><strong>Data:</strong> De ${oldDate} para ${date}</li>`)
      }

      const oldStart = formatTime(old_start_time)
      const oldEnd = formatTime(old_end_time)
      if ((old_start_time && start !== oldStart) || (old_end_time && end !== oldEnd)) {
        changes.push(`<li><strong>Horário:</strong> De ${oldStart} às ${oldEnd} para ${start} às ${end}</li>`)
      }

      if (old_room_id && room_id !== old_room_id) {
        changes.push(`<li><strong>Sala:</strong> De "${old_room_name || 'Sala não especificada'}" para "${room_name || 'Sala não especificada'}"</li>`)
      }

      const p1 = [...parsedParticipants].sort().join(',')
      const p2 = [...oldParsedParticipants].sort().join(',')
      if (p1 !== p2) {
        changes.push(`<li><strong>Participantes:</strong> A lista de convidados foi alterada</li>`)
      }

      if (changes.length > 0) {
        changesHtml = `
          <div style="margin-top: 15px; background: #fefce8; padding: 15px; border: 1px solid #fef08a; border-radius: 6px;">
            <p style="margin-top: 0; font-weight: bold; color: #854d0e;">Alterações realizadas:</p>
            <ul style="margin-bottom: 0; color: #a16207;">
              ${changes.join('\n')}
            </ul>
          </div>
        `
      }
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: ${titleColor};">
          ${titleText}
        </h2>
        <div style="margin-top: 20px;">
          <p><strong>Título:</strong> ${title}</p>
          <p><strong>Organizador:</strong> ${requester_name} ${requester_email ? `(${requester_email})` : ''}</p>
          <p><strong>Data:</strong> ${date}</p>
          <p><strong>Horário:</strong> ${start} às ${end}</p>
          <p><strong>Sala:</strong> ${room_name || 'Sala não especificada'}</p>
        </div>
        ${changesHtml}
        ${action === 'UPDATE' && !changesHtml ? '<p style="color: #666; margin-top: 15px;">A reserva foi atualizada. Não houve mudanças nos detalhes principais.</p>' : ''}
        ${action === 'CANCEL' ? '<p style="color: #666; margin-top: 15px;">A reunião especificada foi removida do calendário.</p>' : ''}
        <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
        <p style="color: #64748b; font-size: 14px;">
          Este é um email automático do sistema de Agendamento de Salas.
        </p>
      </div>
    `

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: 'Agendamento de Salas <reservas@ti.repress.com.br>',
        to: uniqueTo,
        subject,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend API Error:', data)
      // Return 200 so we don't crash or cause infinite webhook retries, but log clearly
      return new Response(JSON.stringify({ message: 'Failed to send via Resend', error: data }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error processing notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
