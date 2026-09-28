import react from '@vitejs/plugin-react'
import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { defineConfig } from 'vite'

// The dev proxy follows the server's PORT (server/.env) so `npm run dev` keeps working on any port.
const serverEnv = path.resolve(__dirname, '../server/.env')
const port = process.env.VITE_PROXY_PORT || (existsSync(serverEnv) ? /^PORT\s*=\s*(\d+)/m.exec(readFileSync(serverEnv, 'utf8'))?.[1] : undefined) || '3000'
const target = process.env.VITE_PROXY_TARGET || `http://localhost:${port}`

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target, changeOrigin: true },
      '/socket.io': { target, ws: true },
    },
  },
})
