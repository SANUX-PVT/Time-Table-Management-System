import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // On GitHub Actions, GITHUB_REPOSITORY is "owner/repo" — GitHub Pages serves
  // project sites from /repo/, so asset URLs need that prefix. Local dev/build
  // outside CI keeps the default root base.
  base: process.env.GITHUB_REPOSITORY ? `/${process.env.GITHUB_REPOSITORY.split('/')[1]}/` : '/',
  plugins: [react()],
})
