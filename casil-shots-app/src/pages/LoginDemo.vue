<script setup>
import { onMounted, onUnmounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { backendReady, ownerSignupUrl, requireSupabase, supabase } from '../lib/supabase.js'

const router = useRouter()
const route = useRoute()
const mode = ref('login')
const email = ref('')
const password = ref('')
const passwordAgain = ref('')
const setupKey = ref('')
const showPassword = ref(false)
const showPasswordAgain = ref(false)
const busy = ref(false)
const message = ref('')
const errorMessage = ref('')
let authSubscription

const appRedirect = (flow = 'reset') => `${window.location.origin}${window.location.pathname}?flow=${flow}#/login-demo`
function setMode(next) {
  mode.value = next
  message.value = ''
  errorMessage.value = ''
}

async function login() {
  busy.value = true; message.value = ''; errorMessage.value = ''
  try {
    const client = requireSupabase()
    const { error } = await client.auth.signInWithPassword({ email: email.value, password: password.value })
    if (error) throw error
    const { data: owner, error: ownerError } = await client.from('casil_owner').select('user_id').maybeSingle()
    if (ownerError || !owner) {
      await client.auth.signOut()
      throw new Error('This account is not registered as the Casil Shots owner.')
    }
    await router.push('/media-manager-demo')
  } catch (error) { errorMessage.value = error.message || 'Unable to sign in.' }
  finally { busy.value = false }
}

async function createOwner() {
  busy.value = true; message.value = ''; errorMessage.value = ''
  try {
    if (!backendReady || !ownerSignupUrl) throw new Error('Owner account setup is not connected yet. Complete the Supabase setup first.')
    const response = await fetch(ownerSignupUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: import.meta.env.VITE_SUPABASE_ANON_KEY },
      body: JSON.stringify({ email: email.value, setupKey: setupKey.value, redirectTo: appRedirect('invite') }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.error || 'Unable to create the owner account.')
    message.value = result.message
    setMode('login')
    message.value = result.message
    setupKey.value = ''
  } catch (error) { errorMessage.value = error.message || 'Unable to create the owner account.' }
  finally { busy.value = false }
}

async function sendRecovery() {
  busy.value = true; message.value = ''; errorMessage.value = ''
  try {
    const { error } = await requireSupabase().auth.resetPasswordForEmail(email.value, { redirectTo: appRedirect('reset') })
    if (error) throw error
    message.value = 'If that email belongs to an account, a secure password reset link is on its way.'
  } catch (error) { errorMessage.value = error.message || 'Unable to send the recovery email.' }
  finally { busy.value = false }
}

async function updatePassword() {
  busy.value = true; message.value = ''; errorMessage.value = ''
  try {
    if (password.value.length < 12) throw new Error('Use a password with at least 12 characters.')
    if (password.value !== passwordAgain.value) throw new Error('The passwords do not match.')
    const { error } = await requireSupabase().auth.updateUser({ password: password.value })
    if (error) throw error
    password.value = ''; passwordAgain.value = ''; message.value = 'Password updated. You can now sign in.'
    await supabase.auth.signOut()
    setMode('login')
    message.value = 'Password updated. You can now sign in.'
  } catch (error) { errorMessage.value = error.message || 'Unable to update password.' }
  finally { busy.value = false }
}

onMounted(async () => {
  if (route.query.mode === 'create') mode.value = 'create'
  if (!supabase) return
  const { data } = await supabase.auth.getSession()
  const callbackType = new URLSearchParams(window.location.search).get('type')
  const flow = new URLSearchParams(window.location.search).get('flow')
  if (data.session && (['recovery', 'invite', 'signup'].includes(callbackType) || ['reset', 'invite'].includes(flow))) mode.value = 'reset'
  authSubscription = supabase.auth.onAuthStateChange((event) => {
    const params = new URLSearchParams(window.location.search)
    if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && (['invite', 'recovery'].includes(params.get('type')) || ['reset', 'invite'].includes(params.get('flow'))))) mode.value = 'reset'
  }).data.subscription
})
onUnmounted(() => authSubscription?.unsubscribe())
</script>

<template>
  <section class="page-hero owner-auth-hero">
    <span class="eyebrow">Casil Shots  |  Owner access</span>
    <h1>Your private<br/>studio.</h1>
    <p>Sign in to manage your photography and video library. Private uploads are available after secure storage setup.</p>
  </section>
  <section class="section owner-auth-section">
    <form class="login-card owner-auth-card" @submit.prevent="mode === 'login' ? login() : mode === 'create' ? createOwner() : mode === 'recover' ? sendRecovery() : updatePassword()">
      <span class="eyebrow">{{ mode === 'create' ? 'One-time setup' : mode === 'recover' ? 'Account recovery' : mode === 'reset' ? 'Choose a new password' : 'Owner sign in' }}</span>
      <h2>{{ mode === 'create' ? 'Create owner account' : mode === 'recover' ? 'Reset your password' : mode === 'reset' ? 'Set your password' : 'Welcome back.' }}</h2>
      <p v-if="!backendReady" class="notice">Authentication and private storage are not connected yet. Configure the Supabase project first.</p>
      <div v-else-if="mode === 'create' && !ownerSignupUrl" class="notice">The secure owner setup endpoint is not configured yet.</div>
      <p v-if="mode === 'create'" class="muted">The first owner is created using a one-time setup key. An invitation will be sent to your email to verify ownership and choose your password.</p>
      <p v-else-if="mode === 'login'" class="muted">Use the owner email and password you registered.</p>
      <div class="field">
        <label for="owner-email">Email</label>
        <input id="owner-email" v-model.trim="email" type="email" autocomplete="email" required :disabled="busy" />
      </div>
      <div v-if="mode === 'create'" class="field">
        <label for="owner-setup-key">One-time owner setup key</label>
        <div class="password-row"><input id="owner-setup-key" v-model="setupKey" :type="showPassword ? 'text' : 'password'" autocomplete="off" minlength="20" required /><button type="button" class="password-eye" :aria-label="showPassword ? 'Hide setup key' : 'Show setup key'" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button></div>
        <small class="muted">This key is configured privately in the Supabase Edge Function and used once.</small>
      </div>
      <template v-if="mode === 'login' || mode === 'reset'">
        <div class="field">
          <label for="owner-password">{{ mode === 'reset' ? 'New password' : 'Password' }}</label>
          <div class="password-row"><input id="owner-password" v-model="password" :type="showPassword ? 'text' : 'password'" :autocomplete="mode === 'reset' ? 'new-password' : 'current-password'" :minlength="mode === 'reset' ? 12 : undefined" :required="mode === 'reset'" /><button type="button" class="password-eye" :aria-label="showPassword ? 'Hide password' : 'Show password'" @click="showPassword = !showPassword">{{ showPassword ? 'Hide' : 'Show' }}</button></div>
        </div>
      </template>
      <div v-if="mode === 'reset'" class="field">
        <label for="owner-password-again">Confirm new password</label>
        <div class="password-row"><input id="owner-password-again" v-model="passwordAgain" :type="showPasswordAgain ? 'text' : 'password'" autocomplete="new-password" minlength="12" required /><button type="button" class="password-eye" :aria-label="showPasswordAgain ? 'Hide password' : 'Show password'" @click="showPasswordAgain = !showPasswordAgain">{{ showPasswordAgain ? 'Hide' : 'Show' }}</button></div>
      </div>
      <button class="button owner-submit" :disabled="busy || !backendReady || (mode === 'create' && !ownerSignupUrl)">{{ busy ? 'Please wait…' : mode === 'create' ? 'Send owner invitation' : mode === 'recover' ? 'Email recovery link' : mode === 'reset' ? 'Update password' : 'Sign in securely' }}</button>
      <p v-if="message" class="notice" role="status">{{ message }}</p>
      <p v-if="errorMessage" class="notice owner-error" role="alert">{{ errorMessage }}</p>
      <div class="owner-auth-links">
        <button v-if="mode === 'login'" type="button" class="text-link-button" @click="setMode('recover')">Forgot password?</button>
        <button v-if="mode === 'login'" type="button" class="text-link-button" @click="setMode('create')">Set up the owner account</button>
        <button v-if="mode !== 'login'" type="button" class="text-link-button" @click="setMode('login')">Back to sign in</button>
      </div>
      <p class="owner-security-note">Private owner access  ·  Email recovery  ·  Passwords handled by Supabase Auth</p>
    </form>
  </section>
</template>
