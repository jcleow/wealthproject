import { ReactNode } from 'react'
import { Inter } from 'next/font/google'
import '../styles/globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'

const inter = Inter({ subsets: ['latin'] })

export default function RootLayout({
  children,
}: {
  children: ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <QueryProvider>
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