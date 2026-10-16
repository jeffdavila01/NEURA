<script setup>
import { ref, onMounted } from 'vue'
import { services, packages } from '../data.js'
import { useRoute } from 'vue-router'
const route = useRoute()
const done = ref(false)
const form = ref({ name: '', email: '', service: '', date: '', package: '', message: '' })
onMounted(() => {
  if (route.query.service) form.value.service = route.query.service
  if (route.query.package) form.value.package = route.query.package
})
const submit = () => {
  try {
    const list = JSON.parse(localStorage.getItem('casil-inquiries') || '[]')
    list.push({ ...form.value, createdAt: new Date().toISOString() })
    localStorage.setItem('casil-inquiries', JSON.stringify(list))
  } catch {}
  done.value = true
}
</script>
<template>
  <section class="page-hero"><span class="eyebrow">Contact & booking</span><h1>Let's plan<br/>your session.</h1><p>Tell us a little about what you have in mind. We'll follow up with next steps.</p></section>
  <section class="section">
    <form v-if="!done" class="form" @submit.prevent="submit">
      <div class="field"><label for="name">Your name *</label><input id="name" v-model.trim="form.name" required autocomplete="name"/></div>
      <div class="field"><label for="email">Email address *</label><input id="email" v-model.trim="form.email" type="email" required autocomplete="email"/></div>
      <div class="field"><label for="service">Service type *</label><select id="service" v-model="form.service" required><option value="" disabled>Select a service</option><option v-for="s in services" :key="s.name">{{s.name}}</option></select></div>
      <div class="field"><label for="package">Package preference</label><select id="package" v-model="form.package"><option value="">Not sure yet</option><option v-for="s in packages" :key="s.name">{{s.name}}</option></select></div>
      <div class="field"><label for="date">Preferred date</label><input id="date" v-model="form.date" type="date"/></div>
      <div class="field full"><label for="message">Tell us about your idea *</label><textarea id="message" v-model.trim="form.message" rows="5" required placeholder="The occasion, people involved, location or anything else you'd like us to know..."/></div>
      <div class="field full"><button class="button">Send inquiry (demo)</button></div>
    </form>
    <div v-else class="success-panel"><span class="eyebrow">Inquiry saved in this browser</span><h2>Thanks for sharing your idea.</h2><p class="muted">This is a frontend-only confirmation. Nothing was emailed or sent to an administrator. Your sample inquiry is stored only in this browser.</p><button class="button secondary" @click="done=false">Submit another inquiry</button></div>
    <aside class="notice">Demo mode: form validation works and inquiries are stored in localStorage on this browser. Email delivery requires a backend or an external form service.</aside>
  </section>
</template>
