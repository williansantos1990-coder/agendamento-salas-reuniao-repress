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

    // Parse payload depending on source (Webhook vs Direct Invocation)
    if (payload.table === 'meetings' && payload.type) {
      action = payload.type === 'DELETE' ? 'CANCEL' : 'CREATE'
      const record = payload.type === 'DELETE' ? payload.old_record : payload.record
      title = record.title
      start_time = record.start_time
      end_time = record.end_time
      room_id = record.room_id
      user_id = record.user_id
      participants = record.participants || []
    } else if (payload.table === 'audit_logs' && payload.type === 'INSERT') {
      const record = payload.record
      action = record.action === 'CANCEL_MEETING' ? 'CANCEL' : 'CREATE'
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
    } else {
      throw new Error('Invalid payload format')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

    // Create admin client to query user data
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Retrieve the meeting owner's email from auth.users if we have the user_id
    if (user_id) {
      const { data: userAdmin, error: userError } = await supabase.auth.admin.getUserById(user_id)
      if (userAdmin?.user?.email) {
        requester_email = userAdmin.user.email
      } else {
        console.warn('Could not fetch user email for user_id:', user_id, userError)
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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || Deno.env.get('resend_api_key')

    // Process participants: handle arrays and comma-separated strings to treat them individually
    const rawParticipants = Array.isArray(participants)
      ? participants
      : participants
        ? [participants]
        : []
    const parsedParticipants = rawParticipants
      .flatMap((p: any) => {
        if (typeof p === 'string') {
          return p.split(',').map((e: string) => e.trim())
        }
        return []
      })
      .filter(Boolean)

    // Combine and deduplicate. We validate email formats so malformed ones won't break the delivery
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const toList = [requester_email, ...parsedParticipants].filter(Boolean)
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

    const subject =
      action === 'CREATE'
        ? `Confirmação de Agendamento: ${title}`
        : `Cancelamento de Agendamento: ${title}`

    const date = new Date(start_time).toLocaleDateString('pt-BR')
    const start = new Date(start_time).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const end = new Date(end_time).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: ${action === 'CREATE' ? '#0f172a' : '#ef4444'};">
          ${action === 'CREATE' ? 'Reunião Confirmada' : 'Reunião Cancelada'}
        </h2>
        <div style="margin-top: 20px;">
          <p><strong>Título:</strong> ${title}</p>
          <p><strong>Data:</strong> ${date}</p>
          <p><strong>Horário:</strong> ${start} às ${end}</p>
          <p><strong>Sala:</strong> ${room_name || 'Sala não especificada'}</p>
        </div>
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
        from: 'Agendamento <onboarding@resend.dev>',
        to: uniqueTo,
        subject,
        html,
      }),
    })

    const data = await res.json()

    if (!res.ok) {
      console.error('Resend API Error:', data)
      throw new Error(data.message || 'Error sending email')
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    console.error('Error processing notification:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
