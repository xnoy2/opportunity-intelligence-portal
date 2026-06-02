import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    // Required for pnpm monorepos: tells Next.js to trace node_modules
    // from the workspace root so standalone output includes real files
    // not broken symlinks
    outputFileTracingRoot: path.join(__dirname, '../../'),
  },
}
export default nextConfig
