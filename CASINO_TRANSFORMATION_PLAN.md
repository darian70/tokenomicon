# Tokenomicon Casino Transformation Plan

Based on research into Rainbet, Stake, Roobet, and casino UX psychology.

## Core Insight

**Tokenomicon is currently a "skill challenge" platform that feels like taking a test.**  
**Casino games are "experiences" that make you feel alive.**

The difference is in the **anticipation loop**, **visual spectacle**, and **social energy**.

---

## Phase 1: Cinematic Foundation (2-3 weeks)

### 1.1 Full-Screen Game Mode
```
- Dark, cinematic background when game active
- Game area expands to 80% viewport
- Ambient particle effects (subtle floating points)
- Hide wallet/leaderboard during play (accessible via slide-out)
- "Immersive Mode" toggle
```

### 1.2 Particle & Animation System
```
Components needed:
- <ParticleExplosion /> - win celebration
- <GlowTrail /> - cursor/pointer effects
- <PulsingOrb /> - anticipation building
- <ConfettiRain /> - big win celebration
- <FloatingText /> - "+50 CR" animations

Libraries to consider:
- react-particles (confetti)
- framer-motion (orchestrated animations)
- canvas-confetti (lightweight bursts)
```

### 1.3 Sound Design Framework
```
Even if initially silent, architect for:
- useSound() hook with audio sprite mapping
- Sound categories:
  - ambient: low hum when on platform
  - anticipation: rising tone during countdown
  - win: ascending chime + impact
  - lose: descending tone
  - ui: subtle clicks on interactions

Format: Web Audio API with fallback to muted
```

### 1.4 Hot/Trending Indicators
```
- "🔥 12 playing now" badge on games
- Live player count API (WebSocket or polling)
- "Trending" tab in game selector
- Recent big wins ticker (top of screen)
- "Last win: +450 CR" pulse animation
```

### 1.5 Daily Streak System
```
- Visual calendar streak (like Duolingo)
- Day 1: 10 arena credits
- Day 3: 25 arena credits (2.5x)
- Day 7: 100 arena credits + XP boost
- Miss a day = reset (gamification pressure)
- Streak flame icon on profile
```

---

## Phase 2: New Game Mechanics (3-4 weeks)

### 2.1 NEW GAME: Token Mines (Rainbet-style)

**Concept:** 5×5 grid, hidden tokens and bombs. Escalating risk.

**Flow:**
1. Entry: Choose wager (10-1000 CR)
2. Setup: Server generates board (provably fair hash)
3. Phase 1 - First Click: Reveal tile
   - Safe: Show credit amount, multiplier increases
   - Bomb: Game over, lose wager
4. Decision Point: After each safe tile
   - CASH OUT: Take current multiplier × wager
   - CONTINUE: Risk it for higher multiplier
5. Escalation: Each safe tile increases multiplier (1.1x → 1.25x → 1.5x...)
6. Resolution: Cash out or hit bomb

**UI:**
- Grid with covered tiles (mystery aesthetic)
- Multiplier display with pulsing glow
- Cash Out button grows/shrinks based on potential
- History of previous multipliers
- "Provably Fair" badge with hash reveal

**Psychology:**
- Illusion of control (player chooses tiles)
- Escalating commitment (already revealed 3 safe)
- Near-miss visualization (bomb was adjacent)

### 2.2 NEW GAME: Prompt Crash (Stake-style)

**Concept:** Rising multiplier, timing-based cash out.

**Flow:**
1. Entry: Choose wager
2. Phase 1 - Launch: Multiplier starts at 1.00x
3. Phase 2 - Rise: Visual counter climbing (1.00x → 1.50x → 2.00x...)
   - Speed varies (sometimes fast, sometimes slow)
   - Visual: Rocket climbing, counter glowing
4. Decision Point: Player clicks "CASH OUT" at any time
5. Phase 3 - Crash: Random crash point (could be 1.01x or 100x)
   - If cashed out before crash: win multiplier × wager
   - If didn't cash out: lose wager

**UI:**
- Large, pulsing multiplier display (center screen)
- Cash Out button that pulses/grows as multiplier rises
- Graph line showing rise (visual anticipation)
- "Auto Cash Out" setting (e.g., at 2.00x)
- History graph of last 50 crashes

**Psychology:**
- Timing skill (illusion of control)
- Greed trap ("just a little more...")
- Near-miss celebration (crashed right after you cashed)

### 2.3 REWORK: All Existing Games (Anticipation Phase)

**Token Prophet:**
- Add 3-second countdown before reveal
- Sound/visual building tension
- "Confidence meter" animation when submitting
- Near-miss: Show how close prediction was

**Prompt Golf:**
- Token compression visualization (shrinking animation)
- Reveal: Token-by-token count with sound
- "Almost! You were 2 tokens over"

**Bug Exorcist:**
- Code scanning animation
- Bug "catch" animation
- Miss celebration when close to perfect

---

## Phase 3: Social & Live Features (2-3 weeks)

### 3.1 Live Activity Overlay
```
During gameplay, show:
- Top-right: "3 others playing Mines now"
- Bottom ticker: "Alice won +320 CR in Crash"
- Big win popup (when someone hits 10x+)
- "Your friend just played..." notifications
```

### 3.2 Big Win Celebrations
```
When player wins >5x their wager:
- Full-screen confetti rain (3 seconds)
- Victory music (orchestral sting)
- Floating "+1,250 CR" text
- Broadcast to all users: "Big win in Prompt Crash!"
- Option to share on social
```

### 3.3 In-Game Reactions
```
Reaction bar during games:
- 👏 (clap for good play)
- 😮 (shock at near-miss)
- 🔥 (hot streak)
- 🍀 (good luck)

Shown as floating emojis near the player
```

### 3.4 Tournaments & Events
```
- Hourly: "Most wins in Mines" (100 CR prize)
- Daily: "Highest multiplier in Crash" (500 CR prize)
- Weekly: "Longest streak" (special badge)
- Live tournament leaderboard overlay
```

### 3.5 Provably Fair Ceremony
```
Visual hash verification:
1. Pre-game: Show server seed hash
2. During: Client seed combined
3. Post-game: Reveal actual server seed
4. Animation: "Verifying fairness... ✓"
5. Link to verify independently
```

---

## Technical Architecture Changes

### WebSocket Implementation
```
- Real-time player counts per game
- Live win feed broadcasting
- Tournament leaderboards
- Reaction system
```

### Game State Machine
```
Current: idle → active → submitting → result → idle

New Phases:
- idle → ante (wager selection)
- ante → anticipation (countdown/buildup)
- anticipation → action (playing the game)
- action → decision (cash out? continue?)
- decision → resolution (win/lose reveal)
- resolution → celebration (if win)
- celebration → idle
```

### Animation System
```
Priority animations:
1. Entry/exit transitions (200-300ms)
2. Anticipation building (pulsing, glow)
3. Win celebration (800-1200ms)
4. Ambient (continuous subtle)

Performance:
- Use transform/opacity only
- will-change on animated elements
- Reduce motion media query support
```

### Sound Architecture
```
Audio sprite approach:
- Single file with all sounds
- JSON map of start/end times
- Preload critical sounds
- Mute by default, opt-in

Categories:
- ui: clicks, hovers (subtle)
- ambient: background hum
- anticipation: rising tones
- win: ascending + impact
- lose: descending
```

---

## UI/UX Patterns to Adopt

### From Rainbet/Stake:
1. **Minimal clicks** — Everything within 1-2 taps
2. **Full-screen focus** — Game is the hero
3. **Visual hierarchy** — Big numbers, clear CTAs
4. **Motion consistency** — Same easing curves throughout
5. **Dark mode default** — Immersive, casino aesthetic

### Casino Psychology:
1. **Loss disguised as win** — "You got 3/5 right!" even if lost credits
2. **Sunk cost celebration** — "So close! Try again?"
3. **Social proof everywhere** — Others winning, playing, streaking
4. **Progress visibility** — XP bar, rank, streak always visible
5. **Time pressure** — "Bonus expires in 2:34"

---

## Success Metrics

### Engagement
- Daily active users (target: 3x increase)
- Average session length (target: 10+ minutes)
- Games played per session (target: 5+)
- Return rate day 7 (target: 40%+)

### Monetization
- Average wager size (target: increase 2x)
- Conversion to paid credits (target: 15%)
- Lifetime value (target: 3x increase)

### Experience
- Time to first game (target: <30 seconds)
- Game completion rate (target: 90%+)
- Social feature usage (target: 30%+ use reactions)

---

## Implementation Order

### Week 1-2: Foundation
- [ ] Animation system setup
- [ ] Sound framework (silent)
- [ ] Full-screen game mode
- [ ] Hot indicators (static data)

### Week 3-4: Token Mines
- [ ] Game logic implementation
- [ ] Grid UI with interactions
- [ ] Provably fair system
- [ ] Cash out mechanics
- [ ] Particle effects

### Week 5-6: Prompt Crash
- [ ] Rising multiplier logic
- [ ] Cash out timing
- [ ] Visual graph/rocket
- [ ] History display

### Week 7-8: Social Features
- [ ] WebSocket setup
- [ ] Live activity feed
- [ ] Big win celebrations
- [ ] Reaction system

### Week 9-10: Polish
- [ ] Sound implementation
- [ ] Mobile optimization
- [ ] Performance tuning
- [ ] A/B testing setup

---

## The End Goal

**Tokenomicon becomes a destination.**

People open it because it's **fun to play**, not because they need credits.  
The credits become the excuse. The games become the addiction.

The compute credits are just what they win along the way.
