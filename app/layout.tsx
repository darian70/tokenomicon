import type { Metadata } from 'next'
import { Orbitron, Share_Tech_Mono, VT323 } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import './globals.css'

const orbitron = Orbitron({
  variable: '--font-orbitron',
  subsets: ['latin'],
  weight: ['400', '700', '900'],
})

const shareTechMono = Share_Tech_Mono({
  variable: '--font-share-tech-mono',
  subsets: ['latin'],
  weight: '400',
})

const vt323 = VT323({
  variable: '--font-vt323',
  subsets: ['latin'],
  weight: '400',
})

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? 'https://tokenomicon.io'),
  title: {
    default: 'Tokenomicon — Compute Arcade',
    template: '%s | Tokenomicon',
  },
  description: 'One API key for every major AI model. Play 9 developer skill games to earn bonus compute credits. No crypto, no nonsense.',
  keywords: ['AI API', 'compute credits', 'skill games', 'OpenAI', 'Anthropic', 'Groq', 'API proxy', 'developer tools', 'LLM'],
  authors: [{ name: 'Tokenomicon' }],
  openGraph: {
    title: 'Tokenomicon — Compute Arcade',
    description: 'One API key, every major AI model. Play skill games to earn bonus compute.',
    type: 'website',
    locale: 'en_US',
    siteName: 'Tokenomicon',
    // opengraph-image.tsx is auto-discovered by Next.js — no explicit url needed
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Tokenomicon — Compute Arcade',
    description: 'One API key, every major AI model. Play skill games to earn bonus compute.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const clerkKey = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
  const body = (
    <html
      lang="en"
      className={`${orbitron.variable} ${shareTechMono.variable} ${vt323.variable} h-full`}
    >
      <body className="min-h-full flex flex-col bg-void text-text">
        {children}
      </body>
    </html>
  )

  if (!clerkKey) return body

  return (
    <ClerkProvider publishableKey={clerkKey}>
      {body}
    </ClerkProvider>
  )
}
