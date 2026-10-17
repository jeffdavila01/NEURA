<script setup>
const logoUrl = `${import.meta.env.BASE_URL}casil-shots.svg`
</script>

<template>
  <header class="owner-site-header">
    <a class="owner-brand" href="https://jeffdavila01.github.io/NEURA/casil-shots/" aria-label="Casil Shots public website">
      <img :src="logoUrl" alt="Casil Shots" />
      <span>OWNER STUDIO</span>
    </a>
    <a class="owner-public-link" href="https://jeffdavila01.github.io/NEURA/casil-shots/">Public website ↗</a>
  </header>
  <main class="owner-site-main"><RouterView /></main>
  <footer class="owner-site-footer"><span>CASIL SHOTS · PRIVATE OWNER PORTAL</span><span>Private media requires owner sign in.</span></footer>
</template>
