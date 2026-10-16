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

const pages = ['Home','About','Portfolio','ProjectDetails','Media','Services','Contact','LoginDemo','ClientGalleryDemo','SavedPhotos','MediaManagerDemo']
const routes = pages.map((name, i) => ({ path: i === 0 ? '/' : `/${name.replace(/([A-Z])/g, '-$1').toLowerCase().replace(/^-/, '')}`, name, component: () => import(`./pages/${name}.vue`) }))
const router = createRouter({ history: createWebHashHistory(import.meta.env.BASE_URL), routes, scrollBehavior: () => ({ top: 0 }) })
createApp(App).use(router).mount('#app')
