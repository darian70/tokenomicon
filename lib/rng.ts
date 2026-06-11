// Red slots on a standard roulette wheel
const RED_NUMBERS = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36])

export function spinWheel(): { number: number; color: 'red' | 'black' | 'green' } {
  const number = Math.floor(Math.random() * 37) // 0-36
  const color = number === 0 ? 'green' : RED_NUMBERS.has(number) ? 'red' : 'black'
  return { number, color }
}

export function calculatePayout(bet: { type: string; number?: number; amount: number }, result: { number: number; color: string }): number {
  switch (bet.type) {
    case 'red':
      return result.color === 'red' ? bet.amount * 2 : 0
    case 'black':
      return result.color === 'black' ? bet.amount * 2 : 0
    case 'dozen_1':
      return result.number >= 1 && result.number <= 12 ? bet.amount * 3 : 0
    case 'dozen_2':
      return result.number >= 13 && result.number <= 24 ? bet.amount * 3 : 0
    case 'dozen_3':
      return result.number >= 25 && result.number <= 36 ? bet.amount * 3 : 0
    case 'number':
      return bet.number === result.number ? bet.amount * 36 : 0
    default:
      return 0
  }
}

export function formatCredits(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(2)}M`
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(1)}K`
  return amount.toLocaleString()
}
