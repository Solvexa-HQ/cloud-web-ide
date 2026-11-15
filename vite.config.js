import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Vite 빌드 설정: React 플러그인 및 Tailwind CSS v4 플러그인 적용
export default defineConfig({
  plugins: [react(), tailwindcss()],
})
