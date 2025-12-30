import { ReactNode } from 'react'
import Script from 'next/script'
import { Geist, Geist_Mono } from 'next/font/google'
import { Toaster } from 'sonner'
import '../styles/globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { AuthProvider } from '@/components/auth/AuthProvider'
import { AuthenticationGuard } from '@/components/auth/AuthGuard'
import { PersonFilterProvider } from '@/contexts/PersonFilterContext'
import { PersonsModalContainer } from '@/components/modals/PersonsModal'

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
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} bg-black text-white`}
    >
      <head>
        {process.env.NODE_ENV === 'development' && (
          <>
            <Script
              src="//unpkg.com/grab/dist/index.global.js"
              crossOrigin="anonymous"
              strategy="beforeInteractive"
            />
            <Script
              src="//unpkg.com/@react-grab/claude-code/dist/client.global.js"
              crossOrigin="anonymous"
              strategy="lazyOnload"
            />
            <Script
              src="//unpkg.com/@react-grab/codex/dist/client.global.js"
              crossOrigin="anonymous"
              strategy="lazyOnload"
            />
          </>
        )}
      </head>
      <body className="antialiased bg-black text-white">
        <QueryProvider>
          <AuthProvider>
            <AuthenticationGuard>
              <PersonFilterProvider>
                {children}
                <PersonsModalContainer />
              </PersonFilterProvider>
            </AuthenticationGuard>
          </AuthProvider>
        </QueryProvider>
        <Toaster theme="dark" position="bottom-right" richColors />
      </body>
    </html>
  )
}

export const metadata = {
  title: 'Financial Chat System',
  description: 'AI-powered financial planning and chat system',
}
