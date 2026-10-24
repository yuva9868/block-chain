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
  title: 'MedLedger — Medical record integrity registry',
  description: 'Register SHA-256 hashes of medical files on-chain and keep the files encrypted off-chain.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${_geist.className} antialiased bg-background text-foreground`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
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
