import { z } from 'zod'

// Transform empty strings to undefined so optional() works correctly
const optionalString = z.string().optional().transform((val) => (val === '' ? undefined : val))

const envSchema = z.object({
  DATABASE_URL: optionalString,
  STRIPE_SECRET_KEY: optionalString,
  STRIPE_WEBHOOK_SECRET: optionalString,
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: optionalString,
  STRIPE_PRICE_DEV_MONTHLY: optionalString,
  STRIPE_PRICE_PRO_MONTHLY: optionalString,
  TOKENOMICON_ADMIN_EMAILS: optionalString,
  OPENAI_API_KEY: optionalString,
  ANTHROPIC_API_KEY: optionalString,
  GROQ_API_KEY: optionalString,
  OPENROUTER_API_KEY: optionalString,
  RESEND_API_KEY: optionalString,
  EMAIL_FROM: optionalString,
  // Vercel Cron auth — set to a long random string and reference it as the
  // Authorization secret in vercel.json's cron config.
  CRON_SECRET: optionalString,
})

export const env = envSchema.parse(process.env)

export function requiredEnv(name: keyof typeof env): string {
  const value = env[name]
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`)
  }
  return value
}
