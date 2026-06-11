import { db } from './db'
import { getBalances } from './ledger'
import { sendBudgetAlertEmail } from './email'

const ALERT_DEBOUNCE_MS = 24 * 60 * 60 * 1000 // once per day max

export async function checkAndSendBudgetAlert(userId: string, appUrl: string): Promise<void> {
  const config = await db.budgetAlertConfig.findUnique({ where: { userId } })
  if (!config?.enabled) return

  // Debounce: don't send more than once per day
  if (config.lastAlertAt && Date.now() - config.lastAlertAt.getTime() < ALERT_DEBOUNCE_MS) return

  const balances = await getBalances(userId)
  const totalCompute = balances.purchased_compute + balances.bonus_compute
  if (totalCompute >= config.thresholdCredits) return

  const sent = await sendBudgetAlertEmail({
    toEmail: config.email,
    balanceCredits: totalCompute,
    thresholdCredits: config.thresholdCredits,
    walletUrl: `${appUrl}/wallet`,
  })

  if (sent) {
    await db.budgetAlertConfig.update({
      where: { userId },
      data: { lastAlertAt: new Date() },
    }).catch(() => {})
  }
}
