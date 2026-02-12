import type { Metadata } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'

import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { Web3Provider } from '@/lib/web3-context'
import { RecordsProvider } from '@/lib/records-context'
import { Toaster } from 'sonner'

const _geist = Geist({ subsets: ['latin'] })
const _geistMono = Geist_Mono({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MedLedger - Web3 Medical Records',
  description: 'Tamper-proof medical records powered by blockchain',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <Web3Provider>
            <RecordsProvider>
              {children}
              <Toaster position="top-center" />
            </RecordsProvider>
          </Web3Provider>
        </ThemeProvider>
      </body>
    </html>
  )
}
