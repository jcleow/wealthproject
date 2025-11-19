import { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import '../styles/globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'

const geistSans = Geist({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist',
})

const geistMono = Geist_Mono({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-geist-mono',
})

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased">
        <QueryProvider>
          <Toaster closeButton richColors position="top-center" />
          {children}
        </QueryProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: 'Financial Chat System',
  description: 'AI-powered financial planning and chat system',
}
