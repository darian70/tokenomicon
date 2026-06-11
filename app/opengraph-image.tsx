import { ImageResponse } from 'next/og'

export const runtime = 'edge'
export const alt = 'Tokenomicon — Compute Arcade'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/png'

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: 'linear-gradient(135deg, #070a10 0%, #0a0f1e 50%, #070a10 100%)',
          fontFamily: 'sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid background */}
        <div
          style={{
            position: 'absolute',
            inset: 0,
            opacity: 0.04,
            backgroundImage:
              'linear-gradient(rgba(90,216,255,1) 1px, transparent 1px), linear-gradient(90deg, rgba(90,216,255,1) 1px, transparent 1px)',
            backgroundSize: '48px 48px',
          }}
        />

        {/* Glow blob top */}
        <div
          style={{
            position: 'absolute',
            top: -120,
            left: '50%',
            transform: 'translateX(-50%)',
            width: 600,
            height: 400,
            background: 'radial-gradient(ellipse, rgba(255,77,109,0.15) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Glow blob bottom-right */}
        <div
          style={{
            position: 'absolute',
            bottom: -80,
            right: 80,
            width: 400,
            height: 300,
            background: 'radial-gradient(ellipse, rgba(90,216,255,0.1) 0%, transparent 70%)',
            borderRadius: '50%',
          }}
        />

        {/* Main content */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 24,
            position: 'relative',
          }}
        >
          {/* Logo pill */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '6px 16px',
              background: 'rgba(255,77,109,0.1)',
              border: '1px solid rgba(255,77,109,0.25)',
              borderRadius: 999,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#59f5a9',
              }}
            />
            <span
              style={{
                fontSize: 13,
                color: '#59f5a9',
                letterSpacing: '0.2em',
                fontWeight: 700,
              }}
            >
              PLATFORM LIVE · 100 FREE CREDITS/DAY
            </span>
          </div>

          {/* Wordmark */}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 0 }}>
            <span
              style={{
                fontSize: 96,
                fontWeight: 900,
                color: '#ff4d6d',
                letterSpacing: '0.06em',
                lineHeight: 1,
                textShadow: '0 0 80px rgba(255,77,109,0.5)',
              }}
            >
              TOKEN
            </span>
            <span
              style={{
                fontSize: 96,
                fontWeight: 900,
                color: '#ffffff',
                letterSpacing: '0.06em',
                lineHeight: 1,
              }}
            >
              OMICON
            </span>
          </div>

          {/* Tagline */}
          <p
            style={{
              fontSize: 22,
              color: 'rgba(107,122,141,1)',
              fontFamily: 'monospace',
              letterSpacing: '0.02em',
              margin: 0,
              textAlign: 'center',
              maxWidth: 700,
              lineHeight: 1.5,
            }}
          >
            One API key for every major AI model.
            Play skill games to earn bonus compute.
          </p>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 0,
              marginTop: 16,
              border: '1px solid rgba(25,36,51,1)',
              borderRadius: 12,
              overflow: 'hidden',
            }}
          >
            {[
              { value: '9', label: 'skill games', color: '#5ad8ff' },
              { value: '15+', label: 'AI models', color: '#59f5a9' },
              { value: '100', label: 'free cr/day', color: '#ffd700' },
              { value: '$0', label: 'to start', color: '#a78bfa' },
            ].map((stat, i) => (
              <div
                key={stat.label}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '16px 32px',
                  background: i % 2 === 0 ? 'rgba(12,17,26,1)' : 'rgba(8,13,20,1)',
                  borderRight: i < 3 ? '1px solid rgba(25,36,51,1)' : 'none',
                }}
              >
                <span style={{ fontSize: 28, fontWeight: 900, color: stat.color, lineHeight: 1 }}>
                  {stat.value}
                </span>
                <span style={{ fontSize: 12, color: 'rgba(74,90,109,1)', fontFamily: 'monospace', marginTop: 4, letterSpacing: '0.1em' }}>
                  {stat.label.toUpperCase()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom url */}
        <div
          style={{
            position: 'absolute',
            bottom: 28,
            right: 40,
            fontSize: 14,
            color: 'rgba(42,58,74,1)',
            fontFamily: 'monospace',
            letterSpacing: '0.1em',
          }}
        >
          tokenomicon.io
        </div>
      </div>
    ),
    { ...size }
  )
}
