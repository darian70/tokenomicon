import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Privacy Policy — Tokenomicon',
  description: 'Tokenomicon Privacy Policy',
}

export default function PrivacyPage() {
  return (
    <main className="min-h-screen px-6 py-16 max-w-3xl mx-auto">
      <h1 className="font-display text-3xl font-black text-blood glow-red tracking-wide mb-8">PRIVACY POLICY</h1>
      <p className="text-[10px] text-dim font-mono mb-8">Last updated: May 2026</p>

      <div className="space-y-8 text-sm text-dim font-mono leading-relaxed">
        <Section title="1. INFORMATION WE COLLECT">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong className="text-text">Account Information:</strong> Email address, display name, and authentication data provided through our identity provider (Clerk).</li>
            <li><strong className="text-text">Usage Data:</strong> API call metadata (timestamps, model used, token counts), game session data (scores, rewards), and credit transaction history.</li>
            <li><strong className="text-text">Technical Data:</strong> IP address, browser type, device information, and access logs for security and performance monitoring.</li>
            <li><strong className="text-text">Payment Data:</strong> Processed by Stripe. We do not store credit card numbers or bank details.</li>
          </ul>
        </Section>

        <Section title="2. HOW WE USE YOUR INFORMATION">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>Provide and operate the Service (API routing, game sessions, credit management).</li>
            <li>Process payments and maintain accurate credit balances.</li>
            <li>Ensure game fairness and detect fraud or abuse.</li>
            <li>Generate anonymized leaderboard data and aggregate statistics.</li>
            <li>Communicate service updates, security alerts, and billing notices.</li>
            <li>Comply with legal obligations.</li>
          </ul>
        </Section>

        <Section title="3. WHAT WE DO NOT DO">
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li>We do <strong className="text-acid">not</strong> sell your personal data to third parties.</li>
            <li>We do <strong className="text-acid">not</strong> read or store the content of your API requests or responses.</li>
            <li>We do <strong className="text-acid">not</strong> use your data for AI model training.</li>
            <li>We do <strong className="text-acid">not</strong> share individual game performance data with third parties.</li>
          </ul>
        </Section>

        <Section title="4. DATA SHARING">
          We share data only with:
          <ul className="list-disc pl-5 space-y-2 mt-2">
            <li><strong className="text-text">AI Providers (OpenAI, Anthropic, Groq):</strong> Your API request content is forwarded to the selected model provider. Their privacy policies apply to that content.</li>
            <li><strong className="text-text">Stripe:</strong> Payment processing. Subject to Stripe&apos;s privacy policy.</li>
            <li><strong className="text-text">Clerk:</strong> Authentication services. Subject to Clerk&apos;s privacy policy.</li>
            <li><strong className="text-text">Law Enforcement:</strong> When required by law, court order, or subpoena.</li>
          </ul>
        </Section>

        <Section title="5. DATA RETENTION">
          Account data is retained while your account is active. Credit transaction history is retained
          for 7 years for financial compliance. Game session data is retained for 1 year. You may
          request deletion of your account and associated data at any time.
        </Section>

        <Section title="6. SECURITY">
          We implement industry-standard security measures including: API key hashing (SHA-256),
          TLS encryption in transit, encrypted storage at rest, role-based access controls,
          and regular security audits. See our Security page for details.
        </Section>

        <Section title="7. YOUR RIGHTS">
          You have the right to: access your personal data; request correction of inaccurate data;
          request deletion of your data; export your data in a portable format; opt out of
          non-essential communications. Contact us at{' '}
          <span className="text-cyan">privacy@tokenomicon.io</span> to exercise these rights.
        </Section>

        <Section title="8. COOKIES">
          We use essential cookies for authentication and session management. We do not use
          advertising or tracking cookies. Analytics are privacy-respecting and anonymized.
        </Section>

        <Section title="9. CHILDREN">
          The Service is not intended for users under 18. We do not knowingly collect data
          from minors. If we learn we have collected data from a minor, we will delete it promptly.
        </Section>

        <Section title="10. CHANGES">
          We may update this Privacy Policy. Material changes will be communicated via email
          or in-app notice at least 30 days before taking effect.
        </Section>

        <Section title="11. CONTACT">
          Questions? Contact our Data Protection Officer at{' '}
          <span className="text-cyan">privacy@tokenomicon.io</span>
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
