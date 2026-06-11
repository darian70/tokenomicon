'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'

export default function DocsApiKey({ baseUrl }: { baseUrl: string }) {
  const [keyHint, setKeyHint] = useState<string | null>(null)
  const [hasKey, setHasKey] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  useEffect(() => {
    fetch('/api/keys')
      .then(r => r.json())
      .then((data: { keys?: Array<{ keyPrefix: string }> }) => {
        const first = data.keys?.[0]
        if (first) {
          setKeyHint(`${first.keyPrefix}••••••••••••`)
          setHasKey(true)
        }
      })
      .catch(() => {})
  }, [])

  const apiKey = keyHint ?? 'YOUR_TOKENOMICON_API_KEY'

  function copy(id: string, text: string) {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id)
      setTimeout(() => setCopied(null), 1800)
    })
  }

  return (
    <div className="space-y-10">

      {/* MIGRATION GUIDE — the hero section */}
      <section>
        <h2 className="font-display text-xs tracking-widest text-acid mb-1">MIGRATE FROM OPENAI IN 2 LINES</h2>
        <p className="text-[10px] text-dim font-mono mb-4">Change baseURL and apiKey. Everything else stays identical.</p>
        <div className="panel border border-gold/40 bg-gold/5">
          <div className="px-4 py-2 border-b border-gold/20 flex items-center justify-between">
            <span className="text-[10px] font-mono text-gold tracking-widest">BEFORE (OpenAI)</span>
          </div>
          <pre className="p-4 text-xs font-mono text-dim overflow-x-auto whitespace-pre">{`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "sk-proj-...",               // ← change this
  // no baseURL needed for OpenAI
});`}</pre>
        </div>
        <div className="mt-1 panel border border-acid/40 bg-acid/5">
          <div className="px-4 py-2 border-b border-acid/20 flex items-center justify-between">
            <span className="text-[10px] font-mono text-acid tracking-widest">AFTER (Tokenomicon)</span>
            <button
              onClick={() => copy('migration', `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  apiKey: "${apiKey}",\n  baseURL: "${baseUrl}/api/v1",\n});`)}
              className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
            >
              {copied === 'migration' ? 'COPIED!' : 'COPY'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "${apiKey}",     // ← your Tokenomicon key
  baseURL: "${baseUrl}/api/v1",  // ← add this
});

// Nothing else changes. All your existing code works.`}</pre>
        </div>
        {!hasKey && (
          <p className="text-[10px] text-dim font-mono mt-2">
            <Link href="/profile" className="text-acid hover:underline">Create an API key</Link>
            {' '}to see your key in these examples.
          </p>
        )}
      </section>

      {/* QUICK START */}
      <section>
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">QUICK START</h2>
        <div className="panel border border-border">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-mono text-dim tracking-widest">NODE.JS / TYPESCRIPT</span>
            <button
              onClick={() => copy('quickstart', `import OpenAI from "openai";\n\nconst client = new OpenAI({\n  apiKey: "${apiKey}",\n  baseURL: "${baseUrl}/api/v1",\n});\n\nconst res = await client.chat.completions.create({\n  model: "gpt-4o-mini",\n  messages: [{ role: "user", content: "Hello!" }],\n});\n\nconsole.log(res.choices[0].message.content);`)}
              className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
            >
              {copied === 'quickstart' ? 'COPIED!' : 'COPY'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`import OpenAI from "openai";

const client = new OpenAI({
  apiKey: "${apiKey}",
  baseURL: "${baseUrl}/api/v1",
});

const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "Hello!" }],
});

console.log(res.choices[0].message.content);`}</pre>
        </div>
      </section>

      {/* AUTHENTICATION */}
      <section>
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">AUTHENTICATION</h2>
        <div className="panel border border-border p-4 space-y-2 text-xs font-mono text-dim">
          <p>Include your API key in the <code className="text-cyan">Authorization</code> header on every request:</p>
          <pre className="bg-void border border-border p-3 text-cyan mt-2">{`Authorization: Bearer ${apiKey}`}</pre>
          <p className="mt-2">
            Generate and manage keys in your{' '}
            <Link href="/profile" className="text-acid hover:underline">Profile → API Keys</Link> tab.
            Keys never expire — revoke them manually if compromised.
          </p>
        </div>
      </section>

      {/* STREAMING */}
      <section>
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">STREAMING</h2>
        <div className="panel border border-border">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-mono text-dim tracking-widest">SERVER-SENT EVENTS</span>
            <button
              onClick={() => copy('stream', `const stream = await client.chat.completions.create({\n  model: "claude-sonnet-4-20250514",\n  messages: [{ role: "user", content: "Write me a poem." }],\n  stream: true,\n});\n\nfor await (const chunk of stream) {\n  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");\n}`)}
              className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
            >
              {copied === 'stream' ? 'COPIED!' : 'COPY'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`const stream = await client.chat.completions.create({
  model: "claude-sonnet-4-20250514",
  messages: [{ role: "user", content: "Write me a poem." }],
  stream: true,
});

for await (const chunk of stream) {
  process.stdout.write(chunk.choices[0]?.delta?.content ?? "");
}`}</pre>
          <p className="px-4 pb-3 text-[10px] text-dim font-mono">Credits are debited after the stream completes based on actual tokens used.</p>
        </div>
      </section>

      {/* FUNCTION CALLING */}
      <section>
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">FUNCTION CALLING / TOOL USE</h2>
        <div className="panel border border-border">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-mono text-dim tracking-widest">OPENAI SDK — TOOL USE</span>
            <button
              onClick={() => copy('tools', `const res = await client.chat.completions.create({\n  model: "gpt-4o-mini",\n  messages: [{ role: "user", content: "What's the weather in Paris?" }],\n  tools: [\n    {\n      type: "function",\n      function: {\n        name: "get_weather",\n        description: "Get current weather for a city.",\n        parameters: {\n          type: "object",\n          properties: {\n            city: { type: "string", description: "City name" },\n          },\n          required: ["city"],\n        },\n      },\n    },\n  ],\n  tool_choice: "auto",\n});\n\nconst message = res.choices[0].message;\nif (message.tool_calls) {\n  // Execute your tool here\n  const { city } = JSON.parse(message.tool_calls[0].function.arguments);\n  console.log("Model wants weather for:", city);\n}`)}
              className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
            >
              {copied === 'tools' ? 'COPIED!' : 'COPY'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`const res = await client.chat.completions.create({
  model: "gpt-4o-mini",
  messages: [{ role: "user", content: "What's the weather in Paris?" }],
  tools: [
    {
      type: "function",
      function: {
        name: "get_weather",
        description: "Get current weather for a city.",
        parameters: {
          type: "object",
          properties: {
            city: { type: "string", description: "City name" },
          },
          required: ["city"],
        },
      },
    },
  ],
  tool_choice: "auto",
});

const message = res.choices[0].message;
if (message.tool_calls) {
  const { city } = JSON.parse(message.tool_calls[0].function.arguments);
  console.log("Model wants weather for:", city);
  // → send tool result back in the next request
}`}</pre>
          <p className="px-4 pb-3 text-[10px] text-dim font-mono">
            Supported on: GPT-4o, GPT-4o Mini, Claude Sonnet 4, Claude Haiku, Llama 3.3, Gemini 2.5, and most OpenRouter models.
          </p>
        </div>
      </section>

      {/* VISION */}
      <section>
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">VISION — IMAGE INPUT</h2>
        <div className="panel border border-border">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-mono text-dim tracking-widest">IMAGE URL OR BASE64</span>
            <button
              onClick={() => copy('vision', `const res = await client.chat.completions.create({\n  model: "gpt-4o",\n  messages: [\n    {\n      role: "user",\n      content: [\n        { type: "text", text: "What do you see in this image?" },\n        {\n          type: "image_url",\n          image_url: { url: "https://example.com/photo.jpg" },\n        },\n      ],\n    },\n  ],\n});\n\nconsole.log(res.choices[0].message.content);`)}
              className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
            >
              {copied === 'vision' ? 'COPIED!' : 'COPY'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`const res = await client.chat.completions.create({
  model: "gpt-4o",
  messages: [
    {
      role: "user",
      content: [
        { type: "text", text: "What do you see in this image?" },
        {
          type: "image_url",
          image_url: { url: "https://example.com/photo.jpg" },
          // or base64: "data:image/jpeg;base64,/9j/4AAQ..."
        },
      ],
    },
  ],
});

console.log(res.choices[0].message.content);`}</pre>
          <p className="px-4 pb-3 text-[10px] text-dim font-mono">
            Vision models: GPT-4o, GPT-4o Mini, Claude Sonnet 4, Gemini 2.5 Flash/Pro, Llama 4 Maverick.
          </p>
        </div>
      </section>

      {/* EMBEDDINGS */}
      <section>
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">EMBEDDINGS</h2>
        <div className="panel border border-border">
          <div className="px-4 py-2 border-b border-border flex items-center justify-between">
            <span className="text-[10px] font-mono text-dim tracking-widest">POST /v1/embeddings</span>
            <button
              onClick={() => copy('embed', `// Single string\nconst res = await client.embeddings.create({\n  model: "text-embedding-3-small",\n  input: "The quick brown fox jumps over the lazy dog",\n});\nconsole.log(res.data[0].embedding); // float[]\n\n// Batch (up to 2048 strings)\nconst batch = await client.embeddings.create({\n  model: "text-embedding-3-small",\n  input: ["first document", "second document", "third document"],\n});\nconsole.log(batch.data.map(d => d.embedding));`)}
              className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
            >
              {copied === 'embed' ? 'COPIED!' : 'COPY'}
            </button>
          </div>
          <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`// Single string
const res = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: "The quick brown fox jumps over the lazy dog",
});
console.log(res.data[0].embedding); // float[]

// Batch (up to 2048 strings)
const batch = await client.embeddings.create({
  model: "text-embedding-3-small",
  input: ["first document", "second document", "third document"],
});
console.log(batch.data.map(d => d.embedding));`}</pre>
          <p className="px-4 pb-3 text-[10px] text-dim font-mono">
            Models: text-embedding-3-small (1 cr/1K tokens), text-embedding-3-large (2 cr/1K tokens), text-embedding-ada-002 (1 cr/1K tokens).
          </p>
        </div>
      </section>

      {/* INTEGRATIONS */}
      <section>
        <h2 className="font-display text-xs tracking-widest text-acid mb-4">FRAMEWORK INTEGRATIONS</h2>
        <div className="space-y-4">

          {/* Vercel AI SDK */}
          <div className="panel border border-border">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-mono text-dim tracking-widest">VERCEL AI SDK</span>
              <button
                onClick={() => copy('vercel-ai', `import { createOpenAI } from "@ai-sdk/openai";\nimport { generateText } from "ai";\n\nconst tokenomicon = createOpenAI({\n  apiKey: "${apiKey}",\n  baseURL: "${baseUrl}/api/v1",\n});\n\nconst { text } = await generateText({\n  model: tokenomicon("gpt-4o-mini"),\n  prompt: "Hello!",\n});`)}
                className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
              >
                {copied === 'vercel-ai' ? 'COPIED!' : 'COPY'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

const tokenomicon = createOpenAI({
  apiKey: "${apiKey}",
  baseURL: "${baseUrl}/api/v1",
});

const { text } = await generateText({
  model: tokenomicon("gpt-4o-mini"),
  prompt: "Hello!",
});`}</pre>
          </div>

          {/* LangChain */}
          <div className="panel border border-border">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-mono text-dim tracking-widest">LANGCHAIN (PYTHON)</span>
              <button
                onClick={() => copy('langchain', `from langchain_openai import ChatOpenAI\n\nllm = ChatOpenAI(\n    model="gpt-4o-mini",\n    api_key="${apiKey}",\n    base_url="${baseUrl}/api/v1",\n)\n\nresponse = llm.invoke("Hello!")\nprint(response.content)`)}
                className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
              >
                {copied === 'langchain' ? 'COPIED!' : 'COPY'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`from langchain_openai import ChatOpenAI

llm = ChatOpenAI(
    model="gpt-4o-mini",
    api_key="${apiKey}",
    base_url="${baseUrl}/api/v1",
)

response = llm.invoke("Hello!")
print(response.content)`}</pre>
          </div>

          {/* LangChain JS */}
          <div className="panel border border-border">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-mono text-dim tracking-widest">LANGCHAIN.JS</span>
              <button
                onClick={() => copy('langchain-js', `import { ChatOpenAI } from "@langchain/openai";\n\nconst model = new ChatOpenAI({\n  model: "gpt-4o-mini",\n  apiKey: "${apiKey}",\n  configuration: {\n    baseURL: "${baseUrl}/api/v1",\n  },\n});\n\nconst res = await model.invoke("Hello!");\nconsole.log(res.content);`)}
                className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
              >
                {copied === 'langchain-js' ? 'COPIED!' : 'COPY'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`import { ChatOpenAI } from "@langchain/openai";

const model = new ChatOpenAI({
  model: "gpt-4o-mini",
  apiKey: "${apiKey}",
  configuration: {
    baseURL: "${baseUrl}/api/v1",
  },
});

const res = await model.invoke("Hello!");
console.log(res.content);`}</pre>
          </div>

          {/* Python openai */}
          <div className="panel border border-border">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-mono text-dim tracking-widest">PYTHON (openai SDK)</span>
              <button
                onClick={() => copy('python', `import openai\n\nclient = openai.OpenAI(\n    api_key="${apiKey}",\n    base_url="${baseUrl}/api/v1",\n)\n\nres = client.chat.completions.create(\n    model="gpt-4o-mini",\n    messages=[{"role": "user", "content": "Hello!"}],\n)\n\nprint(res.choices[0].message.content)`)}
                className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
              >
                {copied === 'python' ? 'COPIED!' : 'COPY'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`import openai

client = openai.OpenAI(
    api_key="${apiKey}",
    base_url="${baseUrl}/api/v1",
)

res = client.chat.completions.create(
    model="gpt-4o-mini",
    messages=[{"role": "user", "content": "Hello!"}],
)

print(res.choices[0].message.content)`}</pre>
          </div>

          {/* cURL */}
          <div className="panel border border-border">
            <div className="px-4 py-2 border-b border-border flex items-center justify-between">
              <span className="text-[10px] font-mono text-dim tracking-widest">cURL</span>
              <button
                onClick={() => copy('curl', `curl ${baseUrl}/api/v1/chat/completions \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -H "Content-Type: application/json" \\\n  -d '{\n    "model": "gpt-4o-mini",\n    "messages": [{"role": "user", "content": "Hello!"}]\n  }'`)}
                className="text-[10px] font-mono text-dim hover:text-acid transition-colors px-2 py-0.5 border border-border hover:border-acid/40"
              >
                {copied === 'curl' ? 'COPIED!' : 'COPY'}
              </button>
            </div>
            <pre className="p-4 text-xs font-mono text-cyan overflow-x-auto whitespace-pre">{`curl ${baseUrl}/api/v1/chat/completions \\
  -H "Authorization: Bearer ${apiKey}" \\
  -H "Content-Type: application/json" \\
  -d '{
    "model": "gpt-4o-mini",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}</pre>
          </div>
        </div>
      </section>
    </div>
  )
}
