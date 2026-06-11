import { NextResponse } from 'next/server'
import { listEnabledModels } from '@/lib/server/pricing'

export async function GET() {
  const models = listEnabledModels()
  return NextResponse.json({
    object: 'list',
    data: models.map((m) => ({
      id: m.model,
      object: 'model',
      provider: m.provider,
      display_name: m.displayName,
      displayName: m.displayName,
      tier: m.tier,
      family: m.family,
      inputCostPer1kCredits: m.inputCostPer1kCredits,
      outputCostPer1kCredits: m.outputCostPer1kCredits,
      pricing: {
        input_credits_per_1k_tokens: m.inputCostPer1kCredits,
        output_credits_per_1k_tokens: m.outputCostPer1kCredits,
      },
      max_output_tokens: m.maxOutputTokens,
      capabilities: {
        chat: m.family === 'chat',
        embedding: m.family === 'embedding',
        vision: ['gpt-4o', 'gpt-4o-mini', 'claude-sonnet-4-20250514', 'google/gemini-2.5-flash-preview', 'google/gemini-2.5-pro-preview', 'meta-llama/llama-4-maverick'].includes(m.modelId),
        tool_use: m.family === 'chat' && !['o3-mini'].includes(m.modelId),
      },
    })),
  })
}
