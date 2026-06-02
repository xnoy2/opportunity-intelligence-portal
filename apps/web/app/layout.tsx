import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'BCF Opportunity Intelligence Portal',
  description: 'Opportunity intelligence for BGR, BWDS NI, and BCF',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
