import { Resend } from 'resend'
import { env } from './env'

let _resend: Resend | null = null

function getResend(): Resend | null {
  if (!env.RESEND_API_KEY) return null
  if (!_resend) _resend = new Resend(env.RESEND_API_KEY)
  return _resend
}

export interface BudgetAlertEmailData {
  toEmail: string
  balanceCredits: number
  thresholdCredits: number
  walletUrl: string
}

export async function sendBudgetAlertEmail(data: BudgetAlertEmailData): Promise<boolean> {
  const resend = getResend()
  if (!resend) return false

  const from = env.EMAIL_FROM ?? 'Tokenomicon <alerts@tokenomicon.io>'
  const usd = (data.balanceCredits * 0.001).toFixed(2)
  const thresholdUsd = (data.thresholdCredits * 0.001).toFixed(2)

  try {
    await resend.emails.send({
      from,
      to: data.toEmail,
      subject: `Low balance: ${data.balanceCredits.toLocaleString()} credits remaining`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Courier New', monospace; background: #0a0a0a; color: #e0e0e0; margin: 0; padding: 40px 20px; }
    .container { max-width: 520px; margin: 0 auto; }
    .header { border-bottom: 1px solid #2a2a2a; padding-bottom: 20px; margin-bottom: 24px; }
    .brand { color: #e53e3e; font-size: 18px; font-weight: 900; letter-spacing: 4px; text-transform: uppercase; }
    .balance { background: #111; border: 1px solid #333; padding: 20px; margin: 24px 0; text-align: center; }
    .balance-value { font-size: 36px; font-weight: 900; color: #f59e0b; }
    .balance-label { font-size: 11px; color: #666; letter-spacing: 2px; text-transform: uppercase; margin-top: 4px; }
    .cta { display: block; background: #e53e3e; color: #fff; text-decoration: none; text-align: center; padding: 14px 24px; font-size: 13px; letter-spacing: 2px; text-transform: uppercase; margin: 24px 0; font-weight: 700; }
    .footer { border-top: 1px solid #2a2a2a; padding-top: 20px; margin-top: 24px; font-size: 10px; color: #444; }
    p { font-size: 13px; color: #999; line-height: 1.6; }
    code { background: #1a1a1a; padding: 2px 6px; border: 1px solid #333; color: #7dd3fc; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="brand">TOKENOMICON</div>
    </div>
    <p>Your API compute balance has dropped below your alert threshold.</p>
    <div class="balance">
      <div class="balance-value">${data.balanceCredits.toLocaleString()}</div>
      <div class="balance-label">Credits remaining (~$${usd})</div>
    </div>
    <p>
      Your budget alert threshold is set to <code>${data.thresholdCredits.toLocaleString()} credits (~$${thresholdUsd})</code>.
      API calls will continue until your balance reaches zero.
    </p>
    <a href="${data.walletUrl}" class="cta">Top Up Credits →</a>
    <p style="font-size: 11px;">
      You can also enable <strong style="color: #c0c0c0;">Auto-Topup</strong> in your wallet to recharge automatically
      before you run out — no interruptions to your API usage.
    </p>
    <div class="footer">
      <p>To disable these alerts, visit your <a href="${data.walletUrl}" style="color: #666;">Wallet settings</a>.<br>
      Tokenomicon — credit-powered AI API</p>
    </div>
  </div>
</body>
</html>`,
    })
    return true
  } catch {
    return false
  }
}
