import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Minesweeper',
  description: 'A classic Minesweeper game built with Next.js',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  )
}
