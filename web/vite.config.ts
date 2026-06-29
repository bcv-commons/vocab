import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// base: './' makes the built site portable (works from any subpath / static host).
export default defineConfig({
  base: './',
  plugins: [react()],
})
