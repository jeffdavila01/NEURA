<script setup>
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { motion } from 'motion-v'
import { photos } from '../data.js'

const slides = [
  { photo: photos[2], description: 'A quiet, heartfelt record of the people and moments that make a wedding day yours.' },
  { photo: photos[0], description: 'Natural portraits that bring out your character, confidence, and the details in between.' },
  { photo: photos[1], description: 'Unscripted photographs for two people making memories in their own way.' },
  { photo: photos[4], description: 'The energy, emotion, and small moments that make every celebration unforgettable.' },
  { photo: photos[5], description: 'Cinematic portraits of you and your ride, made for the open road.' },
]
const activeIndex = ref(0)
const active = computed(() => slides[activeIndex.value])
const categoryLines = computed(() => active.value.photo.category === 'Motorcycle Photography' ? ['Motorcycle', 'Photography'] : [active.value.photo.category])
let timer

function startRotation() {
  window.clearInterval(timer)
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    timer = window.setInterval(() => {
      activeIndex.value = (activeIndex.value + 1) % slides.length
    }, 5500)
  }
}

function selectSlide(index) {
  activeIndex.value = index
  startRotation()
}

onMounted(startRotation)
onUnmounted(() => window.clearInterval(timer))
</script>

<template>
  <section class="landing-hero">
    <motion.div :key="`photo-${activeIndex}`" class="landing-photo" :style="{backgroundImage: `url(${active.photo.image})`}" :initial="{scale:1.1,opacity:.35}" :animate="{scale:1,opacity:1}" :transition="{duration:1.35,ease:[.22,1,.36,1]}" />
    <div class="landing-shade"></div>
    <div class="landing-copy">
      <motion.span class="landing-kicker" :initial="{opacity:0,y:12}" :animate="{opacity:1,y:0}" :transition="{duration:.6,delay:.3}">Casil Shots | Photography and creative services</motion.span>
      <motion.h1 :key="`category-${activeIndex}`" :initial="{opacity:0,y:32}" :animate="{opacity:1,y:0}" :transition="{duration:.75,delay:.08,ease:[.22,1,.36,1]}"><span v-for="line in categoryLines" :key="line">{{ line }}</span></motion.h1>
      <motion.p :key="`description-${activeIndex}`" :initial="{opacity:0,y:14}" :animate="{opacity:1,y:0}" :transition="{duration:.55,delay:.15}">{{ active.description }}</motion.p>
      <div class="landing-actions"><RouterLink class="button" to="/portfolio">Explore portfolio</RouterLink><RouterLink class="landing-text-link" to="/contact">Book a session</RouterLink></div>
    </div>
    <RouterLink class="landing-round-cta" to="/portfolio" aria-label="Explore the portfolio"><span>EXPLORE<br/>THE GALLERY</span><i aria-hidden="true"></i></RouterLink>
    <div class="landing-pagination" aria-label="Choose a hero photograph">
      <span>0{{ activeIndex + 1 }} / 05</span>
      <button v-for="(_, index) in slides" :key="index" :class="{active: activeIndex === index}" :aria-label="`Show photograph ${index + 1}`" :aria-current="activeIndex === index ? 'true' : undefined" @click="selectSlide(index)"></button>
    </div>
    <div class="landing-meta"><span>PORTRAITS / WEDDINGS / EVENTS</span><span>SCROLL TO EXPLORE</span></div>
  </section>
</template>
