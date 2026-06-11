'use client'

import { useState, useEffect } from 'react'

interface ProviderHealth {
  name: string
  ok: boolean
  latencyMs: number
  modelCount: number
}

const Icons = {
  server: () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
      <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
      <line x1="6" x2="6.01" y1="6" y2="6" />
      <line x1="6" x2="6.01" y1="18" y2="18" />
    </svg>
  ),
  models: () => (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.29 7 12 12 20.71 7" />
      <line x1="12" x2="12" y1="22" y2="12" />
    </svg>
  ),
}

export default function ProviderStatus() {
  const [providers, setProviders] = useState<ProviderHealth[]>([])
  const [totalModels, setTotalModels] = useState(0)

  useEffect(() => {
    const load = () => {
      fetch('/api/status')
        .then((r) => r.json())
        .then((data) => {
          if (data.providers) setProviders(data.providers)
          if (data.totalModels) setTotalModels(data.totalModels)
        })
        .catch(() => {})
    }
    load()
    const interval = setInterval(load, 60_000)
    return () => clearInterval(interval)
  }, [])

  const onlineCount = providers.filter((p) => p.ok).length

  return (
    <div className="panel px-4 py-3">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2 text-text-secondary">
          <Icons.server />
          <span className="text-xs font-medium tracking-wide uppercase">Providers</span>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className={`absolute inline-flex h-full w-full rounded-full opacity-75 ${onlineCount > 0 ? 'bg-success' : 'bg-error'}`} />
              <span className={`relative inline-flex rounded-full h-2 w-2 ${onlineCount > 0 ? 'bg-success' : 'bg-error'}`} />
            </span>
            <span className="text-xs font-mono text-text-secondary">
              {onlineCount}/{providers.length} online
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-text-secondary">
            <Icons.models />
            <span className="text-xs font-mono">{totalModels} models</span>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        {providers.length === 0 ? (
          <div className="flex-1 flex items-center justify-center py-3 rounded-md bg-surface/30 border border-border border-dashed">
            <span className="text-xs text-text-secondary">Loading providers...</span>
          </div>
        ) : (
          providers.map((p) => (
            <div
              key={p.name}
              className={`flex-1 p-2.5 rounded-md border text-center transition-all duration-200 ${
                p.ok
                  ? 'border-success/20 bg-success/5 hover:border-success/30'
                  : 'border-error/20 bg-error/5 hover:border-error/30'
              }`}
              title={`${p.name}: ${p.ok ? `${p.latencyMs}ms` : 'offline'} · ${p.modelCount} models`}
            >
              <p className={`text-xs font-mono font-semibold ${p.ok ? 'text-success' : 'text-error'}`}>
                {p.name.toUpperCase()}
              </p>
              <p className="text-[10px] text-text-secondary font-mono mt-0.5">
                {p.ok ? `${p.latencyMs}ms` : 'offline'}
              </p>
              <p className="text-[9px] text-dim font-mono">{p.modelCount} models</p>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
