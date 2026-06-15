import { GameType, Prisma } from '@prisma/client'
import crypto from 'node:crypto'
import { db } from '@/lib/server/db'
import { addLedgerEntry } from '@/lib/server/ledger'
import { createFairnessProof, fairRandom } from '@/lib/server/fairness'
import { type DifficultyTier, TIER_CONFIGS, ECONOMY, TIER_SUBSCRIPTION_REQUIREMENT, calculateReward, getFlavorMessage, isChanceGame, chanceGamesEnabled } from '@/lib/server/economy'
import { computeStreak } from '@/lib/server/streak'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function sample<T>(arr: T[], serverSeed: string, clientSeed: string, nonce: number): T {
  const combined = crypto.createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}`).digest('hex')
  const idx = parseInt(combined.slice(0, 8), 16) % arr.length
  return arr[idx]
}

// ---------------------------------------------------------------------------
// Challenge pools — expanded from 3 each to 12+
// ---------------------------------------------------------------------------

// Token Prophet v2 — head-to-head comparison game.
// Each pair has two prompts. The player picks which one generates more output tokens.
// token counts are calibrated estimates (chars/4 * verbosity factor + overhead).
// Pairs are ordered easy → hard within each tier bucket.
interface ProphetPair {
  promptA: string
  promptB: string
  longerIs: 'A' | 'B'   // which prompt produces more tokens
  tokensA: number        // estimated output tokens (revealed after submit)
  tokensB: number
  hint?: string          // optional reveal hint explaining the answer
}

const TOKEN_PROPHET_PAIRS: ProphetPair[] = [
  // ── SANDBOX: obvious gaps ──────────────────────────────────────────────────
  {
    promptA: 'What does API stand for?',
    promptB: 'Write a step-by-step guide to designing a REST API from scratch.',
    longerIs: 'B', tokensA: 8, tokensB: 320,
    hint: 'A definition needs ~8 tokens. A step-by-step guide needs 300+.',
  },
  {
    promptA: 'Is Python interpreted or compiled?',
    promptB: 'Compare Python, Go, and Rust for building high-throughput backend services.',
    longerIs: 'B', tokensA: 12, tokensB: 280,
    hint: 'A yes/no with a one-line explanation vs a multi-section comparison.',
  },
  {
    promptA: 'Print "hello world" in Python.',
    promptB: 'Explain how garbage collection works in Python with examples.',
    longerIs: 'B', tokensA: 10, tokensB: 240,
    hint: 'One-liner code answer vs a full technical explanation with examples.',
  },
  {
    promptA: 'What year was JavaScript created?',
    promptB: 'Trace the history of JavaScript from 1995 to today, including major milestones.',
    longerIs: 'B', tokensA: 6, tokensB: 350,
    hint: '1995. vs a multi-decade timeline.',
  },
  {
    promptA: 'What is a closure?',
    promptB: 'Write a comprehensive tutorial on closures with five code examples.',
    longerIs: 'B', tokensA: 55, tokensB: 420,
    hint: 'Short definition vs tutorial with multiple examples.',
  },
  {
    promptA: 'Say only "OK".',
    promptB: 'Summarize the history of the internet in three paragraphs.',
    longerIs: 'B', tokensA: 2, tokensB: 180,
    hint: 'Literal instruction to produce one word vs three paragraphs of history.',
  },
  // ── PRODUCTION: closer calls ──────────────────────────────────────────────
  {
    promptA: 'List the HTTP status codes and their meanings.',
    promptB: 'Explain the difference between 401 and 403 status codes.',
    longerIs: 'A', tokensA: 280, tokensB: 80,
    hint: 'A full list of 40+ HTTP codes vs a targeted two-sentence comparison.',
  },
  {
    promptA: 'What are the SOLID principles?',
    promptB: 'Give a one-sentence definition of the Single Responsibility Principle.',
    longerIs: 'A', tokensA: 220, tokensB: 25,
    hint: 'All five principles with explanations vs one sentence.',
  },
  {
    promptA: 'Write a haiku about databases.',
    promptB: 'Explain eventual consistency in distributed databases.',
    longerIs: 'B', tokensA: 20, tokensB: 150,
    hint: 'A haiku is exactly 17 syllables. Eventual consistency needs context.',
  },
  {
    promptA: 'Name three JavaScript frameworks.',
    promptB: 'Compare React, Vue, and Angular for a large enterprise application.',
    longerIs: 'B', tokensA: 18, tokensB: 260,
    hint: 'A bulleted list of three names vs a detailed multi-factor comparison.',
  },
  {
    promptA: 'What is a race condition?',
    promptB: 'What is a deadlock?',
    longerIs: 'A', tokensA: 110, tokensB: 90,
    hint: 'Race conditions require explaining non-deterministic timing. Deadlock has a cleaner two-sentence definition.',
  },
  {
    promptA: 'Write a regex that matches email addresses.',
    promptB: 'Explain how regex works for a beginner.',
    longerIs: 'B', tokensA: 30, tokensB: 160,
    hint: 'A regex pattern is a single line. Teaching regex from scratch takes paragraphs.',
  },
  // ── BLACKBOX: tricky edge cases ───────────────────────────────────────────
  {
    promptA: 'Summarize the CAP theorem in one sentence.',
    promptB: 'List every planet in the solar system.',
    longerIs: 'B', tokensA: 28, tokensB: 45,
    hint: 'A tight constraint ("one sentence") keeps CAP short. 8 planets × ~5 tokens each = more.',
  },
  {
    promptA: 'Write a function that returns true if a number is even.',
    promptB: 'Write a function that checks if a string is a palindrome.',
    longerIs: 'B', tokensA: 30, tokensB: 75,
    hint: 'Even check: one line. Palindrome: needs edge case handling (case, spaces) — models often add comments.',
  },
  {
    promptA: 'Explain what "undefined" means in JavaScript.',
    promptB: 'Explain what "null" means in JavaScript.',
    longerIs: 'A', tokensA: 120, tokensB: 70,
    hint: 'undefined has more nuance: declared but not assigned, function return, optional params. null is simpler.',
  },
  {
    promptA: 'What are the rules of chess?',
    promptB: 'Write a complete implementation of a chess engine in Python.',
    longerIs: 'B', tokensA: 350, tokensB: 900,
    hint: 'Rules are long but bounded. A chess engine is hundreds of lines of code.',
  },
  {
    promptA: 'Translate "Hello, how are you?" to French.',
    promptB: 'Translate "Hello, how are you?" to all Romance languages.',
    longerIs: 'B', tokensA: 10, tokensB: 65,
    hint: 'One translation vs six (French, Spanish, Italian, Portuguese, Romanian, Catalan).',
  },
  {
    promptA: 'Name the capital of France.',
    promptB: 'Name the capital of every country in Europe.',
    longerIs: 'B', tokensA: 3, tokensB: 320,
    hint: 'Paris. vs 44 European capitals.',
  },
]

const PROMPT_GOLF_TARGETS = [
  { text: 'Return a JSON object with keys title and score.', required: ['json', 'title', 'score'] },
  { text: 'Generate a SQL query selecting top 5 users by spend.', required: ['sql', 'top', 'spend'] },
  { text: 'Write a Python function named slugify.', required: ['python', 'function', 'slugify'] },
  { text: 'Generate TypeScript types for a user profile with name and email.', required: ['typescript', 'type', 'name', 'email'] },
  { text: 'Write a bash one-liner to count lines in all .ts files.', required: ['bash', 'count', 'lines', 'ts'] },
  { text: 'Create a CSS class for a glowing border animation.', required: ['css', 'glow', 'border', 'animation'] },
  { text: 'Write a regex pattern matching email addresses.', required: ['regex', 'email'] },
  { text: 'Generate a Prisma model for a credit ledger entry.', required: ['prisma', 'model', 'credit', 'ledger'] },
  { text: 'Write a React hook that debounces an input value.', required: ['react', 'hook', 'debounce'] },
  { text: 'Create an SQL migration adding an index on userId and createdAt.', required: ['sql', 'index', 'userId', 'createdAt'] },
  { text: 'Write a Dockerfile for a Node.js API server.', required: ['docker', 'node', 'api'] },
  { text: 'Generate a cron expression for every weekday at 9 AM UTC.', required: ['cron', 'weekday', '9'] },
]

// Bug Exorcist — tiered challenge pools.
// Each entry: snippet (shown to player + used as BUG_PATCH_LOOKUP key client-side),
// mustInclude (scoring), context (surrounding code for realism), language, explanation.
interface BugChallenge {
  snippet: string
  mustInclude: string
  context: string        // shown in the code block; snippet appears highlighted within it
  language: string       // syntax highlighting hint for the client
  explanation: string    // shown on result screen: why this is a bug
  [key: string]: unknown // allows assignment to Record<string, unknown>
}

// SANDBOX — obvious, classic JavaScript/Python mistakes
const SANDBOX_BUGS: BugChallenge[] = [
  {
    snippet: 'if (items.length = 0) return []',
    mustInclude: '===',
    context: `function processItems(items) {\n  if (items.length = 0) return []\n  return items.map(transform)\n}`,
    language: 'js',
    explanation: '= is assignment, not comparison. This always sets items.length to 0 and truthy 0 is falsy, breaking the guard.',
  },
  {
    snippet: 'for (let i = 0; i <= arr.length; i++)',
    mustInclude: '< arr.length',
    context: `function sumAll(arr) {\n  let total = 0\n  for (let i = 0; i <= arr.length; i++) {\n    total += arr[i]\n  }\n  return total\n}`,
    language: 'js',
    explanation: 'arr[arr.length] is undefined. <= causes an off-by-one that adds NaN to the total on the last iteration.',
  },
  {
    snippet: 'const total = price + taxRate',
    mustInclude: '* taxRate',
    context: `function calculateTotal(price, taxRate) {\n  const total = price + taxRate\n  return total.toFixed(2)\n}`,
    language: 'js',
    explanation: 'taxRate is a fraction (e.g. 0.08), not a flat amount. Should be price + price * taxRate.',
  },
  {
    snippet: 'setTimeout(callback, 1000 * 60 * 24)',
    mustInclude: '60 * 60 * 24',
    context: `function scheduleDaily(callback) {\n  setTimeout(callback, 1000 * 60 * 24)\n}`,
    language: 'js',
    explanation: '1000 * 60 * 24 = 1,440,000ms = 24 minutes, not 24 hours. Missing one 60× factor.',
  },
  {
    snippet: 'if (typeof value == "undefined")',
    mustInclude: '===',
    context: `function isAbsent(value) {\n  if (typeof value == "undefined") return true\n  return false\n}`,
    language: 'js',
    explanation: 'typeof always returns a string, so == vs === has no practical difference here — but strict equality (===) is always the right default for typeof checks.',
  },
  {
    snippet: 'const copy = arr.slice().reverse().sort()',
    mustInclude: '.sort().reverse()',
    context: `function sortedDesc(arr) {\n  const copy = arr.slice().reverse().sort()\n  return copy\n}`,
    language: 'js',
    explanation: 'reverse() before sort() does nothing — sort() re-orders from scratch. Sort first, then reverse to get descending order.',
  },
  {
    snippet: 'res.json({ ok: true }); next()',
    mustInclude: 'return res.json',
    context: `app.post('/submit', (req, res, next) => {\n  res.json({ ok: true }); next()\n})`,
    language: 'js',
    explanation: 'Calling next() after res.json() passes to the next middleware, causing "headers already sent" errors and double execution.',
  },
  {
    snippet: 'await fetch(url); return data;',
    mustInclude: 'await fetch(url).then',
    context: `async function getUser(url) {\n  await fetch(url); return data;\n}`,
    language: 'js',
    explanation: 'fetch() returns a Response, not parsed data. You need .then(r => r.json()) or const res = await fetch(url); const data = await res.json().',
  },
  {
    snippet: "new Date().toLocaleDateString('en')",
    mustInclude: 'toISOString',
    context: `function getTimestamp() {\n  return new Date().toLocaleDateString('en')\n}`,
    language: 'js',
    explanation: 'toLocaleDateString() is locale-dependent and timezone-sensitive — different machines return different strings. Use toISOString() for consistent, sortable timestamps.',
  },
  {
    snippet: 'Math.round(0.1 + 0.2)',
    mustInclude: 'toFixed',
    context: `function addCents(a, b) {\n  return Math.round(a + b)\n}`,
    language: 'js',
    explanation: '0.1 + 0.2 = 0.30000000000000004 in IEEE 754. Math.round() gives 0, not 0.3. Use toFixed(1) or multiply to integers first.',
  },
  {
    snippet: "const name = user && user.name || 'anon'",
    mustInclude: 'user?.name',
    context: `function displayName(user) {\n  const name = user && user.name || 'anon'\n  return name\n}`,
    language: 'js',
    explanation: 'Operator precedence: && binds tighter than ||, so this reads as (user && user.name) || "anon". Optional chaining (user?.name ?? "anon") is cleaner and correct.',
  },
  {
    snippet: 'arr.forEach(async (item) => { await processItem(item) })',
    mustInclude: 'Promise.all',
    context: `async function processAll(arr) {\n  arr.forEach(async (item) => { await processItem(item) })\n}`,
    language: 'js',
    explanation: 'forEach ignores the returned promise from the async callback — processAll returns before any items are processed. Use Promise.all(arr.map(async item => ...)).',
  },
  {
    snippet: "str.replace('/', '-')",
    mustInclude: '/\\//g',
    context: `function slugify(str) {\n  return str.replace('/', '-').toLowerCase()\n}`,
    language: 'js',
    explanation: "String.replace() with a string literal only replaces the first occurrence. Use a regex with the g flag: str.replace(/\\//g, '-').",
  },
  {
    snippet: 'obj.hasOwnProperty(key)',
    mustInclude: 'Object.prototype.hasOwnProperty',
    context: `function safeCheck(obj, key) {\n  return obj.hasOwnProperty(key)\n}`,
    language: 'js',
    explanation: 'Objects with null prototype (Object.create(null)) or where hasOwnProperty is overridden will throw or return wrong results. Use Object.prototype.hasOwnProperty.call(obj, key).',
  },
  {
    snippet: 'const squared = nums.map(n => n ^ 2)',
    mustInclude: 'n ** 2',
    context: `function squareAll(nums) {\n  const squared = nums.map(n => n ^ 2)\n  return squared\n}`,
    language: 'js',
    explanation: '^ is bitwise XOR in JavaScript, not exponentiation. Use n ** 2 or Math.pow(n, 2).',
  },
  {
    snippet: 'if (arr.length == false)',
    mustInclude: 'arr.length === 0',
    context: `function isEmpty(arr) {\n  if (arr.length == false) return true\n  return false\n}`,
    language: 'js',
    explanation: 'Coercing length to boolean is fragile: length == false passes for 0 (empty) but also for edge cases. Be explicit: arr.length === 0.',
  },
  {
    snippet: 'delete obj.prop; return obj',
    mustInclude: 'const { prop, ...rest }',
    context: `function omitProp(obj) {\n  delete obj.prop; return obj\n}`,
    language: 'js',
    explanation: 'delete mutates the original object in place, causing unexpected side effects for callers who still hold a reference. Use destructuring spread: const { prop, ...rest } = obj; return rest.',
  },
]

// PRODUCTION — subtle TypeScript, async, and Node.js bugs
const PRODUCTION_BUGS: BugChallenge[] = [
  {
    snippet: 'JSON.parse(userInput)',
    mustInclude: 'try',
    context: `async function parseBody(req) {\n  const body = JSON.parse(req.body)\n  return body\n}`,
    language: 'ts',
    explanation: 'JSON.parse throws a SyntaxError on malformed input. Any route that parses user-supplied JSON without try/catch will crash the entire server process.',
  },
  {
    snippet: "element.innerHTML = userComment",
    mustInclude: 'textContent',
    context: `function renderComment(el, userComment) {\n  el.innerHTML = userComment\n}`,
    language: 'ts',
    explanation: 'Setting innerHTML from user input is a stored XSS vector. Use textContent for plain text, or DOMPurify.sanitize() if HTML rendering is needed.',
  },
  {
    snippet: "const id = Math.random().toString()",
    mustInclude: 'crypto',
    context: `function generateSessionId() {\n  const id = Math.random().toString()\n  return id\n}`,
    language: 'ts',
    explanation: 'Math.random() is not cryptographically secure — its seed is predictable. Use crypto.randomUUID() or crypto.randomBytes() for session IDs.',
  },
  {
    snippet: "if (password == storedHash)",
    mustInclude: 'timingSafeEqual',
    context: `async function verifyPassword(password, storedHash) {\n  if (password == storedHash) return true\n  return false\n}`,
    language: 'ts',
    explanation: 'String comparison short-circuits on the first differing character — exploitable as a timing attack. Use crypto.timingSafeEqual() for constant-time comparison.',
  },
  {
    snippet: 'const users = await db.query("SELECT * FROM users WHERE id = " + id)',
    mustInclude: 'parameterized',
    context: `async function getUser(id) {\n  const users = await db.query("SELECT * FROM users WHERE id = " + id)\n  return users[0]\n}`,
    language: 'ts',
    explanation: 'String concatenation in SQL queries is a textbook SQL injection vulnerability. Use parameterized queries: db.query("SELECT * FROM users WHERE id = $1", [id]).',
  },
  {
    snippet: 'await Promise.all([a(), b(), c()]); return results',
    mustInclude: 'const results = await',
    context: `async function runAll() {\n  await Promise.all([a(), b(), c()]); return results\n}`,
    language: 'ts',
    explanation: 'The return value of Promise.all is discarded — results is undefined. Assign it: const results = await Promise.all([a(), b(), c()]).',
  },
  {
    snippet: 'setInterval(async () => { await heavyTask() }, 100)',
    mustInclude: 'clearInterval',
    context: `function startPolling() {\n  setInterval(async () => { await heavyTask() }, 100)\n}`,
    language: 'ts',
    explanation: 'The interval ID is discarded so it can never be cleared — this creates a memory leak and will keep running even after component unmount or server shutdown.',
  },
  {
    snippet: 'const data = cache[key] || fetchFromDB(key)',
    mustInclude: 'cache[key] !== undefined',
    context: `async function get(key) {\n  const data = cache[key] || fetchFromDB(key)\n  return data\n}`,
    language: 'ts',
    explanation: 'Falsy values (0, "", false, null) in cache bypass the cache and re-fetch every time. Check cache[key] !== undefined instead of truthiness.',
  },
  {
    snippet: 'req.user = jwt.verify(token, secret)',
    mustInclude: 'try',
    context: `function authMiddleware(req, res, next) {\n  req.user = jwt.verify(token, secret)\n  next()\n}`,
    language: 'ts',
    explanation: 'jwt.verify() throws on invalid/expired tokens. Without try/catch, an attacker sending any malformed token crashes the server.',
  },
  {
    snippet: "type UserId = string | number",
    mustInclude: 'type UserId = string',
    context: `type UserId = string | number\n\nfunction getUserById(id: UserId) {\n  return db.users.findById(id)\n}`,
    language: 'ts',
    explanation: 'Allowing string | number for IDs forces every consumer to handle both cases and creates comparison bugs (1 == "1" but 1 !== "1"). Pin to one type.',
  },
  {
    snippet: 'const result = await db.findMany(); result.forEach(process)',
    mustInclude: 'for...of',
    context: `async function processAll() {\n  const result = await db.findMany();\n  result.forEach(process)\n}`,
    language: 'ts',
    explanation: 'If process() is async, forEach ignores its returned promises — items process out of order or processing is skipped. Use for...of with await, or Promise.all().',
  },
  {
    snippet: "app.use(cors({ origin: '*' }))",
    mustInclude: 'specific origin',
    context: `const app = express()\napp.use(cors({ origin: '*' }))\napp.use('/api', apiRouter)`,
    language: 'ts',
    explanation: "Wildcard CORS allows any site to make credentialed requests to your API. In production, specify exact allowed origins: origin: ['https://yourapp.com'].",
  },
  {
    snippet: 'const hash = md5(password)',
    mustInclude: 'bcrypt',
    context: `async function storePassword(password) {\n  const hash = md5(password)\n  await db.users.updateHash(hash)\n}`,
    language: 'ts',
    explanation: 'MD5 is cryptographically broken and has no salt — vulnerable to rainbow table attacks. Use bcrypt, argon2, or scrypt for password hashing.',
  },
  {
    snippet: 'fs.readFileSync(`/uploads/${req.params.filename}`)',
    mustInclude: 'path.basename',
    context: `app.get('/file/:filename', (req, res) => {\n  const data = fs.readFileSync(\`/uploads/\${req.params.filename}\`)\n  res.send(data)\n})`,
    language: 'ts',
    explanation: 'Path traversal: a request for ../../etc/passwd reads arbitrary files. Sanitize with path.basename(req.params.filename) and validate the resolved path stays inside /uploads.',
  },
  {
    snippet: 'const config = require(process.env.CONFIG_PATH)',
    mustInclude: 'whitelist',
    context: `function loadConfig() {\n  const config = require(process.env.CONFIG_PATH)\n  return config\n}`,
    language: 'ts',
    explanation: 'Dynamically requiring a path from an env variable lets anyone who controls that variable execute arbitrary code. Whitelist allowed config paths explicitly.',
  },
  {
    snippet: 'res.redirect(req.query.returnUrl)',
    mustInclude: 'allowedHosts',
    context: `app.get('/login', (req, res) => {\n  // after auth...\n  res.redirect(req.query.returnUrl)\n})`,
    language: 'ts',
    explanation: 'Open redirect: an attacker crafts a link that redirects users to an external phishing site after login. Validate that returnUrl starts with / or matches an allowlisted host.',
  },
  {
    snippet: 'obj[req.body.key] = req.body.value',
    mustInclude: '__proto__',
    context: `function updateSettings(obj, req) {\n  obj[req.body.key] = req.body.value\n  return obj\n}`,
    language: 'ts',
    explanation: 'Prototype pollution: setting obj["__proto__"]["admin"] = true modifies Object.prototype and grants admin to every object in the process. Check that key is not __proto__ or constructor.',
  },
]

// BLACKBOX — performance, concurrency, and subtle correctness bugs
const BLACKBOX_BUGS: BugChallenge[] = [
  {
    snippet: 'await db.$transaction([...ops])',
    mustInclude: 'async (tx) =>',
    context: `async function transfer(from, to, amount) {\n  await db.$transaction([\n    db.account.update({ where: { id: from }, data: { balance: { decrement: amount } } }),\n    db.account.update({ where: { id: to },   data: { balance: { increment: amount } } }),\n  ])\n}`,
    language: 'ts',
    explanation: 'Passing an array of operations to $transaction is the "batch" API — it does NOT guarantee atomicity across operations in all Prisma versions. Use the interactive transaction API: $transaction(async (tx) => { ... }).',
  },
  {
    snippet: 'if (count > 0) { count-- }',
    mustInclude: 'atomic',
    context: `let count = 100\n\nasync function decrement() {\n  if (count > 0) { count-- }\n}`,
    language: 'ts',
    explanation: 'Classic check-then-act race condition: two concurrent calls both pass the check before either decrements. Use an atomic database operation (UPDATE ... WHERE count > 0) or a mutex.',
  },
  {
    snippet: "const key = JSON.stringify(Object.keys(obj).sort())",
    mustInclude: 'JSON.stringify(obj)',
    context: `function cacheKey(obj) {\n  const key = JSON.stringify(Object.keys(obj).sort())\n  return key\n}`,
    language: 'ts',
    explanation: 'Hashing only the sorted keys loses the values — {a:1} and {a:2} produce the same cache key. Stringify the whole object: JSON.stringify(Object.fromEntries(Object.entries(obj).sort())).',
  },
  {
    snippet: 'const stream = fs.createReadStream(file); stream.pipe(res)',
    mustInclude: 'stream.on("error"',
    context: `app.get('/download/:file', (req, res) => {\n  const stream = fs.createReadStream(file)\n  stream.pipe(res)\n})`,
    language: 'ts',
    explanation: 'If the file does not exist or is unreadable, the unhandled "error" event crashes the process. Always attach stream.on("error", handler) before piping.',
  },
  {
    snippet: 'Number.isInteger(parseFloat(value))',
    mustInclude: 'Number.isInteger(Number(value))',
    context: `function validateInt(value) {\n  return Number.isInteger(parseFloat(value))\n}`,
    language: 'ts',
    explanation: 'parseFloat("1.0") === 1, so this returns true for "1.0" even though it is a float string. Use Number(value) then Number.isInteger(), or parseInt() with radix and compare.',
  },
  {
    snippet: 'subscribers.push(callback); return () => subscribers.splice(0)',
    mustInclude: 'indexOf',
    context: `function subscribe(callback) {\n  subscribers.push(callback)\n  return () => subscribers.splice(0)\n}`,
    language: 'ts',
    explanation: 'splice(0) removes ALL subscribers, not just this one. The correct unsubscribe is: const idx = subscribers.indexOf(callback); if (idx > -1) subscribers.splice(idx, 1).',
  },
  {
    snippet: 'const [a, b] = await Promise.all([fetchA(), fetchB()])',
    mustInclude: 'Promise.allSettled',
    context: `async function loadDashboard() {\n  const [a, b] = await Promise.all([fetchA(), fetchB()])\n  return { a, b }\n}`,
    language: 'ts',
    explanation: 'If either fetchA() or fetchB() rejects, Promise.all immediately rejects and the other result is lost. Use Promise.allSettled() if you need all results regardless of failures.',
  },
  {
    snippet: 'WHERE created_at BETWEEN $1 AND $2',
    mustInclude: 'timezone',
    context: `async function getDailyStats(date) {\n  return db.query(\n    "SELECT count(*) FROM events WHERE created_at BETWEEN $1 AND $2",\n    [startOfDay(date), endOfDay(date)]\n  )\n}`,
    language: 'sql',
    explanation: 'startOfDay/endOfDay without an explicit timezone defaults to server local time. In UTC production environments this silently returns wrong date ranges for users in other timezones.',
  },
  {
    snippet: 'SELECT * FROM orders LEFT JOIN users ON orders.user_id = users.id',
    mustInclude: 'index',
    context: `-- Runs every second on 10M row table\nSELECT * FROM orders\nLEFT JOIN users ON orders.user_id = users.id\nWHERE orders.status = "pending"`,
    language: 'sql',
    explanation: 'Without an index on orders.user_id and orders.status, this full-table scan runs in O(n) time. At scale this query will time out. Add: CREATE INDEX ON orders(status, user_id).',
  },
  {
    snippet: 'export default class EventEmitter { listeners = {} }',
    mustInclude: 'WeakRef',
    context: `export default class EventEmitter {\n  listeners = {}\n  on(event, cb) { this.listeners[event] = cb }\n  off(event) { delete this.listeners[event] }\n}`,
    language: 'ts',
    explanation: 'Storing strong references to callbacks prevents garbage collection of the subscriber object even after it is "destroyed." Use WeakRef or ensure off() is always called on cleanup.',
  },
]

// ---------------------------------------------------------------------------
// Context Chicken — estimate the minimum context window needed
// ---------------------------------------------------------------------------

const CONTEXT_CHICKEN_SCENARIOS = [
  { description: 'Summarize a 500-word blog post about API rate limiting.', minContext: 2048, unit: 'tokens' },
  { description: 'Translate a short product update email from English to Spanish.', minContext: 1024, unit: 'tokens' },
  { description: 'Analyze a 3-page legal contract for key obligations and risks.', minContext: 4096, unit: 'tokens' },
  { description: 'Generate unit tests for a 200-line TypeScript module.', minContext: 4096, unit: 'tokens' },
  { description: 'Classify customer support tickets from a batch of 20 messages.', minContext: 8192, unit: 'tokens' },
  { description: 'Rewrite a 1,500-word technical README for a new audience.', minContext: 4096, unit: 'tokens' },
  { description: 'Extract structured data from 10 product reviews.', minContext: 4096, unit: 'tokens' },
  { description: 'Debug a stack trace with 15 frames and suggest a fix.', minContext: 2048, unit: 'tokens' },
  { description: 'Write a changelog entry from a git diff of 50 lines.', minContext: 2048, unit: 'tokens' },
  { description: 'Summarize the key findings from a 10-page research paper abstract + intro.', minContext: 8192, unit: 'tokens' },
  { description: 'Convert a 40-row CSV into a markdown table with headers.', minContext: 2048, unit: 'tokens' },
  { description: 'Generate an API schema from 5 endpoint descriptions.', minContext: 4096, unit: 'tokens' },
]

// ---------------------------------------------------------------------------
// Game scoring logic (per game)
// ---------------------------------------------------------------------------

function scoreTokenProphet(challenge: Record<string, unknown>, submission: Record<string, unknown>): number {
  const pick = String(submission.pick ?? '')
  const longerIs = String(challenge.longerIs ?? '')
  return pick === longerIs ? 100 : 0
}

function scorePromptGolf(challenge: Record<string, unknown>, submission: Record<string, unknown>): number {
  // If AI verification ran, use the actual model output result
  if (submission._liveVerified) {
    if (!submission._outputSatisfied) return 5
    const prompt = String(submission.prompt ?? '')
    return Math.max(10, 100 - Math.ceil(prompt.length / 3))
  }
  // Fallback: keyword-match the prompt text itself
  const prompt = String(submission.prompt ?? '').toLowerCase()
  const required = Array.isArray(challenge.required) ? challenge.required.map(String) : []
  const hasAll = required.every((word) => prompt.includes(word.toLowerCase()))
  if (!hasAll) return 0
  return Math.max(10, 100 - Math.ceil(prompt.length / 3))
}

function scoreBugExorcist(challenge: Record<string, unknown>, submission: Record<string, unknown>): number {
  // If AI judge ran, use its score
  if (submission._aiJudged && submission._aiJudgment) {
    const j = submission._aiJudgment as { score: number }
    return Math.min(95, Math.max(5, Number(j.score) || 0))
  }
  // Fallback: keyword presence check
  const fix = String(submission.fix ?? '')
  const mustInclude = String(challenge.mustInclude ?? '')
  return fix.includes(mustInclude) ? 95 : 15
}

function scoreContextChicken(challenge: Record<string, unknown>, submission: Record<string, unknown>, tier: DifficultyTier): number {
  const bet = Number(submission.contextBet ?? 0)
  const minContext = Number(challenge.minContext ?? 0)
  if (bet < minContext) return 0
  const overhead = bet - minContext
  const tolerance = tier === 'sandbox' ? 2048 : tier === 'production' ? 1024 : 512
  if (overhead <= tolerance) return 100
  return Math.max(0, 100 - Math.floor((overhead - tolerance) * 100 / (minContext * 2)))
}

// ---------------------------------------------------------------------------
// Rate Limit Roulette — predict which provider responds fastest
// ---------------------------------------------------------------------------

// Real-world latency profiles (p50 ms typical range for short prompts, based on
// public benchmarks and provider architecture). Groq uses custom LPU silicon —
// consistently the fastest for inference. OpenAI/Anthropic run on GPU clusters.
// Reasoning models (o3-mini, R1) think before generating: always slowest.
const PROVIDER_LATENCY_PROFILES: Record<string, {
  p50: number       // median ms (used to determine winner)
  jitter: number    // random variance added per race
  typicalRange: string  // shown to player as intelligence hint
  note: string         // why this provider is fast/slow
}> = {
  'Groq Llama':        { p50: 140,  jitter: 80,  typicalRange: '100–350ms',  note: 'Custom LPU silicon — purpose-built for inference speed' },
  'Groq Mixtral':      { p50: 160,  jitter: 80,  typicalRange: '110–380ms',  note: 'Groq LPU with MoE model — still blazing fast' },
  'Gemini 2.5 Flash':  { p50: 380,  jitter: 150, typicalRange: '250–650ms',  note: 'Flash tier optimized for latency over quality' },
  'Claude 3.5 Haiku':  { p50: 420,  jitter: 160, typicalRange: '280–700ms',  note: 'Anthropic\'s fastest model — Haiku tier' },
  'GPT-4o-mini':       { p50: 480,  jitter: 200, typicalRange: '320–820ms',  note: 'OpenAI mini tier — optimized for throughput' },
  'Mistral Small':     { p50: 500,  jitter: 200, typicalRange: '350–900ms',  note: 'Efficient mixture-of-experts architecture' },
  'DeepSeek V3':       { p50: 560,  jitter: 250, typicalRange: '380–1100ms', note: 'Dense model — fast for its parameter count' },
  'Llama 4 Maverick':  { p50: 600,  jitter: 280, typicalRange: '400–1200ms', note: 'MoE architecture helps speed; hosted on various infra' },
  'Qwen 3 235B':       { p50: 680,  jitter: 300, typicalRange: '450–1400ms', note: 'Very large model — impressive speed given size' },
  'OpenAI GPT-4o':     { p50: 750,  jitter: 350, typicalRange: '500–1600ms', note: 'Full GPT-4o — quality over speed' },
  'Claude Sonnet':     { p50: 820,  jitter: 380, typicalRange: '550–1800ms', note: 'Anthropic Sonnet tier — balanced quality/speed' },
  'Gemini 2.5 Pro':    { p50: 900,  jitter: 400, typicalRange: '600–2000ms', note: 'Pro tier prioritizes quality over latency' },
  'DeepSeek R1':       { p50: 3200, jitter: 1200,'typicalRange': '2–6s',     note: 'Reasoning model — thinks before answering' },
  'OpenAI o3-mini':    { p50: 4100, jitter: 1800,'typicalRange': '2.5–8s',   note: 'Chain-of-thought reasoning — slowest category' },
}

const ROULETTE_MATCHUPS: { providers: string[]; prompt: string; insight: string }[] = [
  {
    providers: ['OpenAI GPT-4o', 'Claude Sonnet', 'Groq Llama'],
    prompt: 'Explain recursion in one sentence.',
    insight: 'Groq runs custom LPU chips. GPT-4o and Claude Sonnet are both GPU-backed — similar ballpark.',
  },
  {
    providers: ['GPT-4o-mini', 'DeepSeek V3', 'Gemini 2.5 Flash'],
    prompt: 'Write a haiku about API latency.',
    insight: 'Flash is Gemini\'s latency-optimized tier. GPT-4o-mini and DeepSeek V3 are close — depends on load.',
  },
  {
    providers: ['Groq Mixtral', 'Mistral Small', 'Qwen 3 235B'],
    prompt: 'List 3 HTTP status codes for errors.',
    insight: 'Groq hardware makes even a large MoE model fast. Mistral Small and Qwen run on standard GPU infra.',
  },
  {
    providers: ['OpenAI o3-mini', 'DeepSeek R1', 'Gemini 2.5 Flash'],
    prompt: 'What is eventual consistency?',
    insight: 'o3-mini and R1 are both reasoning models — they think before they write. Flash wins this easily.',
  },
  {
    providers: ['Claude 3.5 Haiku', 'Llama 4 Maverick', 'GPT-4o-mini'],
    prompt: 'Name 3 sorting algorithms.',
    insight: 'Haiku is Anthropic\'s speed tier. Llama 4 Maverick is MoE but not on specialized hardware here.',
  },
  {
    providers: ['Groq Llama', 'Gemini 2.5 Flash', 'Mistral Small'],
    prompt: 'What is a race condition?',
    insight: 'All three are latency-optimized. Groq\'s LPU is the differentiator for short prompts.',
  },
  {
    providers: ['OpenAI GPT-4o', 'DeepSeek R1', 'Qwen 3 235B'],
    prompt: 'Explain the CAP theorem briefly.',
    insight: 'DeepSeek R1 is a reasoning model — multi-second think time. GPT-4o vs Qwen depends on prompt length.',
  },
  {
    providers: ['Claude Sonnet', 'Llama 4 Maverick', 'Gemini 2.5 Pro'],
    prompt: 'What is backpressure in streaming?',
    insight: 'Pro tiers are slower than Flash/Haiku/mini counterparts. Llama 4 Maverick\'s MoE architecture is efficient.',
  },
  {
    providers: ['Groq Mixtral', 'GPT-4o-mini', 'DeepSeek V3'],
    prompt: 'Define idempotency in APIs.',
    insight: 'Groq LPU again. GPT-4o-mini and DeepSeek V3 are both optimized inference — tight race for second.',
  },
  {
    providers: ['OpenAI o3-mini', 'Claude 3.5 Haiku', 'Mistral Small'],
    prompt: 'What is a circuit breaker pattern?',
    insight: 'o3-mini is a reasoning model with multi-second latency. Haiku and Mistral Small are both latency-optimized.',
  },
  {
    providers: ['DeepSeek V3', 'Gemini 2.5 Flash', 'Claude Sonnet'],
    prompt: 'Write a regex to match an IPv4 address.',
    insight: 'Flash is Gemini\'s fast tier. DeepSeek V3 is surprisingly quick for its size. Sonnet is mid-tier on latency.',
  },
  {
    providers: ['Groq Llama', 'OpenAI GPT-4o', 'DeepSeek R1'],
    prompt: 'What does 502 Bad Gateway mean?',
    insight: 'R1 is a chain-of-thought model. Groq LPU vs GPT-4o is the real race here.',
  },
]

function scoreRateLimitRoulette(challenge: Record<string, unknown>, submission: Record<string, unknown>, tier: DifficultyTier): number {
  const pick = String(submission.pick ?? '')
  const fastest = String(challenge.fastest ?? '')
  if (pick === fastest) return 100
  // Partial credit: picked second-fastest at sandbox/production
  const latencies = Array.isArray(challenge.latencies)
    ? (challenge.latencies as Array<{ provider: string; latencyMs: number }>)
    : []
  const sorted = [...latencies].sort((a, b) => a.latencyMs - b.latencyMs)
  const pickRank = sorted.findIndex(l => l.provider === pick)
  if (pickRank === 1 && tier !== 'blackbox') return 45
  return 0
}

// ---------------------------------------------------------------------------
// Benchmark Brawl — rank model outputs by quality
// ---------------------------------------------------------------------------

interface BrawlScenario {
  task: string
  criteria: string
  models: string[]
  bestModel: string
  outputs: Record<string, string>
}

const BRAWL_SCENARIOS: BrawlScenario[] = [
  {
    task: 'Write a Python function to check if a string is a palindrome.',
    criteria: 'correctness',
    models: ['GPT-4o', 'Claude Sonnet', 'DeepSeek V3'],
    bestModel: 'Claude Sonnet',
    outputs: {
      'GPT-4o': `def is_palindrome(s):
    return s == s[::-1]

# Works for simple cases like "racecar"`,

      'Claude Sonnet': `def is_palindrome(s: str) -> bool:
    """True if s reads the same forwards and backwards,
    ignoring case, spaces, and punctuation."""
    normalized = ''.join(c.lower() for c in s if c.isalnum())
    return normalized == normalized[::-1]

# Handles: "A man, a plan, a canal: Panama" → True
# Handles: "Was it a car or a cat I saw?" → True`,

      'DeepSeek V3': `def is_palindrome(word):
    word = word.lower()
    return word == word[::-1]

# Handles case but NOT spaces/punctuation
# "A man a plan" → False (incorrect)`,
    },
  },

  {
    task: 'Explain quantum computing to a 10-year-old.',
    criteria: 'clarity',
    models: ['Gemini Pro', 'GPT-4o', 'Llama 4'],
    bestModel: 'GPT-4o',
    outputs: {
      'Gemini Pro': `Quantum computing leverages quantum mechanical phenomena — specifically superposition and entanglement — to process information fundamentally differently than classical systems. While classical bits represent binary states (0 or 1), qubits exist in quantum superposition, simultaneously encoding multiple states until measured.`,

      'GPT-4o': `Imagine a magic coin. When you spin it in the air, it's BOTH heads and tails at the same time — not one or the other, but genuinely both. Normal computers are like flipping a coin: it immediately decides heads or tails. Quantum computers keep millions of coins spinning at once and use that weirdness to try every possible answer simultaneously. It's like solving a maze by exploring every path at the same time instead of trying them one by one.`,

      'Llama 4': `OK so you know how regular computers use 0s and 1s? A quantum computer uses "qubits" which can be 0, 1, or BOTH at the same time thanks to superposition. There's also entanglement where two qubits are connected so what happens to one instantly affects the other. This makes quantum computers really powerful for certain types of hard math problems, like breaking encryption or simulating molecules.`,
    },
  },

  {
    task: 'Refactor this nested callback into async/await.',
    criteria: 'code quality',
    models: ['DeepSeek R1', 'Claude Sonnet', 'Qwen 3'],
    bestModel: 'DeepSeek R1',
    outputs: {
      'DeepSeek R1': `// Before: nested callbacks
// getUser(id, (err, user) => {
//   getPosts(user.id, (err, posts) => {
//     getComments(posts[0].id, (err, comments) => { ... })
//   })
// })

async function getUserContent(id: string) {
  try {
    const user = await getUser(id)
    const [posts, profile] = await Promise.all([
      getPosts(user.id),
      getProfile(user.id),      // ← parallel where possible
    ])
    const comments = await getComments(posts[0].id)
    return { user, posts, comments, profile }
  } catch (err) {
    throw new Error(\`Failed to load content: \${err.message}\`)
  }
}`,

      'Claude Sonnet': `async function getUserContent(id) {
  const user = await getUser(id)
  const posts = await getPosts(user.id)
  const comments = await getComments(posts[0].id)
  return { user, posts, comments }
}

// Note: each await is sequential — could parallelize
// getPosts and getProfile with Promise.all if independent`,

      'Qwen 3': `async function getUserContent(id) {
  const user = getUser(id)        // ← missing await!
  const posts = await getPosts(user.id)
  const comments = await getComments(posts[0].id)
  return { user, posts, comments }
}

// Bug: getUser is not awaited, user.id will be undefined`,
    },
  },

  {
    task: 'Summarize the key points of the Transformer architecture paper.',
    criteria: 'accuracy',
    models: ['GPT-4o', 'Gemini Pro', 'Mistral Small'],
    bestModel: 'Gemini Pro',
    outputs: {
      'GPT-4o': `The 2017 "Attention Is All You Need" paper introduced Transformers, replacing RNNs with self-attention. Key ideas: multi-head attention lets the model attend to different positions simultaneously; positional encodings inject sequence order (no recurrence needed); encoder-decoder stacks with residual connections and layer norm. Enabled parallelizable training and set foundation for GPT, BERT.`,

      'Gemini Pro': `"Attention Is All You Need" (Vaswani et al., 2017) established three foundational contributions: (1) Self-attention as the primary computation — every token attends to all others in O(n²) but parallelizes fully, unlike RNNs. (2) Multi-head attention — 8 parallel attention heads learn different relationship types simultaneously. (3) Positional encodings replace recurrence to preserve sequence order. The paper also introduced scaled dot-product attention (dividing by √d_k to prevent softmax saturation), pre-norm residual connections, and demonstrated SOTA BLEU on WMT translation while training 3.5× faster than the prior best.`,

      'Mistral Small': `The Transformer paper replaced recurrent networks with attention mechanisms. Self-attention lets each word look at every other word in the sentence. There's an encoder and decoder, and they use positional encoding to know word order since there's no sequence processing. This became the basis for models like GPT and BERT. The key innovation was showing you don't need RNNs at all.`,
    },
  },

  {
    task: 'Write a SQL query to find the second-highest salary.',
    criteria: 'correctness',
    models: ['Claude Haiku', 'GPT-4o-mini', 'Groq Llama'],
    bestModel: 'GPT-4o-mini',
    outputs: {
      'Claude Haiku': `SELECT MAX(salary) AS second_highest
FROM employees
WHERE salary < (SELECT MAX(salary) FROM employees);

-- Works but fails on ties: if 3 people earn $100k (max)
-- and 2 earn $80k, returns $80k correctly.
-- Subquery runs twice — less efficient than window functions.`,

      'GPT-4o-mini': `-- Handles ties correctly using DENSE_RANK
SELECT salary AS second_highest_salary
FROM (
  SELECT salary,
         DENSE_RANK() OVER (ORDER BY salary DESC) AS rnk
  FROM employees
) ranked
WHERE rnk = 2
LIMIT 1;

-- DENSE_RANK: 100k→1, 100k→1, 80k→2 ✓
-- ROW_NUMBER would skip tied rows (wrong)
-- Returns NULL cleanly if fewer than 2 distinct salaries`,

      'Groq Llama': `SELECT DISTINCT salary
FROM employees
ORDER BY salary DESC
LIMIT 1 OFFSET 1;

-- Simple but fragile: OFFSET 1 skips exactly one row
-- If two people share the max salary, this returns the
-- max again (not second-highest). Needs DISTINCT + careful ordering.`,
    },
  },

  {
    task: 'Create a regex to validate email addresses.',
    criteria: 'precision',
    models: ['DeepSeek V3', 'Claude Sonnet', 'Mistral Small'],
    bestModel: 'Claude Sonnet',
    outputs: {
      'DeepSeek V3': `import re
EMAIL_RE = re.compile(
    r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
)
def is_valid(email): return bool(EMAIL_RE.fullmatch(email))

# Misses: plus-quoted local parts, IP literals, unicode domains
# False positive: "user@domain..com" (double dot in domain)`,

      'Claude Sonnet': `import re

# RFC 5321 practical subset — covers 99.9% of real addresses
# Full RFC compliance requires a parser, not a regex
EMAIL_RE = re.compile(
    r'^(?!.*\.\.)'                   # no consecutive dots
    r'[a-zA-Z0-9!#$%&\'*+/=?^_\`{|}~.-]+'  # local part
    r'@'
    r'(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)'
    r'+[a-zA-Z]{2,}$',
    re.IGNORECASE
)

# Better approach: send a confirmation email.
# Regex only catches obvious syntax errors.`,

      'Mistral Small': `const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateEmail(email) {
  return emailRegex.test(email);
}

// Very permissive — catches only the most basic structure
// Allows: "a@b@c.com", "@.com", "test@test."`,
    },
  },

  {
    task: 'Explain the difference between TCP and UDP.',
    criteria: 'completeness',
    models: ['Llama 4', 'GPT-4o', 'Qwen 3'],
    bestModel: 'GPT-4o',
    outputs: {
      'Llama 4': `TCP (Transmission Control Protocol) is reliable — it guarantees delivery, ordering, and error checking via a 3-way handshake and acknowledgments. UDP (User Datagram Protocol) is faster but unreliable — packets can be lost, duplicated, or arrive out of order. TCP is used for HTTP, email, file transfers. UDP is used for gaming, DNS, video streaming.`,

      'GPT-4o': `**TCP** — connection-oriented, reliable delivery:
• 3-way handshake (SYN→SYN-ACK→ACK) before any data
• Guarantees: ordered delivery, no duplicates, retransmits lost packets
• Flow control + congestion control (slow start, AIMD)
• Cost: ~50–100ms extra latency for handshake; head-of-line blocking
• Use: HTTP/1.1, HTTPS (pre-QUIC), SSH, email, file transfer

**UDP** — connectionless, fire-and-forget:
• No handshake; first packet is data
• No ordering, no retransmits, no congestion control
• Cost: almost none — just IP + 8-byte header
• Use: DNS (1 RTT matters), live video/audio (stale > missing), gaming, QUIC (adds reliability in userspace)

Rule of thumb: if losing a packet is worse than waiting, use TCP. If latency is worse than loss, use UDP.`,

      'Qwen 3': `TCP is connection-based and reliable. It uses a handshake to establish connection and ensures all data arrives in order. UDP doesn't establish a connection first — it just sends packets. UDP is faster because it has less overhead. TCP is for web browsing and file downloads. UDP works well for video calls and online games where speed matters more than perfect delivery.`,
    },
  },

  {
    task: 'Write a Dockerfile for a Node.js application.',
    criteria: 'best practices',
    models: ['DeepSeek R1', 'Gemini Flash', 'Claude Sonnet'],
    bestModel: 'DeepSeek R1',
    outputs: {
      'DeepSeek R1': `# Multi-stage build: smaller final image, no dev deps in prod
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine AS runtime
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
USER appuser          # non-root for security
EXPOSE 3000
HEALTHCHECK --interval=30s CMD wget -qO- http://localhost:3000/health || exit 1
CMD ["node", "src/index.js"]`,

      'Gemini Flash': `FROM node:20
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
EXPOSE 3000
CMD ["node", "index.js"]

# Note: runs as root, includes devDependencies,
# no health check, large image (~1.1GB vs ~150MB alpine)`,

      'Claude Sonnet': `FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production && npm cache clean --force
COPY . .
EXPOSE 3000
CMD ["node", "src/index.js"]

# Better than naive, but still:
# - Single stage (build tools stay in image)
# - Still running as root
# - No health check`,
    },
  },

  {
    task: 'Design a rate limiter using the token bucket algorithm.',
    criteria: 'architecture',
    models: ['GPT-4o', 'Claude Sonnet', 'Qwen 3'],
    bestModel: 'Claude Sonnet',
    outputs: {
      'GPT-4o': `class TokenBucket {
  constructor(capacity, refillRate) {
    this.tokens = capacity;
    this.capacity = capacity;
    this.refillRate = refillRate; // tokens per second
    this.lastRefill = Date.now();
  }
  consume(n = 1) {
    this.refill();
    if (this.tokens < n) return false;
    this.tokens -= n;
    return true;
  }
  refill() {
    const now = Date.now();
    const delta = (now - this.lastRefill) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + delta * this.refillRate);
    this.lastRefill = now;
  }
}
// Issue: in-memory only — doesn't work across multiple servers`,

      'Claude Sonnet': `// Distributed token bucket using Redis atomic Lua script
// Prevents race conditions without transactions

const BUCKET_SCRIPT = \`
local key = KEYS[1]
local capacity = tonumber(ARGV[1])
local refill_rate = tonumber(ARGV[2])  -- tokens/sec
local now = tonumber(ARGV[3])
local requested = tonumber(ARGV[4])

local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
local tokens = tonumber(bucket[1]) or capacity
local last_refill = tonumber(bucket[2]) or now

-- Refill based on elapsed time
local elapsed = math.max(0, now - last_refill)
tokens = math.min(capacity, tokens + elapsed * refill_rate)

if tokens >= requested then
  tokens = tokens - requested
  redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
  redis.call('EXPIRE', key, 3600)
  return 1
end
return 0
\`

async function isAllowed(userId: string, cost = 1): Promise<boolean> {
  const result = await redis.eval(BUCKET_SCRIPT, 1,
    \`bucket:\${userId}\`, CAPACITY, REFILL_RATE, Date.now() / 1000, cost)
  return result === 1
}`,

      'Qwen 3': `class RateLimiter:
    def __init__(self, rate, capacity):
        self.rate = rate
        self.capacity = capacity
        self.tokens = capacity
        self.timestamp = time.time()

    def allow_request(self):
        now = time.time()
        self.tokens += (now - self.timestamp) * self.rate
        self.timestamp = now
        if self.tokens > self.capacity:
            self.tokens = self.capacity
        if self.tokens >= 1:
            self.tokens -= 1
            return True
        return False
# Same issue: single-process only, not thread-safe`,
    },
  },

  {
    task: 'Convert this REST API to GraphQL.',
    criteria: 'design quality',
    models: ['Gemini Pro', 'DeepSeek V3', 'Llama 4'],
    bestModel: 'Gemini Pro',
    outputs: {
      'Gemini Pro': `# Schema-first design with N+1 protection
type Query {
  user(id: ID!): User
  users(first: Int, after: String, filter: UserFilter): UserConnection
}

type User {
  id: ID!
  name: String!
  email: String!
  posts(first: Int, orderBy: PostOrderBy): PostConnection
}

type UserConnection {
  edges: [UserEdge!]!
  pageInfo: PageInfo!
  totalCount: Int!
}

# Resolver with DataLoader to batch user fetches
const resolvers = {
  User: {
    posts: (user, args, { loaders }) =>
      loaders.postsByUserId.load(user.id),  // batched, not N+1
  },
}`,

      'DeepSeek V3': `const typeDefs = gql\`
  type User {
    id: ID!
    name: String!
    email: String!
    posts: [Post!]
  }
  type Post {
    id: ID!
    title: String!
    content: String!
  }
  type Query {
    getUser(id: ID!): User
    getAllUsers: [User!]
  }
\`

const resolvers = {
  Query: {
    getUser: (_, { id }) => db.users.findById(id),
    getAllUsers: () => db.users.findAll(),
  },
  User: {
    posts: (user) => db.posts.findAll({ where: { userId: user.id } }),
    // ↑ N+1 problem: one DB query per user
  },
}`,

      'Llama 4': `// GraphQL is just REST with a different endpoint
// POST /graphql instead of GET /users/:id

const schema = buildSchema(\`
  type User {
    id: String
    name: String
    email: String
  }
  type Query {
    user(id: String): User
  }
\`)

const root = {
  user: ({ id }) => fetchUser(id)
}
// Missing: mutations, subscriptions, pagination,
// error handling, input validation, N+1 consideration`,
    },
  },
]

function scoreBenchmarkBrawl(challenge: Record<string, unknown>, submission: Record<string, unknown>, tier: DifficultyTier): number {
  const pick = String(submission.pick ?? '')
  const bestModel = String(challenge.bestModel ?? '')
  if (pick === bestModel) return 100
  const models = Array.isArray(challenge.models) ? challenge.models.map(String) : []
  const bestIdx = models.indexOf(bestModel)
  const pickIdx = models.indexOf(pick)
  if (pickIdx < 0) return 0
  const distance = Math.abs(bestIdx - pickIdx)
  const penalty = tier === 'sandbox' ? 30 : tier === 'production' ? 45 : 60
  return Math.max(0, 100 - distance * penalty)
}

function scoreSpotDeepfake(challenge: Record<string, unknown>, submission: Record<string, unknown>, tier: DifficultyTier): number {
  const selectedPosition = Number(submission.selectedPosition ?? -1)
  const fakePosition = Number(challenge.fakePosition ?? -1)
  const confidence = String(submission.confidence ?? 'confident')

  // Confidence multiplier: certain=2×, confident=1.5×, unsure=1× (default)
  // Applied to correct guesses only — wrong guesses get penalised harder when
  // the player was "certain", capped at 0 (no negative scores).
  const CONFIDENCE_MULT: Record<string, number> = {
    certain: 2.0,
    confident: 1.5,
    unsure: 1.0,
  }
  const mult = CONFIDENCE_MULT[confidence] ?? 1.0

  if (selectedPosition === fakePosition) {
    return Math.min(100, Math.round(100 * mult))
  }

  // Partial credit for near-misses (capped at 0, reduced further when overconfident)
  const distance = Math.abs(selectedPosition - fakePosition)
  const penalty = tier === 'sandbox' ? 25 : tier === 'production' ? 35 : 50
  const base = Math.max(0, 100 - distance * penalty)
  // Overconfidence penalty: "certain" wrong = full zero, "confident" wrong = halved
  if (confidence === 'certain') return 0
  if (confidence === 'confident') return Math.round(base * 0.5)
  return base
}

const SCORERS: Record<string, (c: Record<string, unknown>, s: Record<string, unknown>, t: DifficultyTier) => number> = {
  token_prophet: (c, s) => scoreTokenProphet(c, s),
  prompt_golf: (c, s) => scorePromptGolf(c, s),
  bug_exorcist: (c, s) => scoreBugExorcist(c, s),
  context_chicken: scoreContextChicken,
  rate_limit_roulette: scoreRateLimitRoulette,
  benchmark_brawl: scoreBenchmarkBrawl,
  spot_deepfake: scoreSpotDeepfake,
  // prompt_crash and token_mines are resolved out-of-band via their own action endpoints — not via scoreGameSubmission().
  prompt_crash: () => 0,
  token_mines: () => 0,
}

// ---------------------------------------------------------------------------
// Challenge generators (per game)
// ---------------------------------------------------------------------------

type ChallengeGenerator = (serverSeed: string, clientSeed: string, nonce: number, tier: DifficultyTier) => Record<string, unknown>

function generateTokenProphet(serverSeed: string, clientSeed: string, nonce: number, tier: DifficultyTier): Record<string, unknown> {
  // Tier-based pool slicing: sandbox gets obvious pairs (0-5), production middle (6-11), blackbox tricky (12+)
  const startIdx = tier === 'sandbox' ? 0 : tier === 'production' ? 6 : 12
  const endIdx   = tier === 'sandbox' ? 6 : tier === 'production' ? 12 : TOKEN_PROPHET_PAIRS.length
  const pool = TOKEN_PROPHET_PAIRS.slice(startIdx, endIdx)
  const pair = sample(pool, serverSeed, clientSeed, nonce)
  // Randomly swap A/B using seeded RNG so the answer isn't always the same side
  const swapped = fairRandom(serverSeed, clientSeed, nonce + 7, 2) === 1
  return swapped
    ? { promptA: pair.promptB, promptB: pair.promptA, longerIs: pair.longerIs === 'A' ? 'B' : 'A', tokensA: pair.tokensB, tokensB: pair.tokensA, hint: pair.hint }
    : { promptA: pair.promptA, promptB: pair.promptB, longerIs: pair.longerIs, tokensA: pair.tokensA, tokensB: pair.tokensB, hint: pair.hint }
}

function generatePromptGolf(serverSeed: string, clientSeed: string, nonce: number): Record<string, unknown> {
  return sample(PROMPT_GOLF_TARGETS, serverSeed, clientSeed, nonce)
}

function generateBugExorcist(serverSeed: string, clientSeed: string, nonce: number, tier: DifficultyTier): Record<string, unknown> {
  const pool =
    tier === 'blackbox'    ? BLACKBOX_BUGS    :
    tier === 'production'  ? PRODUCTION_BUGS  :
    SANDBOX_BUGS
  const bug = sample(pool, serverSeed, clientSeed, nonce)

  // Seeded Fisher-Yates shuffle for the 3 answer patches so the client
  // never has to call Math.random() — order is deterministic and verifiable.
  const order = [0, 1, 2]
  for (let i = 2; i > 0; i--) {
    const j = fairRandom(serverSeed, clientSeed, nonce + 20 + i, i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  return { ...bug, patchOrder: order }
}

function generateContextChicken(serverSeed: string, clientSeed: string, nonce: number): Record<string, unknown> {
  const scenario = sample(CONTEXT_CHICKEN_SCENARIOS, serverSeed, clientSeed, nonce)
  return { description: scenario.description, minContext: scenario.minContext, unit: scenario.unit }
}

function generateRateLimitRoulette(serverSeed: string, clientSeed: string, nonce: number): Record<string, unknown> {
  const matchup = sample(ROULETTE_MATCHUPS, serverSeed, clientSeed, nonce)

  // Derive simulated latencies from real-world provider profiles + seeded jitter.
  // The fastest provider is determined by the profiles, not random — this makes
  // the game genuinely skill-based. Players who know their providers win more often.
  const latencies = matchup.providers.map((p, i) => {
    const profile = PROVIDER_LATENCY_PROFILES[p] ?? { p50: 600, jitter: 300 }
    // Seeded jitter makes the outcome deterministic and fair, but still variable
    const jitter = fairRandom(serverSeed, clientSeed, nonce + 2 + i, profile.jitter)
    // Occasional upset: 15% chance a provider beats its p50 by a big margin
    const upsetRoll = fairRandom(serverSeed, clientSeed, nonce + 10 + i, 100)
    const upsetBoost = upsetRoll < 15 ? -Math.floor(profile.p50 * 0.3) : 0
    const latencyMs = Math.max(50, profile.p50 + jitter + upsetBoost)
    return { provider: p, latencyMs }
  })

  const sorted = [...latencies].sort((a, b) => a.latencyMs - b.latencyMs)
  const fastest = sorted[0].provider

  // Send provider profiles to client so players can make informed picks
  const providerProfiles = matchup.providers.map(p => {
    const profile = PROVIDER_LATENCY_PROFILES[p]
    return {
      provider: p,
      typicalRange: profile?.typicalRange ?? 'unknown',
      note: profile?.note ?? '',
    }
  })

  return {
    prompt: matchup.prompt,
    insight: matchup.insight,
    providers: matchup.providers,
    providerProfiles,
    fastest,
    latencies,
    liveRaced: false,
  }
}

function generateBenchmarkBrawl(serverSeed: string, clientSeed: string, nonce: number): Record<string, unknown> {
  const scenario = sample(BRAWL_SCENARIOS, serverSeed, clientSeed, nonce)
  return {
    task: scenario.task,
    criteria: scenario.criteria,
    models: scenario.models,
    bestModel: scenario.bestModel,
    outputs: scenario.outputs,
    liveEvaluated: false,
  }
}

// Deepfake categories and prompts
// ---------------------------------------------------------------------------
// Spot the AI — text Turing test: 4 snippets, 1 is AI-generated
// ---------------------------------------------------------------------------
// Each scenario has a theme and 4 snippets (3 human, 1 AI).
// The AI snippet is at a fixed position per scenario.
// Difficulty (sandbox→blackbox) controls how subtle the AI tells are.

interface SpotAIScenario {
  theme: string
  difficulty: 'easy' | 'medium' | 'hard'
  snippets: string[]  // 4 entries; fakeIdx tells which is AI
  fakeIdx: number
  explanation: string // shown after result
}

// sandbox pool — obvious AI tells: over-formality, hedging, "certainly!", bullet overkill
const SPOT_AI_SANDBOX: SpotAIScenario[] = [
  {
    theme: 'Stack Overflow answer · JavaScript object check',
    difficulty: 'easy',
    fakeIdx: 2,
    explanation: 'The AI response uses "Certainly!", numbered list formatting, and "I hope this helps!" — classic AI tells. Humans on Stack Overflow are terse and opinionated.',
    snippets: [
      `Object.keys(obj).length === 0 && obj.constructor === Object\n\nworks in every browser. Don't use JSON.stringify — it's slow and breaks on circular refs.`,
      `!Object.keys(obj).length is what I use. Cleaner in conditionals. Just remember it won't catch null/undefined.`,
      `Certainly! There are several approaches to check if an object is empty in JavaScript:\n\n1. Using Object.keys(): Object.keys(obj).length === 0 returns true for empty objects\n2. Using JSON.stringify(): JSON.stringify(obj) === '{}'\n3. Using a for...in loop for maximum compatibility\n\nI hope this helps!`,
      `lodash has _.isEmpty() if you're already using it. Otherwise Object.keys is fine for 99% of cases.`,
    ],
  },
  {
    theme: 'GitHub issue comment · "this bug is reproducible"',
    difficulty: 'easy',
    fakeIdx: 0,
    explanation: 'The AI response is perfectly structured with environment details, steps to reproduce, and a polite closing — far more formal than typical developer GitHub comments.',
    snippets: [
      `Thank you for reporting this issue! I was able to reproduce the problem on my end.\n\nEnvironment:\n- OS: macOS 14.2\n- Node version: 20.11.0\n- Package version: 3.2.1\n\nSteps to reproduce:\n1. Install the package\n2. Run the example script\n3. Observe the error\n\nI believe this may be related to the recent changes in v3.2.0. Looking forward to a fix!`,
      `yep reproducible here too. node 18, linux. happens every time you pass an empty array as the second arg`,
      `same. also crashes in docker but not locally weirdly. might be a path issue`,
      `confirmed. fresh install, no plugins. the stack trace points to line 847 in parser.js`,
    ],
  },
  {
    theme: 'Code review comment · async/await usage',
    difficulty: 'easy',
    fakeIdx: 1,
    explanation: '"Great work overall!" and "Consider using" are AI hedging patterns. Real code reviewers are direct and point to specific issues without complimenting first.',
    snippets: [
      `you're missing error handling here. if fetchUser rejects the whole component crashes with an unhandled promise rejection`,
      `Great work overall! Consider using a try-catch block to handle potential errors from the async operations. Additionally, you might want to look into using Promise.all() for the independent fetches to improve performance. Keep up the good work!`,
      `this will serialize the fetches unnecessarily. user profile and posts can be parallel — Promise.all([getProfile(id), getPosts(id)])`,
      `also the loading state never resets if the fetch throws. setLoading(false) needs to be in a finally block`,
    ],
  },
  {
    theme: 'Slack dev channel · "anyone know why prod is slow"',
    difficulty: 'easy',
    fakeIdx: 3,
    explanation: 'Slack messages are casual. The AI response is unusually formal and comprehensive for a chat message, using structured formatting in a conversational context.',
    snippets: [
      `check the db. we had a slow query last week that looked exactly like this`,
      `was just looking at the dashboard — p99 spiked around 14:30 UTC. datadog shows it's the /api/search endpoint`,
      `anyone restarted the workers recently? sometimes they just need a kick`,
      `Hello! This could be caused by several factors: 1) Increased traffic load on the database servers, 2) A recent deployment introducing a performance regression, 3) Network latency between services, or 4) Memory pressure causing garbage collection pauses. I'd recommend checking your monitoring dashboards and recent deployment history to narrow down the cause.`,
    ],
  },
]

// production pool — subtler tells: slightly over-thorough, hedging on edge cases, perfect grammar in casual context
const SPOT_AI_PRODUCTION: SpotAIScenario[] = [
  {
    theme: 'Pull request description · adds caching layer',
    difficulty: 'medium',
    fakeIdx: 2,
    explanation: 'The AI PR description is unusually complete — it covers motivation, implementation, testing, and caveats all in a perfectly structured way. Real PRs usually leave some of this implicit.',
    snippets: [
      `adds redis cache in front of the user profile query. 5 min TTL, invalidated on profile updates. reduces db load on /dashboard by ~60% in staging`,
      `cache layer for profile queries. TTL=5m. tested with cache-aside pattern — reads check redis first, miss falls through to db. invalidation hooked to profile update events`,
      `This PR adds a Redis caching layer for user profile queries to address the performance issues identified in #412.\n\nChanges:\n- Added cache-aside pattern with 5-minute TTL\n- Cache invalidation on profile updates via event hook\n- Fallback to database on cache miss\n- Added integration tests for cache hit/miss scenarios\n\nPerformance impact: ~60% reduction in database load in staging. Edge cases handled: cache stampede mitigation via probabilistic early expiration.`,
      `profile query cache. 5min TTL. wired up invalidation on profile saves. see the test file for the cache miss flow`,
    ],
  },
  {
    theme: 'README section · "Contributing" guide',
    difficulty: 'medium',
    fakeIdx: 0,
    explanation: 'The AI README section is comprehensive but slightly too polished — "We welcome contributions of all kinds!" and the full formal structure are AI patterns. Real project READMEs are usually more terse.',
    snippets: [
      `## Contributing\n\nWe welcome contributions of all kinds! Please read through this guide before submitting a pull request.\n\n**Getting started:**\n1. Fork the repository and clone locally\n2. Install dependencies: \`npm install\`\n3. Create a feature branch: \`git checkout -b feature/your-feature\`\n4. Make your changes and add tests\n5. Submit a PR with a clear description of your changes\n\nPlease ensure all tests pass before submitting. We use conventional commits for commit messages.`,
      `PRs welcome. Run \`npm test\` before submitting. For big changes, open an issue first so we can discuss before you write code.`,
      `Fork, branch, PR. Check CONTRIBUTING.md for the full flow. tl;dr: tests must pass, follow the existing code style, keep commits small.`,
      `Open an issue before starting big features. For small fixes just PR directly. We try to review within a few days.`,
    ],
  },
  {
    theme: 'Discord thread · debugging a memory leak',
    difficulty: 'medium',
    fakeIdx: 1,
    explanation: '"The issue you\'re experiencing" and the structured numbered analysis are AI patterns even in casual Discord. Real devs just say what they see.',
    snippets: [
      `rss is growing but heap is stable? sounds like native addons or buffer allocations outside v8. what does --inspect show for external memory?`,
      `The issue you're experiencing is likely related to event listener accumulation. When components unmount without properly removing their event listeners, memory usage will grow steadily over time. To debug this:\n1. Take heap snapshots in Chrome DevTools at intervals\n2. Look for detached DOM nodes\n3. Check for global variable accumulation\nThis pattern is common in SPAs with frequent routing.`,
      `checked with clinic.js? the flame graph usually makes it obvious if it's sync vs async accumulation`,
      `we had the same thing last month. turned out to be a setInterval that wasn't getting cleared on route change. added a cleanup return in the useEffect and it stopped`,
    ],
  },
  {
    theme: 'Blog comment · "great article on microservices"',
    difficulty: 'medium',
    fakeIdx: 3,
    explanation: 'The AI comment is comprehensive and balanced with perfect structure. Blog comments from real devs are usually shorter, more personal, and either more agreeable or more argumentative.',
    snippets: [
      `good article but you glossed over the distributed tracing problem. once you have 20 services correlating a single request's journey across logs is brutal without something like Jaeger`,
      `we went through this exact journey. the part nobody mentions is that your devex tanks initially — local dev with 12 services running is miserable until you invest in good tooling`,
      `the saga pattern section is the best explanation I've seen. finally clicked for me after reading it three times in other places`,
      `This is a well-written overview of microservices architecture. You've covered the key benefits effectively, including scalability, independent deployments, and technology flexibility. That said, it's worth noting that microservices also introduce significant complexity: service discovery, distributed tracing, network latency, and the challenges of distributed transactions. The decision to adopt microservices should be driven by genuine scaling needs rather than architectural preference alone.`,
    ],
  },
]

// blackbox pool — very subtle: AI mimics human tone almost perfectly, tells are in word choice / structure
const SPOT_AI_BLACKBOX: SpotAIScenario[] = [
  {
    theme: 'Team wiki · "lessons learned from the outage"',
    difficulty: 'hard',
    fakeIdx: 3,
    explanation: 'The AI entry captures the right retrospective tone but is slightly too balanced and complete. Real postmortems written by engineers under pressure have more specific blame-free language and jagged structure.',
    snippets: [
      `root cause was the connection pool hitting max at 11:47. we'd bumped traffic 3x with the promo but forgot the pool config hadn't scaled with it. fix was +100 connections, long term: autoscaling the pool on traffic metrics`,
      `the on-call rotation meant nobody with DB experience was paged first. we're fixing the escalation policy so DBA is always in the first tier for storage alerts. took 23 mins to get the right person awake`,
      `monitoring gap: we had alerts on error rate but not on queue depth. by the time errors spiked the queue had been backing up for 8 minutes. adding queue depth as a primary signal this week`,
      `Three things contributed to the severity. First, the deployment went out during peak hours — we've since updated our deployment policy to restrict changes during 09:00-17:00 local time. Second, our rollback took longer than expected because the migration was not easily reversible. Going forward we'll require down migrations before merging. Third, the incident exposed a gap in our runbook for this failure mode, which has now been documented.`,
    ],
  },
  {
    theme: 'Code review · TypeScript generics discussion',
    difficulty: 'hard',
    fakeIdx: 0,
    explanation: 'The AI response is technically correct and well-reasoned but uses "It\'s worth noting that" — a common AI hedging phrase — and is more balanced/comprehensive than a real reviewer would be.',
    snippets: [
      `It's worth noting that while this approach works for simple cases, the generic constraint \`T extends object\` will also accept arrays and functions since they're objects in JavaScript. If you want to restrict to plain objects only, you might consider using a more specific constraint. That said, for the current use case this is probably fine.`,
      `\`T extends object\` lets arrays through which might bite you. if you actually want record-like objects use \`T extends Record<string, unknown>\` — more explicit about the intent`,
      `this is going to have issues with readonly arrays as T. either add readonly to the constraint or document that arrays aren't supported. it'll fail silently otherwise`,
      `nit: the extends object constraint is technically correct but the error message when it fails is terrible. consider adding a branded type or at least a descriptive error with \`satisfies\``,
    ],
  },
  {
    theme: 'Hacker News comment · "Ask HN: why is JS ecosystem so chaotic"',
    difficulty: 'hard',
    fakeIdx: 2,
    explanation: 'Hacker News comments are opinionated and personal. The AI entry reads as more measured and explanatory than a real HN commenter would be, lacking a strong personal stance.',
    snippets: [
      `npm install on a greenfield project shouldn't download 800MB of node_modules to serve a static page. at some point the tooling became the product and we forgot about the thing we're actually building`,
      `the chaos is a feature honestly. 10 different solutions to the same problem means 10 experiments. the ones that survive are actually better. see: module bundlers, we went from grunt to gulp to webpack to vite and each was genuinely better`,
      `The JavaScript ecosystem evolved rapidly in response to genuine developer needs, but this speed came at the cost of stability and standardization. Without a central authority like the Python Software Foundation, package quality varies enormously. That said, this openness also allowed for rapid innovation that a more controlled ecosystem might not have produced.`,
      `worked in java for 8 years before switching to js. java's ecosystem is "stable" because nothing interesting happens. i'll take the chaos and the innovation that comes with it`,
    ],
  },
  {
    theme: 'Internal design doc · API versioning decision',
    difficulty: 'hard',
    fakeIdx: 1,
    explanation: 'Design docs vary a lot but the AI version is suspiciously complete — it covers all tradeoffs, all options, and reaches a reasonable conclusion without any visible author perspective or rough edges.',
    snippets: [
      `went back and forth on URL versioning vs header versioning. landed on URL (/v1/ prefix) purely for debuggability — logs, curl commands, browser address bars all show it without extra tooling. yes it's technically not "pure REST" and no I don't care`,
      `After evaluating the main approaches — URL path versioning (/v1/), header versioning (Accept: application/vnd.api+v1), and query parameter versioning (?version=1) — we recommend URL path versioning for this project. URL versioning is explicit, cacheable, and easy to test without specialized tooling. Header versioning is technically cleaner but requires client configuration that creates onboarding friction. We'll maintain at least two major versions simultaneously with 6-month deprecation windows.`,
      `decision: /v1/ in the URL. boring choice on purpose. header versioning would be cleaner in theory but in practice half our customers will use curl and postman and won't remember to set Accept headers`,
      `worth noting we tried query params first (?v=2). ops hated it because it makes caching unpredictable. URL prefix it is. we'll add a version sunset header so clients get advance warning`,
    ],
  },
]

function generateSpotDeepfake(serverSeed: string, clientSeed: string, nonce: number, tier: DifficultyTier): Record<string, unknown> {
  const pool = tier === 'blackbox' ? SPOT_AI_BLACKBOX : tier === 'production' ? SPOT_AI_PRODUCTION : SPOT_AI_SANDBOX
  const scenario = sample(pool, serverSeed, clientSeed, nonce)

  // Shuffle the snippets so fakeIdx position is randomised per session
  // We track the mapping so we can reveal the correct answer on submit.
  const order = [0, 1, 2, 3]
  // Fisher-Yates using fair random values
  for (let i = order.length - 1; i > 0; i--) {
    const j = fairRandom(serverSeed, clientSeed, nonce + i + 5, i + 1)
    ;[order[i], order[j]] = [order[j], order[i]]
  }

  const snippets = order.map((origIdx, displayPos) => ({
    id: `s-${displayPos}`,
    text: scenario.snippets[origIdx],
    position: displayPos,
    isAI: origIdx === scenario.fakeIdx,
  }))

  const fakePosition = snippets.findIndex(s => s.isAI)

  return {
    theme: scenario.theme,
    difficulty: scenario.difficulty,
    snippets,
    fakePosition,
    explanation: scenario.explanation,
  }
}

// ---------------------------------------------------------------------------
// Prompt Crash — rising multiplier, cash-out timing
// ---------------------------------------------------------------------------

const CRASH_SCENARIOS = [
  { scenario: 'Long-context summarization', model: 'GPT-4o', note: 'Each token added compounds the bill.' },
  { scenario: 'Recursive code refactor',     model: 'Claude Sonnet', note: 'Quality climbs… until the model loops.' },
  { scenario: 'Multi-step agent run',         model: 'DeepSeek R1',  note: 'Every tool call doubles the risk.' },
  { scenario: 'Streaming generation',        model: 'Gemini 2.5 Pro', note: 'Output ramps fast. Cash before the pause.' },
  { scenario: 'Function-call chain',          model: 'GPT-4o',       note: 'Each call is exponential exposure.' },
  { scenario: 'Vision OCR over a doc set',   model: 'Claude Sonnet', note: 'Pages compound. So does cost.' },
  { scenario: 'Reasoning ladder',             model: 'o3-mini',      note: 'Depth pays. Until it doesn\'t.' },
  { scenario: 'Embedding batch',              model: 'text-embedding-3', note: 'Batches grow until the rate limit pops.' },
  { scenario: 'Speculative decoding spike',   model: 'Qwen 3 235B',  note: 'Tokens fly. Latency spikes harder.' },
  { scenario: 'Tool-use loop',                model: 'Mistral Large', note: 'One more call. Just one more.' },
]

/**
 * Derive the crash multiplier from the session seed. Deterministic from
 * (serverSeed, clientSeed, nonce) — used both at challenge time (committed
 * via serverSeedHash) and at submit time to score, guaranteeing provable
 * fairness without ever sending the crash point to the client.
 *
 * Distribution: classic Stake-style 1% house edge. ~1% of rounds instant-bust
 * at 1.00x; otherwise multiplier = floor(100 / r) / 100 where r ∈ (0, 1).
 */
export function derivePromptCrashPoint(serverSeed: string, clientSeed: string, nonce: number): number {
  const h = crypto.createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}:crash`).digest('hex')
  const r = parseInt(h.slice(0, 13), 16) / 0xfffffffffffff
  // 1% house edge: ~1% of rounds bust immediately at 1.00x
  if (r < 0.01) return 1.00
  const m = 99 / (100 * r)
  return Math.max(1.01, Math.min(100, Math.floor(m * 100) / 100))
}

function promptCrashFlavor(resolved: Record<string, unknown>): string {
  const won = Boolean(resolved.won)
  const cashOut = Number(resolved.cashOutAt ?? 0)
  const crash = Number(resolved.crashPoint ?? 0)
  if (!won) {
    if (crash <= 1.00) return 'Instant bust. The prompt crashed before the first token.'
    return `Crashed at ${crash.toFixed(2)}×. You held too long.`
  }
  if (cashOut >= 10) return `JACKPOT. You cashed at ${cashOut.toFixed(2)}× before the ${crash.toFixed(2)}× crash. Cold-blooded.`
  if (cashOut >= 5)  return `Big win. ${cashOut.toFixed(2)}× clean. Crash would have come at ${crash.toFixed(2)}×.`
  if (cashOut >= 2)  return `Solid pull at ${cashOut.toFixed(2)}×. The crash was waiting at ${crash.toFixed(2)}×.`
  return `Cashed safe at ${cashOut.toFixed(2)}×. The crash hit ${crash.toFixed(2)}×.`
}

function generatePromptCrash(serverSeed: string, clientSeed: string, nonce: number): Record<string, unknown> {
  const scenario = sample(CRASH_SCENARIOS, serverSeed, clientSeed, nonce)
  // CRITICAL: crashPoint is NOT included here. The client never sees it until
  // they cash out (or bust). Server re-derives it deterministically at scoring
  // time from the seed, which was hash-committed at challenge time.
  return { scenario: scenario.scenario, model: scenario.model, note: scenario.note }
}

/**
 * Score Prompt Crash. Returns a (score, reward) pair that bypasses the
 * standard economy.calculateReward pipeline — multipliers don't fit the
 * 0-100 score model used by every other game.
 */
export function resolvePromptCrash(
  challenge: Record<string, unknown>,
  submission: Record<string, unknown>,
  entryCost: number,
  serverSeed: string,
  clientSeed: string,
  nonce: number,
): { score: number; reward: number; crashPoint: number; cashOutAt: number; won: boolean; resolvedChallenge: Record<string, unknown> } {
  const crashPoint = derivePromptCrashPoint(serverSeed, clientSeed, nonce)
  const rawCashOut = Number(submission.cashOutAt ?? 0)
  // Treat anything below 1.01 as "did not cash out" — covers the bust case.
  const cashOutAt = rawCashOut >= 1.01 ? Math.floor(rawCashOut * 100) / 100 : 0
  const won = cashOutAt > 0 && cashOutAt <= crashPoint
  const reward = won ? Math.floor(entryCost * cashOutAt) : 0
  // Score is purely cosmetic for celebration tiers: 70+ → big win, 90+ → jackpot
  let score = 0
  if (won) {
    if (cashOutAt >= 5) score = 100
    else if (cashOutAt >= 3) score = 92
    else if (cashOutAt >= 2) score = 78
    else if (cashOutAt >= 1.5) score = 62
    else score = 45
  }
  return {
    score,
    reward,
    crashPoint,
    cashOutAt,
    won,
    resolvedChallenge: { ...challenge, crashPoint, cashOutAt, won, multiplier: cashOutAt || crashPoint },
  }
}

// ---------------------------------------------------------------------------
// Token Mines — pick-N-safe-cells game with provably-fair mine layout
// ---------------------------------------------------------------------------

export const MINES_GRID_SIZE = 25 // 5×5 grid

/** Tier → mine count. More mines = higher payout per pick, but higher risk. */
const MINES_PER_TIER: Record<DifficultyTier, number> = {
  sandbox: 3,
  production: 5,
  blackbox: 8,
}

/**
 * Deterministically derive the set of mine cell indexes from the session seed.
 * Uses Fisher-Yates with HMAC-driven randomness so the layout is reproducible
 * at verify time but unguessable from outside.
 */
export function deriveMinePositions(
  serverSeed: string,
  clientSeed: string,
  nonce: number,
  gridSize: number,
  mineCount: number,
): number[] {
  // Fisher-Yates shuffle driven by HMAC-derived randomness.
  const indexes = Array.from({ length: gridSize }, (_, i) => i)
  for (let i = gridSize - 1; i > 0; i--) {
    const h = crypto.createHmac('sha256', serverSeed).update(`${clientSeed}:${nonce}:mines:${i}`).digest('hex')
    const r = parseInt(h.slice(0, 12), 16)
    const j = r % (i + 1)
    ;[indexes[i], indexes[j]] = [indexes[j], indexes[i]]
  }
  return indexes.slice(0, mineCount).sort((a, b) => a - b)
}

/**
 * Multiplier after `k` successful (safe) reveals on a (gridSize, mineCount) grid.
 * Standard hypergeometric formula with a 1% house edge, matching industry Mines:
 *
 *   m(k) = 0.99 * ∏(i=0..k-1) (gridSize - i) / (gridSize - mineCount - i)
 *
 * Returns 1.00 for k=0 (no picks yet).
 */
export function minesMultiplier(k: number, gridSize: number, mineCount: number): number {
  if (k <= 0) return 1.0
  const maxSafe = gridSize - mineCount
  if (k > maxSafe) return 0
  let m = 0.99
  for (let i = 0; i < k; i++) {
    m *= (gridSize - i) / (maxSafe - i)
  }
  return Math.floor(m * 100) / 100
}

/** Build the full multiplier ladder up to max-safe reveals (handed to client). */
function minesLadder(gridSize: number, mineCount: number): number[] {
  const maxSafe = gridSize - mineCount
  return Array.from({ length: maxSafe + 1 }, (_, k) => minesMultiplier(k, gridSize, mineCount))
}

function generateTokenMines(serverSeed: string, clientSeed: string, nonce: number, tier: DifficultyTier): Record<string, unknown> {
  const mineCount = MINES_PER_TIER[tier] ?? 3
  // CRITICAL: mine positions NOT included here. Re-derived from seed on every
  // reveal/cashout action server-side. revealed[] tracks player progress.
  return {
    gridSize: MINES_GRID_SIZE,
    mineCount,
    revealed: [] as number[],
    multiplierLadder: minesLadder(MINES_GRID_SIZE, mineCount),
    settled: false,
    exploded: false,
    explodedAt: null as number | null,
    finalMultiplier: 1.0,
  }
}

const GENERATORS: Record<string, ChallengeGenerator> = {
  token_prophet: generateTokenProphet,
  prompt_golf: (s, c, n) => generatePromptGolf(s, c, n),
  bug_exorcist: generateBugExorcist,
  context_chicken: (s, c, n) => generateContextChicken(s, c, n),
  rate_limit_roulette: (s, c, n) => generateRateLimitRoulette(s, c, n),
  benchmark_brawl: (s, c, n) => generateBenchmarkBrawl(s, c, n),
  spot_deepfake: generateSpotDeepfake,
  prompt_crash: (s, c, n) => generatePromptCrash(s, c, n),
  token_mines: generateTokenMines,
}

// ---------------------------------------------------------------------------
// Token Mines — server actions (reveal one cell / cash out)
// ---------------------------------------------------------------------------

export interface MinesActionResult {
  ok: boolean
  state: {
    revealed: number[]
    safeCount: number
    mineCount: number
    gridSize: number
    multiplier: number      // current cash-out multiplier
    nextMultiplier: number  // multiplier after one more safe pick (for "next" preview)
    multiplierLadder: number[]
    settled: boolean
    exploded: boolean
    explodedAt: number | null
    minePositions: number[] | null // only filled after settle
  }
  /** Optional reveal data for the result screen (mirrors prompt_crash). */
  resolved?: {
    finalMultiplier: number
    reward: number
    score: number
    flavorMessage: string
    minePositions: number[]
    revealed: number[]
    exploded: boolean
    explodedAt: number | null
  }
}

function minesFlavor(safeCount: number, exploded: boolean, mineCount: number): string {
  if (exploded) {
    if (safeCount === 0) return 'Mine on the first click. Brutal.'
    if (safeCount <= 2)  return `Hit a mine after ${safeCount} picks. The math caught up fast.`
    return `Made it ${safeCount} picks deep. One more was too greedy.`
  }
  if (safeCount === 0) return 'Cashed out with no picks. Nothing risked, nothing gained.'
  const maxSafe = 25 - mineCount
  if (safeCount === maxSafe) return `MAXED OUT. Every safe cell cleared. Cold-blooded.`
  if (safeCount >= 10) return `Big pull. ${safeCount} safe picks before walking away.`
  if (safeCount >= 5)  return `Solid run. ${safeCount} safe picks.`
  return `Cashed safe after ${safeCount} picks.`
}

/**
 * Reveal a single cell. If safe → append to revealed[], persist, return new state.
 * If mine → settle the session (no payout) and return the full mine layout.
 */
export async function revealMinesCell(input: {
  userId: string
  sessionId: string
  cellIndex: number
}): Promise<MinesActionResult> {
  return db.$transaction(async (tx) => {
    const session = await tx.gameSession.findFirst({
      where: { id: input.sessionId, userId: input.userId },
    })
    if (!session) throw new Error('Session not found')
    if (session.game !== 'token_mines') throw new Error('Wrong game type')
    if (session.settledAt) throw new Error('Session already settled')
    if (!session.serverSeed || !session.clientSeed || session.nonce === null) {
      throw new Error('Session missing fairness seed')
    }

    const challenge = session.challenge as Record<string, unknown> & {
      gridSize: number; mineCount: number; revealed: number[]; multiplierLadder: number[]
    }
    const gridSize = challenge.gridSize
    const mineCount = challenge.mineCount
    const revealed = [...(challenge.revealed ?? [])]

    if (input.cellIndex < 0 || input.cellIndex >= gridSize) {
      throw new Error('Cell index out of range')
    }
    if (revealed.includes(input.cellIndex)) {
      throw new Error('Cell already revealed')
    }

    const minePositions = deriveMinePositions(
      session.serverSeed,
      session.clientSeed,
      Number(session.nonce),
      gridSize,
      mineCount,
    )

    const isMine = minePositions.includes(input.cellIndex)

    if (isMine) {
      // Settle session: player hit a mine, loses everything (entry already debited at challenge time).
      const settled = {
        ...challenge,
        revealed: [...revealed, input.cellIndex],
        settled: true,
        exploded: true,
        explodedAt: input.cellIndex,
        finalMultiplier: 0,
      }
      await tx.gameSession.update({
        where: { id: session.id },
        data: { challenge: settled as Prisma.InputJsonValue, submittedAt: new Date(), settledAt: new Date() },
      })

      const flavor = minesFlavor(revealed.length, true, mineCount)
      const attempt = await tx.gameAttempt.create({
        data: {
          sessionId: session.id,
          userId: input.userId,
          game: 'token_mines',
          submission: { action: 'reveal', cellIndex: input.cellIndex, exploded: true, safePicks: revealed.length } as Prisma.InputJsonValue,
          score: 0,
          rewardAmount: 0,
          metadata: { tier: session.difficulty, exploded: true, flavorMessage: flavor } as Prisma.InputJsonValue,
        },
      })
      // For event-bus consumers (LiveTicker)
      ;(attempt as unknown as { __flavor: string }).__flavor = flavor

      return {
        ok: true,
        state: {
          revealed: settled.revealed,
          safeCount: revealed.length,
          mineCount,
          gridSize,
          multiplier: 0,
          nextMultiplier: 0,
          multiplierLadder: challenge.multiplierLadder,
          settled: true,
          exploded: true,
          explodedAt: input.cellIndex,
          minePositions,
        },
        resolved: {
          finalMultiplier: 0,
          reward: 0,
          score: 0,
          flavorMessage: flavor,
          minePositions,
          revealed: settled.revealed,
          exploded: true,
          explodedAt: input.cellIndex,
        },
      }
    }

    // Safe pick: append to revealed, update multiplier, persist.
    const newRevealed = [...revealed, input.cellIndex]
    const safeCount = newRevealed.length
    const maxSafe = gridSize - mineCount
    const multiplier = challenge.multiplierLadder[safeCount] ?? minesMultiplier(safeCount, gridSize, mineCount)
    const nextMultiplier = safeCount < maxSafe
      ? (challenge.multiplierLadder[safeCount + 1] ?? minesMultiplier(safeCount + 1, gridSize, mineCount))
      : multiplier

    const updated = { ...challenge, revealed: newRevealed }
    await tx.gameSession.update({
      where: { id: session.id },
      data: { challenge: updated as Prisma.InputJsonValue },
    })

    return {
      ok: true,
      state: {
        revealed: newRevealed,
        safeCount,
        mineCount,
        gridSize,
        multiplier,
        nextMultiplier,
        multiplierLadder: challenge.multiplierLadder,
        settled: false,
        exploded: false,
        explodedAt: null,
        minePositions: null,
      },
    }
  })
}

/**
 * Cash out the current state. Computes reward = floor(entryCost × current multiplier),
 * credits bonus_compute, settles the session, returns full reveal data (including mine layout).
 */
export async function cashOutMines(input: { userId: string; sessionId: string }): Promise<MinesActionResult> {
  return db.$transaction(async (tx) => {
    const session = await tx.gameSession.findFirst({
      where: { id: input.sessionId, userId: input.userId },
    })
    if (!session) throw new Error('Session not found')
    if (session.game !== 'token_mines') throw new Error('Wrong game type')
    if (session.settledAt) throw new Error('Session already settled')
    if (!session.serverSeed || !session.clientSeed || session.nonce === null) {
      throw new Error('Session missing fairness seed')
    }

    const challenge = session.challenge as Record<string, unknown> & {
      gridSize: number; mineCount: number; revealed: number[]; multiplierLadder: number[]
    }
    const gridSize = challenge.gridSize
    const mineCount = challenge.mineCount
    const revealed = [...(challenge.revealed ?? [])]
    const safeCount = revealed.length

    if (safeCount === 0) {
      throw new Error('Cannot cash out without revealing at least one cell')
    }

    const multiplier = challenge.multiplierLadder[safeCount] ?? minesMultiplier(safeCount, gridSize, mineCount)
    const grossReward = Math.floor(session.entryCost * multiplier)
    const rake = Math.floor(grossReward * 200 / 10000) // 2% rake
    const reward = grossReward - rake

    const minePositions = deriveMinePositions(
      session.serverSeed,
      session.clientSeed,
      Number(session.nonce),
      gridSize,
      mineCount,
    )

    // Score is purely cosmetic for celebration tiers (mirrors prompt_crash).
    let score = 0
    if (multiplier >= 5) score = 100
    else if (multiplier >= 3) score = 92
    else if (multiplier >= 2) score = 78
    else if (multiplier >= 1.5) score = 62
    else score = 45

    if (reward > 0) {
      await addLedgerEntry({
        tx,
        userId: input.userId,
        bucket: 'bonus_compute',
        type: 'arena_reward',
        // reward is already net of the house rake; rake is recorded in metadata
        // for revenue reporting and is never minted (it is not a balance movement).
        amount: reward,
        metadata: { game: 'token_mines', score, multiplier, safePicks: safeCount, mineCount, grossReward, rake, rake_bps: 200 },
      })
    }

    const settled = {
      ...challenge,
      revealed,
      settled: true,
      exploded: false,
      explodedAt: null,
      finalMultiplier: multiplier,
    }
    await tx.gameSession.update({
      where: { id: session.id },
      data: { challenge: settled as Prisma.InputJsonValue, submittedAt: new Date(), settledAt: new Date() },
    })

    const flavor = minesFlavor(safeCount, false, mineCount)
    await tx.gameAttempt.create({
      data: {
        sessionId: session.id,
        userId: input.userId,
        game: 'token_mines',
        submission: { action: 'cashout', safePicks: safeCount, multiplier } as Prisma.InputJsonValue,
        score,
        rewardAmount: reward,
        metadata: { tier: session.difficulty, multiplier, safePicks: safeCount, flavorMessage: flavor } as Prisma.InputJsonValue,
      },
    })

    return {
      ok: true,
      state: {
        revealed,
        safeCount,
        mineCount,
        gridSize,
        multiplier,
        nextMultiplier: multiplier,
        multiplierLadder: challenge.multiplierLadder,
        settled: true,
        exploded: false,
        explodedAt: null,
        minePositions,
      },
      resolved: {
        finalMultiplier: multiplier,
        reward,
        score,
        flavorMessage: flavor,
        minePositions,
        revealed,
        exploded: false,
        explodedAt: null,
      },
    }
  })
}

export function scoreGameSubmission(
  game: GameType,
  challenge: Record<string, unknown>,
  submission: Record<string, unknown>,
  tier: DifficultyTier,
): number {
  const scorer = SCORERS[game]
  if (!scorer) throw new Error(`Unknown game: ${game}`)
  return Math.max(0, Math.min(100, scorer(challenge, submission, tier)))
}

// ---------------------------------------------------------------------------
// Client safety — strip answer/reveal fields before a challenge is sent to the
// browser. The FULL challenge (with these fields) is what we persist in the DB
// session and use for server-side scoring; the client only ever sees the
// playable subset. Reveal data is returned later in the submit response via
// resolvedChallenge. Without this, anyone with devtools could read the answer
// straight out of the network response and farm a perfect score every time.
// ---------------------------------------------------------------------------

const CLIENT_HIDDEN_FIELDS: Partial<Record<GameType, string[]>> = {
  token_prophet: ['longerIs', 'tokensA', 'tokensB', 'hint', 'expectedTokens', 'outputA', 'outputB', 'liveVerified', 'verificationModel'],
  bug_exorcist: ['mustInclude', 'explanation', 'aiJudgment'],
  context_chicken: ['minContext'],
  rate_limit_roulette: ['fastest', 'latencies', 'fastestModelId', 'modelLatencies'],
  benchmark_brawl: ['bestModel', 'bestModelId'],
  spot_deepfake: ['fakePosition', 'fakeIdx', 'explanation'],
}

export function sanitizeChallengeForClient(
  game: GameType,
  challenge: Record<string, unknown>,
): Record<string, unknown> {
  const clone: Record<string, unknown> = { ...challenge }
  for (const field of CLIENT_HIDDEN_FIELDS[game] ?? []) delete clone[field]

  // Spot the AI: each snippet is tagged with isAI (the answer) and each image
  // with isFake. The play UI only needs the text/position, so strip the answer
  // flags — otherwise the client could just look for isAI:true in the payload.
  if (game === 'spot_deepfake') {
    if (Array.isArray(clone.snippets)) {
      clone.snippets = (clone.snippets as Array<Record<string, unknown>>).map((s) => {
        const rest = { ...s }
        delete rest.isAI
        return rest
      })
    }
    if (Array.isArray(clone.images)) {
      clone.images = (clone.images as Array<Record<string, unknown>>).map((img) => {
        const rest = { ...img }
        delete rest.isFake
        return rest
      })
    }
  }

  return clone
}

// Persists an enriched challenge back onto the session so that scoring and the
// post-submit reveal use exactly the data the player interacted with (live race
// latencies, judge-selected best model, generated images, etc.). Called by the
// challenge route after enrichment and before sanitizing for the client.
export async function persistEnrichedChallenge(
  sessionId: string,
  challenge: Record<string, unknown>,
): Promise<void> {
  await db.gameSession.update({
    where: { id: sessionId },
    data: { challenge: challenge as Prisma.InputJsonValue },
  })
}

// ---------------------------------------------------------------------------
// Session helpers
// ---------------------------------------------------------------------------

async function getDailyBonusEarned(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  const startOfDay = new Date()
  startOfDay.setUTCHours(0, 0, 0, 0)
  const result = await tx.creditLedgerEntry.aggregate({
    where: {
      userId,
      bucket: 'bonus_compute',
      type: 'arena_reward',
      amount: { gt: 0 },
      createdAt: { gte: startOfDay },
    },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0
}

async function getRecentSessionCount(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  const windowStart = new Date(Date.now() - ECONOMY.SESSION_WINDOW_SECONDS * 1000)
  return tx.gameSession.count({
    where: {
      userId,
      createdAt: { gte: windowStart },
      settledAt: null,
    },
  })
}

async function getUserStreak(tx: Prisma.TransactionClient, userId: string): Promise<number> {
  const recent = await tx.gameAttempt.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    take: ECONOMY.MAX_STREAK * 10,
    select: { score: true, createdAt: true },
  })
  return computeStreak(recent)
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export async function createGameSession(userId: string, game: GameType, tier: DifficultyTier = 'sandbox') {
  const tierConfig = TIER_CONFIGS[tier]
  const proof = createFairnessProof(Date.now())

  // Chance-game kill-switch (compliance geofence). Disabled chance games still
  // leave every skill game playable.
  if (isChanceGame(game) && !chanceGamesEnabled()) {
    throw new Error('This game is currently unavailable in your region.')
  }

  // Check subscription gate before entering the transaction
  const requiredPlan = TIER_SUBSCRIPTION_REQUIREMENT[tier]
  if (requiredPlan) {
    const sub = await db.userSubscription.findUnique({
      where: { userId },
      select: { tier: true, status: true },
    })
    if (!sub || sub.status !== 'active' || sub.tier !== requiredPlan) {
      throw new Error(`The ${tier} tier requires an active ${requiredPlan} subscription.`)
    }
  }

  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const activeSessions = await getRecentSessionCount(tx, userId)
    if (activeSessions >= ECONOMY.MAX_ACTIVE_SESSIONS_PER_WINDOW) {
      throw new Error('Too many active sessions. Wait a moment before starting another game.')
    }

    const arenaBalance = await tx.creditLedgerEntry.aggregate({
      where: { userId, bucket: 'arena_credits' },
      _sum: { amount: true },
    })
    if ((arenaBalance._sum.amount ?? 0) < tierConfig.entryCost) {
      throw new Error('Insufficient arena credits')
    }

    await addLedgerEntry({
      tx,
      userId,
      bucket: 'arena_credits',
      type: 'arena_entry',
      amount: -tierConfig.entryCost,
      metadata: { game, tier },
    })

    const generator = GENERATORS[game]
    if (!generator) throw new Error(`Unknown game: ${game}`)
    const challenge = generator(proof.serverSeed, proof.clientSeed, proof.nonce, tier)

    const expiresAt = new Date(Date.now() + tierConfig.timeLimitSeconds * 1000)

    return tx.gameSession.create({
      data: {
        userId,
        game,
        challenge: { ...challenge, tier } as Prisma.InputJsonValue,
        entryCost: tierConfig.entryCost,
        serverSeedHash: proof.serverSeedHash,
        clientSeed: proof.clientSeed,
        serverSeed: proof.serverSeed,
        nonce: proof.nonce,
        difficulty: tier,
        expiresAt,
      },
    })
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable })
}

export async function submitGameSession(input: {
  userId: string
  sessionId: string
  submission: Record<string, unknown>
}) {
  return db.$transaction(async (tx: Prisma.TransactionClient) => {
    const session = await tx.gameSession.findFirst({
      where: { id: input.sessionId, userId: input.userId },
    })
    if (!session) throw new Error('Game session not found')
    if (session.settledAt) throw new Error('Game session already settled')

    if (session.expiresAt && new Date() > session.expiresAt) {
      const refundAmount = Math.floor(session.entryCost * ECONOMY.EXPIRED_SESSION_REFUND_RATIO)
      if (refundAmount > 0) {
        await addLedgerEntry({
          tx,
          userId: input.userId,
          bucket: 'arena_credits',
          type: 'adjustment',
          amount: refundAmount,
          metadata: { reason: 'session_expired_refund', sessionId: session.id },
        })
      }
      await tx.gameSession.update({
        where: { id: session.id },
        data: { settledAt: new Date() },
      })
      throw new Error('Game session expired. Partial refund issued.')
    }

    const challenge = session.challenge as Record<string, unknown>
    const tier = (challenge.tier ?? session.difficulty ?? 'sandbox') as DifficultyTier
    const submission = input.submission
    const game = session.game

    // Prompt Crash uses a wager × multiplier model that doesn't fit the
    // standard score → reward pipeline. Resolve it inline.
    let score: number
    let rewardAmount: number
    let capped = false
    let rakeAmount = 0
    let resolvedChallenge: Record<string, unknown> = challenge

    if (game === 'prompt_crash') {
      if (!session.serverSeed || !session.clientSeed || session.nonce === null) {
        throw new Error('Session missing fairness seed — cannot resolve crash round')
      }
      const resolution = resolvePromptCrash(
        challenge,
        submission,
        session.entryCost,
        session.serverSeed,
        session.clientSeed,
        Number(session.nonce),
      )
      score = resolution.score
      rewardAmount = resolution.reward
      resolvedChallenge = resolution.resolvedChallenge
    } else {
      score = scoreGameSubmission(game, challenge, submission, tier)
      const streak = await getUserStreak(tx, input.userId)
      const dailyEarned = await getDailyBonusEarned(tx, input.userId)
      const calc = calculateReward({ score, tier, streak, dailyEarned })
      rewardAmount = calc.reward
      capped = calc.capped
      rakeAmount = calc.rake

      // For games that need submission data on the reveal screen, embed it
      // in the resolved challenge so the client can display it.
      if (game === 'token_prophet' && submission.pick !== undefined) {
        resolvedChallenge = { ...challenge, playerPick: submission.pick }
      }
      if (game === 'spot_deepfake' && submission.selectedPosition !== undefined) {
        resolvedChallenge = { ...challenge, playerSelectedPosition: submission.selectedPosition }
      }
      if (game === 'benchmark_brawl' && submission.pick !== undefined) {
        resolvedChallenge = { ...challenge, playerPick: submission.pick }
      }

    }

    const streak = game === 'prompt_crash' ? await getUserStreak(tx, input.userId) : 0
    const flavorMessage = game === 'prompt_crash'
      ? promptCrashFlavor(resolvedChallenge)
      : getFlavorMessage(score)

    if (rewardAmount > 0) {
      await addLedgerEntry({
        tx,
        userId: input.userId,
        bucket: 'bonus_compute',
        type: 'arena_reward',
        // rewardAmount is already net of the house rake; rake is recorded in
        // metadata for revenue reporting (it is not minted as a balance movement).
        amount: rewardAmount,
        metadata: { game, score, tier, streak, capped, rake: rakeAmount, rake_bps: 200 },
      })
    }

    const attempt = await tx.gameAttempt.create({
      data: {
        sessionId: session.id,
        userId: input.userId,
        game,
        submission: submission as Prisma.InputJsonValue,
        score,
        rewardAmount,
        metadata: { tier, streak, capped, flavorMessage } as Prisma.InputJsonValue,
      },
    })

    await tx.gameSession.update({
      where: { id: session.id },
      data: { submittedAt: new Date(), settledAt: new Date() },
    })

    return {
      session,
      attempt,
      flavorMessage,
      // Resolved challenge includes game-specific reveal data (e.g. crashPoint/cashOutAt for prompt_crash).
      // Falls back to the original session.challenge for games that don't enrich post-submit.
      resolvedChallenge,
      serverSeed: session.serverSeed,
      serverSeedHash: session.serverSeedHash,
      clientSeed: session.clientSeed,
    }
  })
}
