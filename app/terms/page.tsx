import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Terms of Service — Tokenomicon',
  description: 'Tokenomicon Terms of Service',
}

export default function TermsPage() {
  return (
    <main className="min-h-screen px-6 py-16 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl font-black text-blood glow-red tracking-wide mb-8">TERMS OF SERVICE</h1>
      <p className="text-[10px] text-dim font-mono mb-8">Last updated: May 2026</p>

      <div className="space-y-8 text-sm text-dim font-mono leading-relaxed">
        <Section title="1. ACCEPTANCE OF TERMS">
          By accessing or using the Tokenomicon platform (&quot;Service&quot;), you agree to be bound by these Terms of Service.
          If you do not agree, do not use the Service.
        </Section>

        <Section title="2. DESCRIPTION OF SERVICE">
          Tokenomicon is a compute credit platform that allows users to purchase API compute credits,
          play skill-based games to earn bonus compute credits, and use those credits to access AI model
          APIs through a unified API key. The Service is not a gambling platform — games are skill-based
          and credits have no cash value.
        </Section>

        <Section title="3. ELIGIBILITY">
          You must be at least 18 years of age to use the Service. By using the Service, you represent
          and warrant that you are at least 18 years old and have the legal capacity to enter into
          these Terms.
        </Section>

        <Section title="4. ACCOUNTS">
          You are responsible for maintaining the confidentiality of your account credentials and API keys.
          You are responsible for all activities that occur under your account. You must notify us
          immediately of any unauthorized use of your account.
        </Section>

        <Section title="5. CREDITS AND PAYMENTS">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong className="text-text">Purchased Compute Credits:</strong> Bought via Stripe. Non-refundable once used. Credits are prepaid and have no expiration.</li>
            <li><strong className="text-text">Arena Credits:</strong> Granted daily (100 cr/day). Used to enter skill games. Cannot be purchased or transferred.</li>
            <li><strong className="text-text">Bonus Compute Credits:</strong> Earned through gameplay. Usable for API calls. Cannot be transferred or cashed out.</li>
            <li><strong className="text-text">No Cash Value:</strong> Credits of any type have no monetary value, cannot be redeemed for cash, and are not transferable between accounts.</li>
            <li><strong className="text-text">No Purchase Necessary:</strong> Arena credits are provided free daily. No purchase is required to play games or earn bonus compute.</li>
          </ul>
        </Section>

        <Section title="6. SKILL-BASED GAMES">
          Games on Tokenomicon are designed as skill-based challenges. Outcomes depend on the
          player&apos;s knowledge, strategy, and accuracy. We use provably fair mechanisms (commit-reveal
          cryptographic schemes) to ensure challenge generation is verifiable and tamper-proof.
        </Section>

        <Section title="7. ACCEPTABLE USE">
          You agree not to: abuse or exploit the credit system; create multiple accounts; use automated
          bots to play games; interfere with other users&apos; experience; use the API for illegal purposes;
          attempt to reverse-engineer, decompile, or hack the Service.
        </Section>

        <Section title="8. API USAGE">
          API calls made through your Tokenomicon API key are subject to rate limits and fair use
          policies. We reserve the right to throttle or suspend API access for abuse. API responses
          are provided by third-party AI providers and Tokenomicon makes no guarantees about their
          accuracy or availability.
        </Section>

        <Section title="9. LIMITATION OF LIABILITY">
          THE SERVICE IS PROVIDED &quot;AS IS&quot; WITHOUT WARRANTIES OF ANY KIND. TOKENOMICON SHALL NOT BE
          LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES. OUR TOTAL
          LIABILITY SHALL NOT EXCEED THE AMOUNT YOU PAID US IN THE PRECEDING 12 MONTHS.
        </Section>

        <Section title="10. TERMINATION">
          We may suspend or terminate your account at any time for violation of these Terms.
          Upon termination, unused purchased credits may be refunded at our discretion. Arena and
          bonus credits are forfeited upon termination.
        </Section>

        <Section title="11. CHANGES TO TERMS">
          We may modify these Terms at any time. Continued use of the Service after changes
          constitutes acceptance. Material changes will be notified via email or in-app notice.
        </Section>

        <Section title="12. GOVERNING LAW">
          These Terms are governed by the laws of the State of Delaware, United States, without
          regard to conflict of law principles.
        </Section>

        <Section title="13. CONTACT">
          Questions about these Terms? Contact us at{' '}
          <span className="text-cyan">legal@tokenomicon.io</span>
        </Section>
      </div>

      <footer className="mt-16 pt-6 border-t border-border text-center">
        <a href="/" className="text-[10px] text-dim font-mono hover:text-cyan transition-colors">
          ← Back to Tokenomicon
        </a>
      </footer>
    </main>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-xs tracking-widest text-acid mb-3">{title}</h2>
      <div className="text-dim">{children}</div>
    </section>
  )
}
