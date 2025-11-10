import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'MOBIN - چت بات',
  description: 'چت با MOBIN',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="fa" dir="rtl">
      <body>{children}</body>
    </html>
  )
}

