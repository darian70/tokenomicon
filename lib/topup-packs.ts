export const TOPUP_PACKS = {
  starter: { amountCents: 1000,  credits: 10000,  label: 'Starter — 10,000 credits',  price: '$10' },
  builder: { amountCents: 4900,  credits: 55000,  label: 'Builder — 55,000 credits',  price: '$49' },
  pro:     { amountCents: 9900,  credits: 120000, label: 'Pro — 120,000 credits',      price: '$99' },
  teams:   { amountCents: 24900, credits: 350000, label: 'Teams — 350,000 credits',    price: '$249' },
} as const

export type TopupPackId = keyof typeof TOPUP_PACKS
