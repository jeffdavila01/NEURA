<script setup>
const props=defineProps({photo:{type:Object,default:null}, photos:{type:Array,default:()=>[]}}); const emit=defineEmits(['close','move'])
function keydown(e){if(e.key==='Escape')emit('close');if(e.key==='ArrowRight')emit('move',1);if(e.key==='ArrowLeft')emit('move',-1)}
</script>
<template><div v-if="photo" class="lightbox" @click.self="emit('close')" @keydown="keydown" tabindex="0"><button aria-label="Close image" @click="emit('close')">CLOSE</button><img :src="photo.image" :alt="photo.alt"/><div class="lb-caption">{{photo.title}}  |  {{photo.category}}</div><button class="lb-prev" aria-label="Previous photo" @click="emit('move',-1)">PREV</button><button class="lb-next" aria-label="Next photo" @click="emit('move',1)">NEXT</button></div></template>
