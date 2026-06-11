import type { StreamChunk, ToolCall } from './types'

export function makeOpenAICompatStream(
  fetchFn: () => Promise<Response>,
): ReadableStream<StreamChunk> {
  return new ReadableStream<StreamChunk>({
    async start(controller) {
      let completionTokens = 0
      // Accumulate tool call deltas across chunks
      const toolCallMap: Record<number, { id: string; name: string; arguments: string }> = {}

      try {
        const res = await fetchFn()
        if (!res.ok) {
          const body = await res.text()
          throw new Error(`${res.status}: ${body}`)
        }

        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        let finalFinishReason: string | undefined

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed.startsWith('data:')) continue
            const data = trimmed.slice(5).trim()
            if (data === '[DONE]') {
              const toolCalls = buildToolCalls(toolCallMap)
              controller.enqueue({
                delta: '',
                done: true,
                completionTokens,
                toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
                finishReason: finalFinishReason,
              })
              controller.close()
              return
            }
            try {
              const json = JSON.parse(data)
              const choice = json.choices?.[0]
              if (!choice) continue

              if (choice.finish_reason) finalFinishReason = choice.finish_reason
              if (json.usage?.completion_tokens) completionTokens = json.usage.completion_tokens as number

              const delta = choice.delta
              if (!delta) continue

              // Accumulate tool call argument deltas and emit live progress
              if (delta.tool_calls) {
                for (const tc of delta.tool_calls) {
                  const idx = tc.index ?? 0
                  if (!toolCallMap[idx]) {
                    toolCallMap[idx] = { id: tc.id ?? '', name: tc.function?.name ?? '', arguments: '' }
                  }
                  if (tc.id) toolCallMap[idx].id = tc.id
                  if (tc.function?.name) toolCallMap[idx].name = tc.function.name
                  if (tc.function?.arguments) toolCallMap[idx].arguments += tc.function.arguments
                }
                // Emit incremental progress so the UI can animate live args
                const progress = Object.entries(toolCallMap).map(([i, tc]) => ({
                  index: Number(i),
                  id: tc.id,
                  name: tc.name,
                  argumentsSoFar: tc.arguments,
                }))
                controller.enqueue({ delta: '', done: false, toolCallProgress: progress })
              }

              const content = (delta.content as string) ?? ''
              if (content) {
                completionTokens++
                controller.enqueue({ delta: content, done: false })
              }
            } catch { /* skip malformed chunks */ }
          }
        }

        const toolCalls = buildToolCalls(toolCallMap)
        controller.enqueue({
          delta: '',
          done: true,
          completionTokens,
          toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
          finishReason: finalFinishReason,
        })
        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })
}

function buildToolCalls(
  map: Record<number, { id: string; name: string; arguments: string }>,
): ToolCall[] {
  return Object.values(map)
    .filter((tc) => tc.id && tc.name)
    .map((tc) => ({
      id: tc.id,
      type: 'function' as const,
      function: { name: tc.name, arguments: tc.arguments },
    }))
}
