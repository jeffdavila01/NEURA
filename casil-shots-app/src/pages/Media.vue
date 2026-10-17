<script setup>
import { ref, computed } from 'vue'
import { media as defaults } from '../data.js'
import MediaCoverFlow from '../components/MediaCoverFlow.vue'

const read = () => {
  try { return JSON.parse(localStorage.getItem('casil-media') || 'null') || defaults }
  catch { return defaults }
}
const films = ref(read())
const active = ref(null)
const featured = computed(() => films.value.filter(film => film.featured).slice(0, 6))
</script>

<template>
  <section class="page-hero"><span class="eyebrow">Featured media · six stories</span><h1>Stories in<br/>motion.</h1><p>Short films, behind-the-scenes moments and moving portraits from the Casil Shots archive.</p></section>
  <section class="section">
    <MediaCoverFlow :films="featured" @play="active = $event" />
    <div v-if="active" class="video-modal" @click.self="active = null"><button aria-label="Close" @click="active = null">CLOSE</button><video v-if="active.video" :src="active.video" controls autoplay/><div v-else class="video-placeholder"><span class="eyebrow">Media preview</span><h2>{{ active.title }}</h2><p>Demo preview. Add a working video URL in the Media Manager to play a film here.</p></div></div>
    <p class="notice">These are six sample media stories from the Casil Shots archive.</p>
  </section>
</template>
