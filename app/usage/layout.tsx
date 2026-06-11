import type { Metadata } from 'next'
import PlatformShell from '@/components/layout/PlatformShell'

export const metadata: Metadata = {
  title: 'API Usage — Tokenomicon',
  description: 'Monitor your API usage, credit spend, and model performance',
}

export default function UsageLayout({ children }: { children: React.ReactNode }) {
  return <PlatformShell>{children}</PlatformShell>
}
