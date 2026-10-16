<script setup>
import { packages, highlightVideo, services } from '../data.js'
</script>

<template>
  <section class="page-hero">
    <span class="eyebrow">Services & packages</span>
    <h1>Choose your<br/>coverage.</h1>
    <p>Photography packages for the moments you want to keep, with an optional highlight film.</p>
  </section>
  <section class="section package-section">
    <div class="section-head"><div><span class="eyebrow">Casil Shots photography</span><h2>One story. Three ways to keep it.</h2></div></div>
    <div class="cards services-grid package-grid">
      <article v-for="item in packages" :key="item.name" class="card package-card" :class="{ popular: item.popular }">
        <span v-if="item.popular" class="package-popular">Most popular</span>
        <span class="eyebrow">{{ item.coverage }}</span><h3>{{ item.name }} package</h3>
        <div class="price">{{ item.price }}</div><p>{{ item.description }}</p>
        <ul><li v-for="feature in item.items" :key="feature">{{ feature }}</li></ul>
        <RouterLink class="text-link" :to="`/contact?package=${encodeURIComponent(item.name)}`">Choose {{ item.name }} →</RouterLink>
      </article>
    </div>
    <article class="card video-addon"><div><span class="eyebrow">Optional add-on</span><h3>{{ highlightVideo.name }}</h3><p>{{ highlightVideo.duration }}</p><ul><li v-for="feature in highlightVideo.items" :key="feature">{{ feature }}</li></ul></div><strong class="price">{{ highlightVideo.price }}</strong></article>
    <div class="service-types"><span class="eyebrow">Available for</span><p>{{ services.map(service => service.name).join('  ·  ') }}</p></div>
    <p class="notice">Package details and availability are confirmed when you inquire. Contact us to discuss a session that fits your event.</p>
  </section>
</template>
