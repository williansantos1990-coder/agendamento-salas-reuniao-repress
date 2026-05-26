import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { corsHeaders } from '../_shared/cors.ts'

interface NotificationPayload {
  action: 'CREATE' | 'CANCEL'
  meeting: {
    title: string
    start_time: string
    end_time: string
    room_name: string
  }
  requester_email: string
  participants: string[]
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { action, meeting, requester_email, participants } =
      (await req.json()) as NotificationPayload

    const RESEND_API_KEY = Deno.env.get('resend_api_key') || Deno.env.get('RESEND_API_KEY')

    // Combine requester and participants, filter out falsy values, and ensure uniqueness
    const toList = [requester_email, ...(participants || [])].filter(Boolean)
    const uniqueTo = [...new Set(toList)]

    if (!RESEND_API_KEY) {
      console.warn('RESEND_API_KEY not set. Mocking email send to:', uniqueTo)
      return new Response(JSON.stringify({ message: 'Success (mocked)', to: uniqueTo }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const subject =
      action === 'CREATE'
        ? `Confirmação de Agendamento: ${meeting.title}`
        : `Cancelamento de Agendamento: ${meeting.title}`

    const date = new Date(meeting.start_time).toLocaleDateString('pt-BR')
    const start = new Date(meeting.start_time).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })
    const end = new Date(meeting.end_time).toLocaleTimeString('pt-BR', {
      hour: '2-digit',
      minute: '2-digit',
    })

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 8px;">
        <h2 style="color: ${action === 'CREATE' ? '#0f172a' : '#ef4444'};">
          ${action === 'CREATE' ? 'Reunião Confirmada' : 'Reunião Cancelada'}
        </h2>
        <div style="margin-top: 20px;">
          <p><strong>Título:</strong> ${meeting.title}</p>
          <p><strong>Data:</strong> ${date}</p>
          <p><strong>Horário:</strong> ${start} às ${end}</p>
          <p><strong>Sala:</strong> ${meeting.room_name}</p>
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

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
