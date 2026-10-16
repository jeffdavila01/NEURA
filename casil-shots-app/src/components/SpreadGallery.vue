<script setup>
import { computed, ref } from 'vue'
import { categories } from '../data.js'

const props = defineProps({ photos: { type: Array, required: true }, favorites: { type: Array, default: () => [] } })
const emit = defineEmits(['open', 'favorite'])
const selected = ref('All')
const filtered = computed(() => props.photos.filter(photo => selected.value === 'All' || photo.category === selected.value))
const columns = computed(() => Array.from({ length: 3 }, (_, columnIndex) =>
  filtered.value.filter((_, photoIndex) => photoIndex % 3 === columnIndex),
))

</script>

<template>
  <div class="spread-gallery">
    <div class="filters"><button v-for="cat in categories" :key="cat" :class="{ active: selected === cat }" @click="selected = cat">{{ cat }}</button></div>
    <div v-if="filtered.length" class="spread-columns">
      <div v-for="(column, columnIndex) in columns" :key="`${selected}-${columnIndex}`" class="spread-column">
        <button v-for="(photo, photoIndex) in column" :key="photo.id" class="spread-card" :class="`size-${photoIndex % 3}`" type="button" :aria-label="`Open ${photo.title}`" @click="emit('open', photo)">
          <img :src="photo.image" :alt="photo.alt" loading="lazy" />
          <span class="spread-saved" @click.stop="emit('favorite', photo)">{{ favorites.includes(photo.id) ? 'SAVED' : 'SAVE' }}</span>
          <span class="spread-caption"><small>{{ photo.category }}</small><strong>{{ photo.title }}</strong></span>
        </button>
      </div>
    </div>
    <div v-else class="empty">No photos in this collection yet.</div>
  </div>
</template>
