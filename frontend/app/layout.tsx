import type { Metadata } from 'next'
import { Outfit } from 'next/font/google'
import './globals.css'
import Providers from '@/components/Providers'

const outfit = Outfit({ subsets: ['latin'], variable: '--font-outfit' })

export const metadata: Metadata = {
  title: 'MSME Credit Platform',
  description: 'AI-powered credit scoring and loan management for MSMEs',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="light">
      <body className={`${outfit.variable} font-sans antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
