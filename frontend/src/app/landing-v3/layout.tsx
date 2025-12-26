import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Assetra - Model Your Financial Future',
  description: 'Simulate life events, visualize outcomes, and make confident financial decisions with Assetra.',
}

export default function LandingV3Layout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      {/* Google Fonts for Minimalist Modern design system */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Calistoga&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
        rel="stylesheet"
      />
      {children}
    </>
  )
}
