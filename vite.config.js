import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Replace 'repo-name' with your actual GitHub repository name (e.g., 'api-portal')
export default defineConfig({
  plugins: [react()],
  base: '/api-test-portal/', 
})