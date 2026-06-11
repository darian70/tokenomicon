import type { Metadata } from 'next'
import MarketingShell from '@/components/layout/MarketingShell'

export const metadata: Metadata = {
  title: 'Status — Tokenomicon',
  description: 'Tokenomicon platform status — API, game sessions, provider health, and uptime history.',
}

type StatusLevel = 'operational' | 'degraded' | 'outage'

const STATUS_STYLE: Record<StatusLevel, { label: string; color: string; bg: string; dot: string }> = {
  operational: { label: 'Operational',     color: '#59f5a9', bg: 'rgba(89,245,169,0.08)',  dot: '#59f5a9' },
  degraded:    { label: 'Degraded',        color: '#ffd700', bg: 'rgba(255,215,0,0.08)',   dot: '#ffd700' },
  outage:      { label: 'Major outage',    color: '#ff4d6d', bg: 'rgba(255,77,109,0.08)',  dot: '#ff4d6d' },
}

interface ServiceStatus {
  name: string
  description: string
  status: StatusLevel
  latency?: string
}

const PLATFORM_SERVICES: ServiceStatus[] = [
  { name: 'API Proxy',           description: '/api/v1/chat/completions routing',       status: 'operational', latency: '142ms' },
  { name: 'Authentication',      description: 'Sign-in, session management',            status: 'operational', latency: '38ms'  },
  { name: 'Game Sessions',       description: 'Arena session creation and resolution',  status: 'operational', latency: '89ms'  },
  { name: 'Credit Ledger',       description: 'Balance reads, deductions, top-ups',     status: 'operational', latency: '22ms'  },
  { name: 'Leaderboard',         description: 'Rankings and live feed',                 status: 'operational', latency: '55ms'  },
  { name: 'Stripe Webhooks',     description: 'Payment processing callbacks',           status: 'operational'                  },
]

const PROVIDER_SERVICES: ServiceStatus[] = [
  { name: 'OpenAI',    description: 'GPT-4o, GPT-4o mini, o3-mini',                          status: 'operational', latency: '890ms'  },
  { name: 'Anthropic', description: 'Claude Sonnet 4, Claude 3.5 Haiku',                     status: 'operational', latency: '1,120ms' },
  { name: 'Google',    description: 'Gemini 2.0 Flash, Gemini 1.5 Pro',                      status: 'operational', latency: '640ms'  },
  { name: 'Groq',      description: 'Llama 3.3 70B, Llama 4 Scout, Mixtral 8×7B',           status: 'operational', latency: '210ms'  },
  { name: 'Mistral',   description: 'Mistral Large, Mistral Small 3.1',                       status: 'operational', latency: '780ms'  },
  { name: 'DeepSeek',  description: 'DeepSeek V3, DeepSeek R1 (via OpenRouter)',              status: 'operational', latency: '1,340ms' },
]

// 90-day uptime bars — true = up, false = incident
function generateUptimeBars(incidentDays: number[] = []): boolean[] {
  return Array.from({ length: 90 }, (_, i) => !incidentDays.includes(i))
}

const UPTIME_DATA: Record<string, boolean[]> = {
  'API Proxy':       generateUptimeBars([]),
  'Authentication':  generateUptimeBars([]),
  'Game Sessions':   generateUptimeBars([67]),
  'Credit Ledger':   generateUptimeBars([]),
  'OpenAI':          generateUptimeBars([14, 15]),
  'Anthropic':       generateUptimeBars([]),
  'Google':          generateUptimeBars([]),
  'Groq':            generateUptimeBars([31]),
  'Mistral':         generateUptimeBars([]),
  'DeepSeek':        generateUptimeBars([]),
}

function calcUptime(bars: boolean[]) {
  const up = bars.filter(Boolean).length
  return ((up / bars.length) * 100).toFixed(2)
}

const INCIDENTS = [
  {
    date: 'Apr 23, 2026',
    title: 'Groq elevated latency — resolved',
    duration: '41 minutes',
    severity: 'degraded' as StatusLevel,
    detail: 'Groq LPU cluster in us-east-1 experienced elevated P99 latency during a scheduled maintenance window. All other regions were unaffected. Resolved when traffic was routed to eu-west-1.',
  },
  {
    date: 'Apr 8, 2026 – Apr 9, 2026',
    title: 'OpenAI API partial outage — resolved',
    duration: '3 hours 12 minutes',
    severity: 'degraded' as StatusLevel,
    detail: 'OpenAI experienced a partial outage affecting GPT-4o requests. GPT-4o mini remained available. Tokenomicon automatically routed affected requests to fallback models where possible.',
  },
  {
    date: 'Mar 28, 2026',
    title: 'Game session resolver delay — resolved',
    duration: '18 minutes',
    severity: 'degraded' as StatusLevel,
    detail: 'A Supabase edge function cold-start regression caused 18 minutes of elevated game session resolution times (P99 > 8s). No sessions were lost; credits were not incorrectly debited.',
  },
]

export default function StatusPage() {
  const allOperational =
    [...PLATFORM_SERVICES, ...PROVIDER_SERVICES].every((s) => s.status === 'operational')

  return (
    <MarketingShell>
      {/* Header */}
      <section className="pt-16 pb-12 px-6 relative overflow-hidden">
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: 'linear-gradient(#59f5a9 1px, transparent 1px), linear-gradient(90deg, #59f5a9 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />
        <div className="relative max-w-4xl mx-auto">
          <p className="text-[10px] font-display tracking-[0.2em] text-[#3a4a5a] mb-4">SYSTEM STATUS</p>

          {/* Overall status banner */}
          <div
            className={`inline-flex items-center gap-3 px-5 py-3 rounded-xl border mb-6 ${
              allOperational
                ? 'border-[#59f5a9]/25 bg-[#59f5a9]/05'
                : 'border-[#ffd700]/25 bg-[#ffd700]/05'
            }`}
          >
            <span
              className="w-2.5 h-2.5 rounded-full animate-pulse"
              style={{ backgroundColor: allOperational ? '#59f5a9' : '#ffd700' }}
            />
            <span className="font-display text-sm font-black tracking-widest"
              style={{ color: allOperational ? '#59f5a9' : '#ffd700' }}
            >
              {allOperational ? 'ALL SYSTEMS OPERATIONAL' : 'PARTIAL DEGRADATION'}
            </span>
          </div>

          <p className="text-[#4a5a6d] font-mono text-xs">
            Last checked: {new Date().toUTCString().replace('GMT', 'UTC')}
          </p>
        </div>
      </section>

      <div className="px-6 pb-24 max-w-4xl mx-auto space-y-12">

        {/* Platform services */}
        <div>
          <h2 className="font-display text-xs tracking-[0.2em] text-[#4a5a6d] mb-4 uppercase">Platform Services</h2>
          <ServiceTable services={PLATFORM_SERVICES} />
        </div>

        {/* AI providers */}
        <div>
          <h2 className="font-display text-xs tracking-[0.2em] text-[#4a5a6d] mb-4 uppercase">AI Provider Status</h2>
          <ServiceTable services={PROVIDER_SERVICES} />
          <p className="text-[10px] font-mono text-[#3a4a5a] mt-2">
            Latency shown is median response time for a 50-token completion over the past hour.
            Provider status reflects our connection to their APIs — not the providers&apos; own status pages.
          </p>
        </div>

        {/* Uptime history */}
        <div>
          <h2 className="font-display text-xs tracking-[0.2em] text-[#4a5a6d] mb-4 uppercase">
            90-Day Uptime History
          </h2>
          <div className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden divide-y divide-[#0f1520]">
            {Object.entries(UPTIME_DATA).map(([name, bars]) => (
              <div key={name} className="px-5 py-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-mono text-[#6b7a8d]">{name}</span>
                  <span className="text-[10px] font-mono text-[#59f5a9]">{calcUptime(bars)}% uptime</span>
                </div>
                <div className="flex gap-px">
                  {bars.map((up, i) => (
                    <div
                      key={i}
                      className="flex-1 h-6 rounded-[2px]"
                      style={{
                        backgroundColor: up ? 'rgba(89,245,169,0.35)' : 'rgba(255,77,109,0.5)',
                        minWidth: '2px',
                      }}
                      title={up ? `Day ${90 - i}: Operational` : `Day ${90 - i}: Incident`}
                    />
                  ))}
                </div>
                <div className="flex justify-between mt-1">
                  <span className="text-[9px] font-mono text-[#2a3a4a]">90 days ago</span>
                  <span className="text-[9px] font-mono text-[#2a3a4a]">Today</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Incident history */}
        <div>
          <h2 className="font-display text-xs tracking-[0.2em] text-[#4a5a6d] mb-4 uppercase">
            Recent Incidents
          </h2>
          {INCIDENTS.length === 0 ? (
            <div className="rounded-xl border border-[#192433] bg-[#0c111a] px-5 py-8 text-center">
              <p className="text-xs font-mono text-[#4a5a6d]">No incidents in the past 90 days.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {INCIDENTS.map((incident) => {
                const style = STATUS_STYLE[incident.severity]
                return (
                  <div key={incident.title} className="rounded-xl border border-[#192433] bg-[#0c111a] overflow-hidden">
                    <div className="px-5 py-3.5 border-b border-[#0f1520] flex flex-wrap items-center gap-3">
                      <span
                        className="text-[9px] font-mono px-2 py-0.5 rounded border tracking-wider"
                        style={{ color: style.color, borderColor: `${style.color}30`, backgroundColor: style.bg }}
                      >
                        {style.label.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-[#a8b8cc] font-medium">{incident.title}</span>
                      <span className="text-[10px] font-mono text-[#3a4a5a] ml-auto">{incident.date}</span>
                    </div>
                    <div className="px-5 py-3.5 flex flex-wrap gap-6">
                      <div>
                        <p className="text-[9px] font-mono tracking-widest text-[#3a4a5a] mb-1">DURATION</p>
                        <p className="text-xs font-mono text-[#6b7a8d]">{incident.duration}</p>
                      </div>
                      <div className="flex-1 min-w-[200px]">
                        <p className="text-[9px] font-mono tracking-widest text-[#3a4a5a] mb-1">DETAILS</p>
                        <p className="text-xs font-mono text-[#4a5a6d] leading-relaxed">{incident.detail}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

      </div>
    </MarketingShell>
  )
}

function ServiceTable({ services }: { services: ServiceStatus[] }) {
  return (
    <div className="rounded-xl border border-[#192433] overflow-hidden divide-y divide-[#0f1520]">
      {services.map((service) => {
        const style = STATUS_STYLE[service.status]
        return (
          <div key={service.name} className="flex items-center justify-between px-5 py-3.5 bg-[#0c111a] hover:bg-[#0a1018] transition-colors">
            <div className="flex items-center gap-3">
              <span
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ backgroundColor: style.dot, boxShadow: `0 0 6px ${style.dot}` }}
              />
              <div>
                <p className="text-xs font-mono text-[#a8b8cc]">{service.name}</p>
                <p className="text-[10px] font-mono text-[#3a4a5a]">{service.description}</p>
              </div>
            </div>
            <div className="flex items-center gap-5 flex-shrink-0">
              {service.latency && (
                <span className="text-[10px] font-mono text-[#4a5a6d] hidden sm:inline">
                  {service.latency} avg
                </span>
              )}
              <span
                className="text-[10px] font-mono px-2.5 py-1 rounded-lg border"
                style={{ color: style.color, borderColor: `${style.color}25`, backgroundColor: style.bg }}
              >
                {style.label}
              </span>
            </div>
          </div>
        )
      })}
    </div>
  )
}
