import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
  if (request.method !== 'POST') return json({ error: 'Method not allowed.' }, 405)

  const url = Deno.env.get('SUPABASE_URL')
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const setupKey = Deno.env.get('OWNER_SETUP_KEY')
  if (!url || !serviceKey || !setupKey) return json({ error: 'Owner setup is not configured on the server.' }, 503)

  try {
    const { email, setupKey: suppliedKey, redirectTo } = await request.json()
    if (typeof suppliedKey !== 'string' || suppliedKey.length < 20 || suppliedKey !== setupKey) {
      return json({ error: 'The one-time owner setup key is invalid.' }, 403)
    }
    if (typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return json({ error: 'Enter a valid email address.' }, 400)
    }
    const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
    const { data: owner, error: ownerError } = await admin.from('casil_owner').select('user_id').limit(1).maybeSingle()
    if (ownerError) throw ownerError
    if (owner) return json({ error: 'An owner account is already registered. New owner registration is closed.' }, 409)

    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: typeof redirectTo === 'string' ? redirectTo : undefined,
      data: { role: 'casil_owner' },
    })
    if (error) throw error
    const { error: claimError } = await admin.from('casil_owner').insert({ singleton: true, user_id: data.user.id })
    if (claimError) {
      await admin.auth.admin.deleteUser(data.user.id)
      if (claimError.code === '23505') return json({ error: 'An owner account was registered at the same time. Try signing in.' }, 409)
      throw claimError
    }
    return json({ message: 'Owner invitation sent. Open the email link to finish setting your password.' })
  } catch (error) {
    console.error('Owner signup failed:', error)
    return json({ error: error instanceof Error ? error.message : 'Could not create the owner account.' }, 400)
  }
})
