<script setup>
import { nextTick, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute(); const menuOpen = ref(false)
const lightMode = ref(false)
const nav = [['Home','/'],['About','/about'],['Services & Packages','/services'],['Gallery','/portfolio'],['Media','/media'],['Contact','/contact']]
function applyTheme(){document.documentElement.dataset.theme=lightMode.value?'light':'dark'}
function toggleTheme(){
  const changeTheme=async()=>{lightMode.value=!lightMode.value;applyTheme();localStorage.setItem('casil-theme',lightMode.value?'light':'dark');await nextTick()}
  if(document.startViewTransition) document.startViewTransition(changeTheme)
  else changeTheme()
}
onMounted(()=>{lightMode.value=localStorage.getItem('casil-theme')==='light';applyTheme()})
</script>
<template><header class="site-header"><RouterLink to="/" class="brand"><img :src="lightMode?'/casil-shots-light.svg':'/casil-shots.svg'" alt="Casil Shots" /></RouterLink><button class="menu-toggle" @click="menuOpen=!menuOpen" aria-label="Toggle navigation">{{menuOpen?'CLOSE':'MENU'}}</button><nav :class="{open:menuOpen}"><RouterLink v-for="[label,path] in nav" :key="label" :to="path" @click="menuOpen=false" :class="{active:route.path===path}">{{label}}</RouterLink><button class="theme-toggle" type="button" :aria-label="lightMode?'Switch to dark mode':'Switch to light mode'" @click="toggleTheme"><span aria-hidden="true">{{lightMode?'☾':'☼'}}</span> {{lightMode?'Dark mode':'Light mode'}}</button><RouterLink class="nav-demo" to="/login-demo">Client demo  -> </RouterLink></nav></header><main><RouterView/></main><footer class="site-footer"><div class="footer-main"><div><img class="footer-logo" :src="lightMode?'/casil-shots-light.svg':'/casil-shots.svg'" alt="Casil Shots"/><p>Photography that keeps the feeling.</p></div><div class="footer-links"><RouterLink to="/portfolio">Explore the gallery</RouterLink><RouterLink to="/saved-photos">Saved photographs</RouterLink><RouterLink to="/media-manager-demo">Media manager demo</RouterLink><RouterLink to="/client-gallery-demo">Client gallery demo</RouterLink><RouterLink to="/contact">Book a session</RouterLink><a class="facebook-link" href="https://web.facebook.com/CasilSignaturePhotography" target="_blank" rel="noopener noreferrer" aria-label="Visit Casil Signature Photography on Facebook"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.6 21v-8h2.7l.4-3.1h-3.1v-2c0-.9.3-1.5 1.6-1.5h1.7V3.6c-.3 0-1.4-.1-2.6-.1-2.6 0-4.4 1.6-4.4 4.5v1.9H7v3.1h2.9v8h3.7z"/></svg><span>Casil Signature Photography</span></a></div><div class="neura-badge" aria-label="Website concept by Neura"><img src="/neura.svg" alt="Neura"/><span>Website concept<br/><strong>by Neura</strong></span></div></div><div class="footer-bottom"><span>Copyright  {{new Date().getFullYear()}} Casil Shots  |  Photography & Creative Services</span><span>Demo website  |  Sample content</span></div></footer></template>
