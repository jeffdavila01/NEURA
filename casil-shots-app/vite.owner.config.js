import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { copyFile } from 'node:fs/promises'
import { resolve } from 'node:path'

export default defineConfig({
  base: '/NEURA/owner/',
  plugins: [vue(), {
    name: 'owner-index-alias',
    async writeBundle() {
      await copyFile(resolve('dist-owner/owner.html'), resolve('dist-owner/index.html'))
    },
  }],
  build: {
    outDir: 'dist-owner',
    emptyOutDir: true,
    rollupOptions: { input: { index: 'owner.html' } },
  },
})
