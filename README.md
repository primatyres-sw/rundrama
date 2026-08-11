# 🏃 RunDrama

> **Run to unlock the story.** A mobile web prototype that turns running distance into the key that unlocks a short-form drama series generated entirely with AI.

📄 Phased development plan: [plan.md](plan.md)

---

## 1. Concept

You open the site on your phone and see a vertical treasure-hunt path with three pins. Each pin is one episode. The first is free; the rest require accumulated running distance.

**Core loop:** watch an unlocked episode → hit a cliffhanger → swipe up to the next one → **hit the lock wall** → go run → come back and unlock it.

What separates this from a normal fitness app is that **the motivation is narrative, not numerical.** Nobody runs for a streak or a badge here — they run because they want to know what happens next.

---

## 2. ⚠️ Scope: this is a prototype

This section states plainly what is production-grade and what is not, so nobody has to guess.

| Component | Status |
|---|---|
| UI / UX / core loop | ✅ **Real** and fully functional |
| All 3 episode videos | ✅ **Real** — every frame AI-generated |
| Strava integration | ✅ **Real** — OAuth 2.0 + Activities API |
| Running distance | ✅ **Real** — pulled from the athlete's own Strava activities |
| Distance-based unlock rules | ⚠️ **Real**, but enforced client-side |
| User accounts / database | ❌ **None** — the Strava session lives in an httpOnly cookie, progress in `localStorage` |

### What the Strava integration actually does

`Link Strava` → real OAuth consent screen → `Sync Strava` → `GET /athlete/activities` → foot-sport distance from the **last 30 days** becomes the unlock currency.

Cycling is excluded on purpose: at 3 km to clear the whole series, a bike ride would finish it before the presentation ended.

### The two limits that shape the demo

| Limit | Effect |
|---|---|
| **New API apps start at 1 athlete** (self-upgradable to 10 in the dashboard, review required beyond that) | The room cannot all connect their own Strava — the presenter connects one account on stage |
| **Standard-tier API access requires a paid Strava subscription** (since June 2026, ~$11.99/mo) | Access ends when the subscription does |

Both are account-level constraints, not code ones. **The `+1 km` simulation button was removed** once the integration was real — the on-stage demo connects for real, so there is no offline path to unlocking any more.

---

## 3. Tech Stack

```
Next.js (App Router) + TypeScript
Tailwind CSS
Framer Motion      ← unlock animations, swipe gate
Route Handlers     ← app/api/strava/* — OAuth + activity sync
httpOnly cookie    ← Strava tokens, no database
localStorage       ← { distanceKm: number }
Vercel
```

**No** database · user accounts · webhooks.

> The first version of this proposal was designed around Supabase + Strava OAuth + webhooks + a 5-table schema. OAuth came back; the rest stayed cut. Sync is **polled on a button press** rather than pushed by a webhook — a webhook needs a public HTTPS callback that localhost cannot provide, and buys nothing when a human is standing there pressing Sync. Every cut and its reasoning is documented in §9.

---

## 4. App Specification

### 4.1 Screens

**Home** — a vertical SVG treasure path with three pins and a runner marker that advances with accumulated distance.

| Button | Visual weight | Behaviour |
|---|---|---|
| `Sync Strava` | Largest, top | Pulls real distance from the Strava API and walks the odometer up |
| `Reset` | Beside Sync | Back to 0.0 km — for re-running the demo |
| `Link Strava` | Below, pre-connection only | Real OAuth — full-page redirect to Strava's consent screen |
| `Unlink` | Below, post-connection only | Drops the session so the OAuth flow can be shown live again |

> **Why `Unlink` exists.** The connect flow is the most convincing thirty seconds of the demo, and it only plays once per browser. Without a way to drop the session on purpose, rehearsing it means clearing cookies by hand between run-throughs.

**Unlocks are staggered by 600 ms.** A sync that clears three episodes at once fires them one at a time — simultaneous unlocks read as a glitch rather than a reward.

**Player** — fullscreen 9:16, swipe up/down between episodes.
Swiping toward a locked episode **bounces back with `🔒 X.X km to go`**.

### 4.2 Unlock logic

```ts
const EPISODES = [
  { id: 1, requiredKm: 0.0, title: 'A Scent That Isn\'t His' },
  { id: 2, requiredKm: 1.0, title: 'The Café He\'d Never Been To' },
  { id: 3, requiredKm: 2.0, title: 'Exactly As Planned' },
  { id: 4, requiredKm: 5.0, title: 'Season 2', comingSoon: true },
]

const isUnlocked = (ep) => distanceKm >= ep.requiredKm
```

**Unlock state is derived, never stored.** Unlocking is a pure function of distance — storing it as a boolean creates two sources of truth that can drift apart.

**No cap.** `Sync` at 5 km unlocks everything at once, but the animation must **stagger by 600 ms per episode**. Fire them simultaneously and the brain registers nothing but a flicker.

**Ep.4 is permanently locked** as a closing teaser. It answers *"if I finish the series in one run, why would I come back?"* on screen, rather than out loud.

---

## 5. The Story

### 5.1 Cast

An infidelity drama where every character is a fruit — **not just a joke, but a technical decision.** AI video cannot hold a human face consistent across shots, but fruit is identified by shape and colour, which models control far more reliably. It also sidesteps the uncanny valley entirely, and comedy is far more forgiving of AI artifacts than serious drama.

| Character | Role | Consistency anchor |
|---|---|---|
| 🥭 **Mango** | Wife / protagonist | Bright yellow button-up shirt, white polka-dot scarf |
| 🥥 **Durian** | Husband | Black leather jacket |
| 🍇 **Grape** | The affair | Purple dress, long dangling earrings |
| 🫐 **Mangosteen** | The one behind it all | Dark navy outfit, always holding a phone |

> **Wardrobe is a stronger anchor than a face.** Viewers re-identify a character from colour and clothing within half a second — even when the model renders the face differently in every single shot.

### 5.2 The engine: smell

Durian is the most pungent fruit there is — **it cannot hide anything.** Smell replaces the lipstick-on-the-collar of classic infidelity cinema, working as the joke and the plot mechanism at the same time.

| Ep | Distance | Beat | Closing twist |
|---|---|---|---|
| **1** | Free | Durian and Grape secretly kiss in bed, then Mango and Durian share a loving breakfast | Mango sends Durian to work, unaware |
| **2** | 1.0 km | Durian does not come home; Mango waits late into the night, worried | Mango falls asleep alone |
| **3** | 2.0 km | Durian is still missing; Mango calls Mangosteen, who comes to comfort her | Mangosteen secretly phones someone: **"Start now."** |

**Why the Ep.3 twist has to be this one:** it reframes both preceding episodes without a word of explanation, flips Mango from victim to architect, and opens Season 2 — all in a single beat.

---

## 6. 🤖 AI Generation Pipeline

This is **the heart of the project as a Gen AI exercise.** Every frame is AI-generated. Nothing was filmed; no stock footage was used.

```
prompt → 4 character reference images
       → 9 scene images   [image-edit, to preserve identity]
       → 9 video clips     [image-to-video, 10s each]
       → 3 Thai VO tracks
       → edit + English subtitles + compress
       → public/videos/ep1..3.mp4
```

### 6.1 Non-negotiable rules

| Rule | Reason |
|---|---|
| ❌ **Never text-to-video** | Every shot must come from the locked reference image, or you get a different character every time |
| ❌ **Never show a mouth moving in sync with speech** | Thai lip-sync is poor in every current model; a Thai speaker spots it in two seconds |
| ✅ **Favour over-shoulder / hands / eye close-ups** | Avoids lip-sync **and** solves consistency simultaneously |
| ✅ **Reuse the identical style block everywhere** | Consistent lighting and render style matters as much as consistent characters |

### 6.2 Style block

**Append to every prompt without changing a single word.**

```
3D animated character, Pixar-style rendering, soft cinematic lighting,
subsurface scattering, gentle rim light, warm color grading,
shallow depth of field, clean composition, 9:16 vertical
```

**Negative prompt (use every time):**
```
photorealistic, human face, realistic human, text, watermark, logo,
extra limbs, deformed, blurry, low quality, mouth talking, lip sync
```

---

### 6.3 Prompts — character reference images

> **Model:** fal.ai › FLUX.1 [dev] · **Aspect ratio:** 9:16 · Generate 3–4 per character and keep the best.

**🥭 Mango — wife, protagonist**
```
A charming 3D animated character: a ripe golden-yellow mango as the head and
body, with a warm expressive cartoon face, big gentle eyes, slender stylized
arms and legs. Wearing a bright yellow button-up shirt and a white polka-dot
neck scarf. Kind, hopeful expression. Full body, standing, neutral A-pose,
front view, clean light grey studio background.
[STYLE BLOCK]
```

**🥥 Durian — husband**
```
A charming 3D animated character: a spiky green-brown durian as the head and
body, with a cartoon face, slender stylized arms and legs. Wearing a black
leather jacket. Confident but subtly uneasy expression. Full body, standing,
neutral A-pose, front view, clean light grey studio background.
[STYLE BLOCK]
```

**🍇 Grape — the affair**
```
A charming 3D animated character: a cluster of deep purple grapes forming the
head and body, with an alluring cartoon face, long eyelashes, slender stylized
arms and legs. Wearing an elegant purple dress and long dangling gold earrings.
Confident, knowing expression. Full body, standing, elegant pose, front view,
clean light grey studio background.
[STYLE BLOCK]
```

**🫐 Mangosteen — the mastermind**
```
A charming 3D animated character: a dark purple mangosteen as the head and body,
with its distinctive green calyx crown on top, calm unreadable cartoon face,
slender stylized arms and legs. Wearing a dark navy outfit, holding a smartphone.
Composed, secretive expression. Full body, standing, neutral pose, front view,
clean light grey studio background.
[STYLE BLOCK]
```

---

### 6.4 Prompts — scene images (9 shots)

> **Model:** fal.ai › an identity-preserving image-edit model (e.g. Nano Banana / Gemini Image Edit). **Always upload the reference image** — never generate from text alone.

#### Ep.1 — The Morning After

| # | Prompt |
|---|---|
| **1.1** | `The durian character and the purple grape character lying close together on a bed, gently kissing, romantic betrayal implied, both fully clothed under a neat blanket, no nudity, no explicit content, soft morning light through curtains, cinematic over-the-shoulder shot. [STYLE BLOCK]` |
| **1.2** | `The yellow-shirted mango character preparing a warm breakfast table at home, two plates, fresh fruit, morning sunlight, cheerful hopeful expression. Cozy apartment kitchen, medium wide shot. [STYLE BLOCK]` |
| **1.3** | `The mango character and the durian character sitting together at the breakfast table, smiling warmly like a happy couple, then Mango lovingly sends Durian off to work near the apartment doorway. Bright morning light, wholesome domestic mood. [STYLE BLOCK]` |

#### Ep.2 — Waiting Past Midnight

| # | Prompt |
|---|---|
| **2.1** | `The mango character sitting alone at a dinner table at night, one untouched plate across from her, checking her phone with a worried expression, apartment lights dim and quiet. [STYLE BLOCK]` |
| **2.2** | `Close-up of the mango character looking at the apartment door late at night, wall clock showing very late hour, her expression shifting from patience to fear, soft shadows. [STYLE BLOCK]` |
| **2.3** | `The mango character asleep on a sofa under a small blanket, phone still in her hand, untouched dinner on the table in the background, lonely apartment at night. [STYLE BLOCK]` |

#### Ep.3 — Start Now

| # | Prompt |
|---|---|
| **3.1** | `Morning light in the apartment. The mango character wakes on the sofa and checks her phone, realizing the durian character still has not come home. Her face shows fear and confusion. [STYLE BLOCK]` |
| **3.2** | `The dark purple mangosteen character arriving at Mango's apartment and gently comforting the worried mango character, sitting beside her on the sofa, supportive friend energy, soft morning light. [STYLE BLOCK]` |
| **3.3** | `The mangosteen character alone in a quiet hallway outside the apartment, phone held to her ear, face calm and unreadable, secretly making a call. She says nothing visibly, a slow satisfied smile forming, deep shadows. [STYLE BLOCK]` |

---

### 6.5 Prompts — image to video

> **Model:** fal.ai › **Kling 2.6 Pro** ($0.07/sec — **not 3.0 at $0.20**)
> **Duration:** 10s · **Aspect:** 9:16 · **Input:** the scene images from §6.4

| Shot | Motion prompt |
|---|---|
| 1.1 | `Slow cinematic push-in. The two characters gently kiss and stay close under the blanket. Keep it romantic but non-explicit, fully clothed, no nudity.` |
| 1.2 | `Slow morning push-in. Mango places breakfast on the table, adjusts the second plate, and smiles to herself.` |
| 1.3 | `Warm handheld shot. Mango and Durian smile at breakfast, then Mango waves goodbye as Durian leaves for work.` |
| 2.1 | `Very slow push-in. Mango checks her phone, looks toward the empty chair, and waits.` |
| 2.2 | `Static close-up. Mango looks from the clock to the locked door. Her expression becomes worried.` |
| 2.3 | `Slow pull-back. Mango falls asleep on the sofa with the phone in her hand. The apartment stays still and quiet.` |
| 3.1 | `Morning static shot. Mango wakes suddenly, checks her phone, and sits up in fear.` |
| 3.2 | `Gentle medium shot. Mangosteen sits beside Mango and comforts her with a hand on her shoulder. Keep the motion subtle.` |
| 3.3 | `Very slow push-in. Mangosteen steps into the hallway, raises the phone to her ear, and smiles slightly.` |

> **💡 The golden rule of motion prompts: less movement is better.** Heavy motion makes the model "forget" the character and deform it mid-clip. The best shots are slow camera moves with a single small character action.

---

### 6.6 Thai voiceover — ElevenLabs

**Settings:**

| Parameter | Value |
|---|---|
| Model | `eleven_multilingual_v2` |
| Voice | Female — audition 2–3 and pick whichever handles Thai most naturally |
| Stability | **40** — lower keeps emotion in; higher goes flat |
| Similarity | **80** |
| Style exaggeration | **25** |
| Speaker boost | On |

> Total usage is roughly 600 characters — **comfortably inside the free tier (10,000/month). This step costs nothing.**

The narration is Thai; subtitles are English (§6.7).

#### Ep.1 — The Morning After

```
มะม่วง: "ตื่นแล้วเหรอพี่ทุเรียน มากินข้าวเร็ว"
มะม่วง: "วันนี้ทำของโปรดพี่ด้วยนะ"
ทุเรียน: "ขอบคุณนะ มะม่วง"
มะม่วง: "ช่วงนี้พี่เหนื่อยไหม ดูไม่ค่อยได้นอนเลย"
ทุเรียน: "งานยุ่งนิดหน่อย ไม่มีอะไรหรอก"
มะม่วง: "งั้นตั้งใจทำงานนะ เดี๋ยวเย็นนี้มะม่วงรอ"
ทุเรียน: "อืม... แล้วเจอกัน"
```

#### Ep.2 — Waiting Past Midnight

```
มะม่วง: "พี่ทุเรียน... อยู่ไหนแล้วนะ"
มะม่วง: "โทรไปก็ไม่รับ ไลน์ไปก็ไม่อ่าน"
มะม่วง: "หรือว่างานยุ่งจริงๆ"
มะม่วง: "แต่ปกติพี่ไม่เคยหายไปแบบนี้นี่นา"
มะม่วง: "กลับมาเถอะนะ... มะม่วงเป็นห่วง"
มะม่วง: "ถ้าพี่เห็นข้อความนี้ โทรกลับหน่อยนะ"
```

#### Ep.3 — Start Now

```
มะม่วง: "มังคุด... พี่ทุเรียนยังไม่กลับมาเลย"
มะม่วง: "เมื่อคืนทั้งคืน เขาไม่รับสายเราเลย"
มังคุด: "ใจเย็นๆ นะมะม่วง เราอยู่นี่แล้ว"
มะม่วง: "เรากลัว... กลัวว่าเกิดอะไรขึ้นกับเขา"
มังคุด: "ไม่เป็นไรนะ เดี๋ยวเราช่วยสืบให้เอง"
มะม่วง: "ขอบคุณนะมังคุด เราไม่รู้จะโทรหาใครแล้ว"
มังคุด: "ไม่ต้องกลัวนะ... เชื่อเรา"
มังคุด: "เริ่มจัดการได้เลย"
```

### 6.7 English subtitles (burned in via CapCut)

**Ep.1**
```
Mango: "You're awake. Come eat, Durian."
Mango: "I made your favorite today."
Durian: "Thank you, Mango."
Mango: "Are you tired lately? You look like you haven't slept."
Durian: "Just busy with work. Nothing serious."
Mango: "Then do your best today. I'll wait for you tonight."
Durian: "Yeah... see you later."
```

**Ep.2**
```
Mango: "Durian... where are you?"
Mango: "You won't answer my calls. You won't read my messages."
Mango: "Maybe you're really busy."
Mango: "But you never disappear like this."
Mango: "Please come home... I'm worried."
Mango: "If you see this, call me back."
```

**Ep.3**
```
Mango: "Mangosteen... Durian still hasn't come home."
Mango: "He didn't answer me all night."
Mangosteen: "Calm down, Mango. I'm here now."
Mango: "I'm scared. What if something happened to him?"
Mangosteen: "It's okay. I'll help you find out."
Mango: "Thank you. I didn't know who else to call."
Mangosteen: "Don't be afraid. Trust me."
Mangosteen: "Start now."
```

---

### 6.8 Export & compression

```
Resolution : 720 × 1280   (not 1080 × 1920)
Codec      : H.264
Quality    : CRF ~28
Audio      : 96 kbps
Target     : ≤ 4 MB per episode  →  ~12 MB total
```

> **⚠️ This is not about visual polish — it decides whether the demo survives.**
> Forty people opening 15 MB videos at once is **600 MB across one conference Wi-Fi network.** The room will stall, and everyone will conclude "the app is slow" rather than "the network is slow."
> On a phone screen, 720p is indistinguishable from 1080p anyway.
> **Also set `preload="none"` on every `<video>`** — otherwise the browser downloads all three clips on first paint.

---

## 7. 💰 Cost

| Item | Tool | Cost |
|---|---|---|
| Reference + scene images (13) | fal.ai › FLUX / Image Edit | ~$0.50 |
| 90 seconds of video | fal.ai › Kling 2.6 Pro @ $0.07/sec | ~$6.30 |
| Thai voiceover | ElevenLabs free tier | **$0.00** |
| Editing, subtitles, export | CapCut | **$0.00** |
| Hosting | Vercel Hobby | **$0.00** |
| **One full pass** | | **~$7** |
| **With retakes** | | **a $10 top-up is enough** |

> fal.ai has **no subscription.** It is prepaid credit consumed as you generate, with no minimum spend and **no expiry**.

**🔴 Test-first protocol — do not skip**
1. Using **free signup credits**, generate **one** Mango image — is the style right?
2. Turn that image into **one** 10-second clip — does it survive motion?
3. **Only top up after both pass.**

The expensive mistake in this kind of work is not the $7. It is generating all 9 clips and only then discovering the characters don't match — **the four lost hours hurt far more.**

---

## 8. 🎤 Demo

**Before you start:** press `Unlink`, then `Reset`. The demo has to begin disconnected at 0.0 km.

### Act 1 — make them understand the rules
```
Open Home at 0.0 km · Ep.1 unlocked · Ep.2/3 locked
Play Ep.1 for 5 seconds → swipe up to Ep.2 → bounce back 🔒
"That wall is the whole product."
```

### Act 2 — make them believe it
```
Press [Link Strava] → real Strava consent screen → Authorize
Press [Sync Strava] → real distance lands → Ep.2 then Ep.3 unlock, 600 ms apart
Land on the Season 2 card
```

**Why two acts:** Act 1 makes them *understand*; Act 2 makes them *believe*. Either one alone is significantly weaker.

> ⚠️ **This demo requires the network.** There is no offline fallback — the `+1 km` button is gone. Record a backup video (plan.md 5.3) and have it open in another tab.

### Prepared answers

**❓ "Is the Strava integration real?"**
> Yes — that was Strava's own consent screen, and the distance came from `GET /athlete/activities`. What isn't real is scale: new API apps are capped at one athlete, self-upgradable to ten, so I can't have the whole room connect right now.

**❓ "Could I just copy the video URL and skip ahead?"**
> Yes. The unlock rules run client-side. In production it's a one-line server-side query issuing a 60-second signed URL. We know exactly where that belongs.

**❓ "What stops someone connecting an account with 3,000 km of history?"**
> Nothing yet — that's the honest answer. Only the last 30 days count, which blunts it but doesn't fix it. The real fix is anchoring the baseline to the moment they start the series, not to their account history.

**❓ "If I finish the series in one run, why come back?"**
> *Don't answer — the Season 2 card already did.*

**❓ "Where is the AI in this project?"**
> In the entire production pipeline — §6 of this README. Character prompts, using wardrobe as a consistency anchor instead of faces, designing shots to avoid Thai lip-sync, the image-to-video pipeline. **Every frame is AI-generated; nothing was filmed.**

> 💡 **Volunteer the 1-athlete cap before anyone asks.** Waiting to be caught makes a known constraint look like an oversight.

---

## 9. What was cut, and why

Every item below was fully designed and then deliberately removed — **not skipped for lack of knowing how.**

| Cut | Reason |
|---|---|
| Strava **webhooks** | Needs a public HTTPS callback localhost can't provide. Polling on a button press is what a demo actually needs — **OAuth itself was reinstated, see §2** |
| Supabase (DB + Auth + Storage) | With no users to store, there was nothing left to store — the Strava session fits in one httpOnly cookie |
| `activities` table + idempotency | Designed to survive duplicate webhook deliveries — no webhooks, nothing to survive |
| Signed URLs protecting the videos | Requires server-side state, which conflicts with having no users — **we accept the lock is decorative** |
| Badge / puzzle-piece reward system | A second reward system stacked on the first; it didn't improve the core loop |
| A reusable video-generation skill | Three episodes are faster by hand than building the tool — the knowledge lives in §6 instead |
| The `+1 km` simulation button | Redundant once the API was live — but it was also the only offline fallback, so the backup demo video is now mandatory |

### Production roadmap

If this were taken further, in priority order:

1. **Anchor the distance baseline to the series, not the account** — the 30-day window blunts this but a regular runner still unlocks everything on first connect. This is the biggest correctness gap in the current build
2. **An `activities` table** with `UNIQUE(strava_activity_id)` — idempotency comes free from the database constraint, with no dedup logic to write
3. **Supabase Storage + signed URLs** to make the lock real
4. **Push notifications** — the one place where webhooks genuinely earn their keep (notify the moment they hit Save in Strava)
5. **Weekly series releases** — retention comes from content cadence, not from withholding distance

---

## 10. Getting Started

```bash
npm install
cp .env.example .env.local     # then fill in the two Strava values
npm run dev
# http://localhost:3000
```

### Strava credentials

Create an app at **strava.com/settings/api**, then put the ID and secret in `.env.local`.

| Field | Value | Matters? |
|---|---|---|
| Authorization Callback Domain | `localhost` — bare, no scheme, no port, no path | ✅ **wrong here and OAuth fails immediately** |
| Website | anything | ❌ cosmetic |
| Icon | anything square | required by the form only |

**Restart the dev server after editing `.env.local`** — Next does not hot-reload environment variables. Confirm with:

```bash
curl -s localhost:3000/api/strava/status   # expect "configured":true
```

> **Callback Domain accepts exactly one domain.** Keep a second Strava app for the deployed domain rather than editing this one back and forth. Vercel *preview* deployments get random URLs and will always fail `redirect_uri` — test on the production URL.

### Layout

```
app/api/strava/auth       ← redirect to consent, mint CSRF state
app/api/strava/callback   ← verify state + scope, store session cookie
app/api/strava/sync       ← refresh token if stale, sum last 30 days
app/api/strava/status     ← is a session present?
app/api/strava/disconnect ← drop the session (the Unlink button)
lib/strava.ts             ← token exchange, refresh, activity fetch
lib/episodes.ts           ← metadata + thresholds
lib/progress.ts           ← localStorage
public/videos/ep1..3.mp4  ← unlock at 0.0 / 1.0 / 2.0 km
```

**Reset progress:** press `Reset` in the app, or run `localStorage.clear()` in the console.

่james -husky