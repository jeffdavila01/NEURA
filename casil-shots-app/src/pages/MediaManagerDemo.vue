<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { backendReady, requireSupabase, supabase } from '../lib/supabase.js'

const router = useRouter()
const user = ref(null)
const items = ref([])
const loading = ref(true)
const uploading = ref(false)
const errorMessage = ref('')
const notice = ref('')
const selectedFiles = ref([])
const titles = ref([])
const description = ref('')
const fileInput = ref(null)
const totalBytes = computed(() => items.value.reduce((sum, item) => sum + (item.size || 0), 0))
let authSubscription

function chooseFiles(event) {
  selectedFiles.value = [...(event.target.files || [])]
  titles.value = selectedFiles.value.map(file => file.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '))
  errorMessage.value = ''
}

async function loadItems() {
  const client = requireSupabase()
  const { data, error } = await client.from('casil_media').select('*').order('created_at', { ascending: false })
  if (error) throw error
  const rows = await Promise.all(data.map(async row => {
    const { data: signed, error: signedError } = await client.storage.from('casil-private-media').createSignedUrl(row.object_path, 60 * 60)
    return { ...row, url: signedError ? '' : signed.signedUrl }
  }))
  items.value = rows
}

async function startSession() {
  if (!supabase) { loading.value = false; return }
  const { data: sessionData } = await supabase.auth.getSession()
  const session = sessionData.session
  if (!session) { await router.replace('/login-demo'); return }
  const { data: owner, error } = await supabase.from('casil_owner').select('user_id').maybeSingle()
  if (error || !owner || owner.user_id !== session.user.id) {
    await supabase.auth.signOut()
    await router.replace('/login-demo')
    return
  }
  user.value = session.user
  await loadItems()
}

async function uploadFiles() {
  errorMessage.value = ''; notice.value = ''
  if (!selectedFiles.value.length) { errorMessage.value = 'Choose one or more photos or videos first.'; return }
  const limit = 50 * 1024 * 1024
  const allowed = /^(image\/(jpeg|png|webp|avif|gif)|video\/(mp4|webm|quicktime))$/
  const invalid = selectedFiles.value.find(file => !allowed.test(file.type) || file.size > limit)
  if (invalid) { errorMessage.value = `${invalid.name} is unsupported or larger than 50 MB.`; return }

  uploading.value = true
  try {
    const client = requireSupabase()
    for (const [index, file] of selectedFiles.value.entries()) {
      const cleanName = file.name.normalize('NFKD').replace(/[^\w.-]+/g, '-').replace(/-+/g, '-').slice(-100)
      const objectPath = `${user.value.id}/${crypto.randomUUID()}-${cleanName}`
      const { error: uploadError } = await client.storage.from('casil-private-media').upload(objectPath, file, { contentType: file.type, upsert: false })
      if (uploadError) throw uploadError
      const kind = file.type.startsWith('video/') ? 'video' : 'photo'
      const { error: rowError } = await client.from('casil_media').insert({
        owner_id: user.value.id,
        title: titles.value[index]?.trim() || file.name,
        description: description.value.trim(),
        kind,
        object_path: objectPath,
        content_type: file.type,
        size: file.size,
      })
      if (rowError) {
        await client.storage.from('casil-private-media').remove([objectPath])
        throw rowError
      }
    }
    selectedFiles.value = []; titles.value = []; description.value = ''
    if (fileInput.value) fileInput.value.value = ''
    notice.value = 'Your files were uploaded to private storage.'
    await loadItems()
  } catch (error) { errorMessage.value = error.message || 'Upload failed.' }
  finally { uploading.value = false }
}

async function removeItem(item) {
  if (!window.confirm(`Permanently delete “${item.title}”?`)) return
  errorMessage.value = ''; notice.value = ''
  try {
    const client = requireSupabase()
    const { error: objectError } = await client.storage.from('casil-private-media').remove([item.object_path])
    if (objectError) throw objectError
    const { error } = await client.from('casil_media').delete().eq('id', item.id)
    if (error) throw error
    await loadItems()
  } catch (error) { errorMessage.value = error.message || 'Could not delete the file.' }
}

async function signOut() {
  await supabase?.auth.signOut()
  await router.replace('/login-demo')
}

onMounted(async () => {
  if (!backendReady) { loading.value = false; return }
  try { await startSession() }
  catch (error) { errorMessage.value = error.message || 'Could not load your private library.' }
  finally { loading.value = false }
  authSubscription = supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) router.replace('/login-demo')
  }).data.subscription
})
onUnmounted(() => authSubscription?.unsubscribe())
</script>

<template>
  <section class="page-hero owner-studio-hero">
    <span class="eyebrow">Casil Shots  |  Private owner studio</span>
    <h1>Your media,<br/>kept private.</h1>
    <p>Upload photos and videos to your private library. Only the registered owner account can access these files.</p>
  </section>
  <section class="section owner-studio-section">
    <div v-if="loading" class="notice">Checking your secure owner session…</div>
    <div v-else-if="!backendReady" class="notice">Private storage is not connected yet. Add the Supabase environment settings and run the setup SQL to continue.</div>
    <template v-else-if="user">
      <div class="owner-studio-top"><div><span class="eyebrow">Signed in as</span><h2>{{ user.email }}</h2></div><button class="button secondary" @click="signOut">Sign out</button></div>
      <p v-if="errorMessage" class="notice owner-error" role="alert">{{ errorMessage }}</p>
      <p v-if="notice" class="notice" role="status">{{ notice }}</p>
      <form class="owner-upload" @submit.prevent="uploadFiles">
        <div><span class="eyebrow">Private upload</span><h2>Add photos & video</h2><p class="muted">JPEG, PNG, WebP, AVIF, GIF, MP4, WebM or MOV · up to 50 MB per file.</p></div>
        <div class="field"><label for="owner-media-files">Choose media</label><input id="owner-media-files" ref="fileInput" type="file" accept="image/jpeg,image/png,image/webp,image/avif,image/gif,video/mp4,video/webm,video/quicktime" multiple @change="chooseFiles" /></div>
        <div v-if="selectedFiles.length" class="owner-file-titles"><div v-for="(file,index) in selectedFiles" :key="`${file.name}-${index}`" class="field"><label :for="`owner-title-${index}`">Title for {{ file.name }}</label><input :id="`owner-title-${index}`" v-model="titles[index]" maxlength="120" required /></div></div>
        <div class="field"><label for="owner-media-description">Description (optional)</label><textarea id="owner-media-description" v-model="description" rows="3" maxlength="500" placeholder="Add a short note about this upload." /></div>
        <div class="owner-upload-bottom"><span class="muted">{{ selectedFiles.length }} selected · {{ (selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1048576).toFixed(1) }} MB</span><button class="button" :disabled="uploading || !selectedFiles.length">{{ uploading ? 'Uploading securely…' : 'Upload to private library' }}</button></div>
      </form>
      <div class="owner-library-head"><div><span class="eyebrow">Private storage</span><h2>Your library <small>({{ items.length }} files)</small></h2></div><span class="muted">{{ (totalBytes / 1048576).toFixed(1) }} MB stored</span></div>
      <div v-if="!items.length" class="empty">Your private library is empty. Choose files above to add your first photos or video.</div>
      <div v-else class="owner-media-grid">
        <article v-for="item in items" :key="item.id" class="owner-media-card">
          <a v-if="item.url && item.kind === 'photo'" :href="item.url" target="_blank" rel="noopener noreferrer" class="owner-media-preview"><img :src="item.url" :alt="item.title" /></a>
          <video v-else-if="item.url" class="owner-media-preview" :src="item.url" controls preload="metadata" />
          <div v-else class="owner-media-preview owner-media-missing">Private preview unavailable</div>
          <div class="owner-media-copy"><span class="eyebrow">{{ item.kind }} · {{ new Date(item.created_at).toLocaleDateString() }}</span><h3>{{ item.title }}</h3><p v-if="item.description">{{ item.description }}</p><button class="owner-delete" @click="removeItem(item)">Delete permanently</button></div>
        </article>
      </div>
    </template>
  </section>
</template>
