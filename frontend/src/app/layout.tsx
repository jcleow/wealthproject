import { ReactNode } from 'react'
import { Geist, Geist_Mono } from 'next/font/google'
import '../styles/globals.css'
import { QueryProvider } from '@/components/providers/QueryProvider'
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar'
import { AppSidebar } from '@/components/sidebar/AppSidebar'

const geist = Geist({
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
      className={`${geist.variable} ${geistMono.variable}`}
      lang="en"
      suppressHydrationWarning
    >
      <body className="antialiased bg-[#0a0a0f] m-0 p-0">
        <QueryProvider>
          <SidebarProvider defaultOpen={false}>
            <AppSidebar />
            <SidebarInset className="!p-0 !bg-[#0a0a0f]">
              {children}
            </SidebarInset>
          </SidebarProvider>
        </QueryProvider>
      </body>
    </html>
  )
}

export const metadata = {
  title: 'Financial Chat System',
  description: 'AI-powered financial planning and chat system',
}