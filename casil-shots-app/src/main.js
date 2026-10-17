import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import App from './App.vue'
import './style.css'
import './base.css'
import './landing.css'
import './landing-slides.css'
import './spread-gallery.css'
import './media-coverflow.css'
import './packages.css'
import './facebook-link.css'
import './extras.css'
import './theme.css'

const pages = {
  Home: () => import('./pages/Home.vue'),
  About: () => import('./pages/About.vue'),
  Portfolio: () => import('./pages/Portfolio.vue'),
  ProjectDetails: () => import('./pages/ProjectDetails.vue'),
  Media: () => import('./pages/Media.vue'),
  Services: () => import('./pages/Services.vue'),
  Contact: () => import('./pages/Contact.vue'),
  ClientGalleryDemo: () => import('./pages/ClientGalleryDemo.vue'),
  SavedPhotos: () => import('./pages/SavedPhotos.vue'),
}
const routes = Object.entries(pages).map(([name, component]) => ({
  path: name === 'Home' ? '/' : `/${name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}`,
  name,
  component,
}))
const router = createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), routes, scrollBehavior: () => ({ top: 0 }) })
createApp(App).use(router).mount('#app')
