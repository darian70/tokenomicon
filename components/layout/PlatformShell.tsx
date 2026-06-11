import Sidebar from './Sidebar'
import LiveTicker from '@/components/arena/LiveTicker'
import { ToastProvider } from '@/lib/toast'

export default function PlatformShell({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <div className="flex h-screen overflow-hidden bg-[#070a10]">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          <LiveTicker />
          <main className="flex-1 overflow-y-auto">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}
