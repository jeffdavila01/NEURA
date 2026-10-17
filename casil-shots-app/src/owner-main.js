import { createApp } from 'vue'
import { createRouter, createWebHashHistory } from 'vue-router'
import OwnerApp from './owner/OwnerApp.vue'
import './style.css'
import './base.css'
import './theme.css'
import './owner-auth.css'
import './owner/owner-portal.css'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: '/login-demo?mode=create' },
    { path: '/login-demo', component: () => import('./pages/LoginDemo.vue') },
    { path: '/media-manager-demo', component: () => import('./pages/MediaManagerDemo.vue') },
  ],
})

createApp(OwnerApp).use(router).mount('#owner-app')
