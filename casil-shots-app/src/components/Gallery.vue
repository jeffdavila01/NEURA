<script setup>
import { computed, ref } from 'vue'
import { categories } from '../data.js'
const props=defineProps({photos:{type:Array,required:true},filter:{type:Boolean,default:true},favorites:{type:Array,default:()=>[]}})
const emit=defineEmits(['favorite','open']); const selected=ref('All'); const filtered=computed(()=>props.photos.filter(p=>selected.value==='All'||p.category===selected.value))
</script>
<template><div v-if="filter" class="filters"><button v-for="cat in categories" :key="cat" :class="{active:selected===cat}" @click="selected=cat">{{cat}}</button></div><div v-if="filtered.length" class="gallery-grid"><article v-for="(photo,i) in filtered" :key="photo.id" class="photo-card" @click="emit('open',photo)"><img :src="photo.image" :alt="photo.alt" loading="lazy"/><button class="saved" :aria-label="favorites.includes(photo.id)?'Remove favorite':'Save photo'" @click.stop="emit('favorite',photo)">{{favorites.includes(photo.id)?'SAVE':'SAVED'}}</button><div class="photo-overlay"><small>{{photo.category}}</small><h3>{{photo.title}}</h3></div></article></div><div v-else class="empty">No photos in this collection yet.</div></template>
