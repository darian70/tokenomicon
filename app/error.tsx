'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col items-center justify-center gap-8 px-6 text-center bg-void text-text">
        <div>
          <p className="font-vt text-[80px] lg:text-[120px] leading-none text-blood/20 select-none">500</p>
          <h1 className="font-display text-2xl font-black text-blood tracking-widest -mt-4">SOMETHING BROKE</h1>
          <p className="font-mono text-dim text-sm mt-4 max-w-sm">
            An unexpected error occurred. Our team has been notified. Try again or return to the arcade.
          </p>
          {error.digest && (
            <p className="font-mono text-[10px] text-dim/50 mt-2">Error ID: {error.digest}</p>
          )}
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={reset}
            className="px-8 py-3 bg-blood text-void font-display text-sm tracking-widest hover:bg-blood/80 transition-colors cursor-crosshair"
          >
            TRY AGAIN
          </button>
          <a
            href="/"
            className="px-8 py-3 border border-border text-dim font-display text-sm tracking-widest hover:border-cyan hover:text-cyan transition-colors"
          >
            HOME
          </a>
        </div>
      </body>
    </html>
  )
}
