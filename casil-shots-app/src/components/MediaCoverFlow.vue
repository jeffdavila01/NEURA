<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'

const props = defineProps({ films: { type: Array, required: true } })
const emit = defineEmits(['play'])
const current = ref(0)
const touchStart = ref(0)
let autoplayTimer
const activeFilm = computed(() => props.films[current.value])

function shift(step) {
  if (!props.films.length) return
  current.value = (current.value + step + props.films.length) % props.films.length
}
function offset(index) {
  const length = props.films.length
  let distance = index - current.value
  if (distance > length / 2) distance -= length
  if (distance < -length / 2) distance += length
  return distance
}
function itemStyle(index) {
  const distance = offset(index)
  const depth = Math.abs(distance)
  return {
    transform: `translateX(${distance * 66}%) translateZ(${-depth * 105}px) rotateY(${distance * -36}deg) scale(${Math.max(.64, 1 - depth * .12)})`,
    opacity: Math.max(0, 1 - depth * .25),
    zIndex: 10 - depth,
  }
}
onMounted(() => {
  autoplayTimer = window.setInterval(() => shift(1), 5000)
})
onUnmounted(() => window.clearInterval(autoplayTimer))
</script>

<template>
  <div v-if="activeFilm" class="coverflow" @keydown.left.prevent="shift(-1)" @keydown.right.prevent="shift(1)" tabindex="0" aria-label="Media cover flow. Use arrow keys to browse.">
    <button class="coverflow-arrow previous" aria-label="Previous film" @click="shift(-1)">‹</button>
    <div class="coverflow-stage" @touchstart.passive="touchStart = $event.changedTouches[0].clientX" @touchend="shift($event.changedTouches[0].clientX < touchStart - 40 ? 1 : $event.changedTouches[0].clientX > touchStart + 40 ? -1 : 0)">
      <button v-for="(film, index) in films" :key="film.id" class="coverflow-item" :class="{ selected: offset(index) === 0, distant: Math.abs(offset(index)) > 2 }"
        :style="itemStyle(index)"
        :aria-label="`${film.title}${offset(index) === 0 ? ', selected' : ', select film'}`"
        @click="offset(index) === 0 ? emit('play', film) : current = index">
        <img :src="film.thumbnail" :alt="film.title" loading="lazy" />
        <span class="coverflow-play">{{ offset(index) === 0 ? 'PLAY' : 'VIEW' }}</span>
        <span class="coverflow-duration">{{ film.duration }}</span>
      </button>
    </div>
    <button class="coverflow-arrow next" aria-label="Next film" @click="shift(1)">›</button>
    <div class="coverflow-caption" aria-live="polite">
      <small>{{ activeFilm.category }} · Featured</small>
      <h2>{{ activeFilm.title }}</h2>
      <p>{{ activeFilm.description }}</p>
      <div class="coverflow-dots"><button v-for="(film, index) in films" :key="film.id" :class="{ active: index === current }" :aria-label="`Show ${film.title}`" @click="current = index" /></div>
    </div>
  </div>
</template>
