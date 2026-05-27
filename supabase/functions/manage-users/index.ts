import 'jsr:@supabase/functions-js/edge-runtime.d.ts'
import { createClient } from 'jsr:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, x-supabase-client-platform, apikey, content-type',
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? ''
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    
    // Auth client as service role
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Verify if the calling user is authenticated and is an admin
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing Authorization header')
    }
    
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: userError } = await supabase.auth.getUser(token)
    
    if (userError || !user) {
      throw new Error('Unauthorized')
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()
      
    if (profile?.role !== 'admin') {
      throw new Error('Forbidden: Admins only')
    }

    const payload = await req.json()
    const { action, userId, email, password, full_name, role } = payload

    if (action === 'CREATE') {
      const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
        email,
        password: password || 'ChangeMe123!',
        email_confirm: true,
        user_metadata: { full_name }
      })

      if (createError) throw createError

      // The trigger handle_new_user will automatically create the profile.
      // We just need to ensure the correct role is set.
      if (role && role !== 'user') {
        await supabase.from('profiles').update({ role }).eq('id', newUser.user.id)
      }

      return new Response(JSON.stringify({ user: newUser.user }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    } 
    else if (action === 'DELETE') {
      if (!userId) throw new Error('userId is required for deletion')
      
      const { error: deleteError } = await supabase.auth.admin.deleteUser(userId)
      if (deleteError) throw deleteError

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
    else {
      throw new Error('Invalid action')
    }

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
