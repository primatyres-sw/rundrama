# RunDrama — Development Plan

> Distilled from a 20-question design grilling session · Full spec in [README.md](README.md)

## Progress log (updated 2026-08-11)

- **Phase 0 — Validation:** ✅ Complete. Final character, scene, and clip outputs exist under `assets/`.
- **Phase 1 — Content Production:** ✅ Complete. Character refs, scene stills, and generated clips exist under `assets/characters`, `assets/scenes`, and `assets/clips`.
- **Phase 2 — App Skeleton:** ✅ Complete.
  - ✅ `npx create-next-app` scaffold (TypeScript, Tailwind, App Router) — done
  - ✅ `npm i framer-motion lucide-react` — done
  - ✅ 2.1 Three 30s black placeholder MP4s in `public/videos/ep1..3.mp4` (via ffmpeg) — done
  - ✅ 2.2 `lib/episodes.ts` — done
  - ✅ 2.3 `lib/progress.ts` — done
  - ✅ 2.4 Home screen (treasure path, pins, runner marker) — done
  - ✅ 2.5 Buttons (`+1 km` / `Sync` / `Reset`) — done, then replaced in Phase 6
  - ✅ 2.6 Fake `Connect with Strava` flow — done, then replaced in Phase 6
  - ✅ 2.7 Player screen (fullscreen 9:16, swipe) — done
  - ✅ 2.8 Lock gate bounce-back — done
  - ✅ 2.9 Permanently-locked Ep.4 card — done
- **Phase 3 — Audio & Assembly:** ✅ Complete. Final MP4s exist in `assets/final/`; demo-ready compressed copies are in `public/videos/`.
  - ✅ 3.1–3.5 Thai VO, assembly, subtitles, BGM/SFX
  - ✅ 3.6 Compress/export final MP4s to demo-safe size
- **Phase 4 — Integration & Polish:** 🟨 In progress.
  - ✅ 4.1 Real MP4s copied into `public/videos/ep1..3.mp4`
  - ✅ 4.2 `<video preload="none">` is in place
  - ✅ 4.3 600 ms stagger when `Sync` unlocks multiple episodes at once
  - ✅ 4.4 Unlock animation + haptic feedback (`navigator.vibrate`)
  - ✅ 4.6 Episodes play with sound, with a muted fallback for iOS
  - ⬜ 4.5 Real-phone playback test — **also the only way to verify the sound fallback**
- **Phase 5 — Demo Prep:** ⬜ Not started. **5.3 (backup video) is now mandatory, not optional** — see Phase 6.
- **Phase 6 — Real Strava Integration:** ✅ Complete. Replaced the simulated flow with live OAuth 2.0 + Activities API.
  - ✅ 6.1 `lib/strava.ts` — token exchange, refresh, activity fetch
  - ✅ 6.2 Five route handlers under `app/api/strava/`
  - ✅ 6.3 Tokens in an httpOnly cookie — no database
  - ✅ 6.4 `Unlink` button so the OAuth flow can be re-demoed on stage
  - ✅ 6.5 **Removed the `+1 km` button** — the demo now connects for real
  - ⬜ 6.6 Deploy to Vercel with a second Strava app for the production domain

## Principles behind this plan

1. **Phase 0 blocks everything.** The only unknown risk in this project is *"will Kling render a fruit character that actually looks good?"* Everything else we already know how to do. Answer that before touching code.
2. **Phase 1 and Phase 2 run in parallel.** Craft work and code work use different parts of the brain and have no dependency on each other.
3. **The app uses 3 black MP4s as placeholders from day one.** The player only needs to know a file exists at that path — it does not need the real video.

---

## Phase 0 — Validation (BLOCKING · ~1–2 hrs)

**Goal:** prove the chosen style is achievable *before spending money and before spending time.*

| # | Task | Tool |
|---|---|---|
| 0.1 | Create fal.ai + ElevenLabs accounts (done) | — |
| 0.2 | Using **free signup credits**, generate 1 reference image of 🥭 Mango | fal.ai — FLUX |
| 0.3 | Judge the image: is it soft 3D cartoon? Is the yellow shirt readable? Does the face carry emotion? | Your eyes |
| 0.4 | Feed that image into a single 10-second clip | fal.ai — Kling 2.6 Pro |
| 0.5 | Judge the clip: **does it stay the same character while moving?** Does clothing shift color? Does the face melt? | Your eyes |

**Exit criteria — all three must pass before continuing:**
- [ ] The still image reads as the character you want
- [ ] The character holds its shape through motion
- [ ] Clothing and colors stay stable across all 10 seconds

**If it fails — three fallbacks, in the order you should try them:**
1. Fix the prompt (add `full body`, `neutral pose`, strip unnecessary detail)
2. Switch to **2D flat illustration** — far easier for models to keep consistent than 3D
3. Fall back to **still images + Ken Burns pan/zoom** in CapCut — no video model at all

**Only top up the $10 after Phase 0 passes.**

---

## Phase 1 — Content Production (parallel with Phase 2 · ~4–6 hrs)

**Goal:** 9 raw clips.

| # | Task | Output |
|---|---|---|
| 1.1 | Generate reference images for all 4 characters (Mango, Durian, Grape, Mangosteen) | 4 images |
| 1.2 | Use an image-edit model to place characters into 9 scenes | 9 scene images |
| 1.3 | Image-to-video all 9 scenes @ Kling 2.6 Pro, 10s each | 9 clips |
| 1.4 | Cull and retake anything that breaks | — |

**Non-negotiable rules:**
- ❌ **Never text-to-video.** Every shot must originate from the locked reference image.
- ❌ **Never show a mouth moving in sync with speech.** Use over-shoulder, hands, eye close-ups.
- ✅ **Use the identical style block in every prompt** (see README §6.2)

**Exit criteria:** 9 clips where the characters read as the same individuals across all three episodes.

---

## Phase 2 — App Skeleton (parallel with Phase 1 · ~4–5 hrs)

**Goal:** the full flow works, running on black video files.

```
npx create-next-app@latest rundrama --typescript --tailwind --app
npm i framer-motion lucide-react
```

| # | Task |
|---|---|
| 2.1 | Create three 30-second black MP4s in `public/videos/ep1..3.mp4` |
| 2.2 | `lib/episodes.ts` — metadata + thresholds `[0, 1.0, 2.0]` as constants |
| 2.3 | `lib/progress.ts` — read/write `localStorage: { distanceKm }` + hook |
| 2.4 | **Home** screen — vertical SVG treasure path, 3 pins, runner marker that advances with distance |
| 2.5 | Buttons: `+1 km` (large, top) · `Sync from Strava (5.0 km)` (small, below) · `Reset` — *superseded by Phase 6* |
| 2.6 | Fake `Connect with Strava` button — **1.5s spinner** → `Connected ✓` — *superseded by Phase 6* |
| 2.7 | **Player** screen — fullscreen 9:16, swipe up/down |
| 2.8 | **Lock gate** — swiping to a locked episode bounces back with `🔒 X.X km to go` |
| 2.9 | Permanently-locked **Ep.4 card** — `Season 2 · 3.0 km to go` |

**Exit criteria:** pressing `+1 km` genuinely unlocks Ep.2 · swiping to Ep.3 bounces · progress survives a page refresh.

---

## Phase 3 — Audio & Assembly (~3–4 hrs)

**Goal:** three finished, shippable MP4s.

| # | Task | Tool |
|---|---|---|
| 3.1 | Generate Thai VO for all 3 episodes (scripts in README §6.6) | ElevenLabs multilingual v2 |
| 3.2 | Concatenate 3 clips into one episode | CapCut |
| 3.3 | Lay Thai VO onto the timeline, retime to match the visuals | CapCut |
| 3.4 | Burn in **English subtitles** | CapCut |
| 3.5 | Add light BGM + SFX (door, rain) | CapCut |
| 3.6 | **Export: 720×1280 · H.264 · ≤4 MB per file** | CapCut |

**Exit criteria:** 3 files totalling ~12 MB · subtitles legible on a phone screen.

---

## Phase 4 — Integration & Polish (~2–3 hrs)

| # | Task |
|---|---|
| 4.1 | Swap black MP4s for the real ones |
| 4.2 | Add `preload="none"` to every `<video>` — otherwise the browser downloads all 3 clips on first paint |
| 4.3 | **600 ms stagger** when `Sync` unlocks multiple episodes at once |
| 4.4 | Unlock animation — path pin changes state + haptic feedback (`navigator.vibrate`) |
| 4.5 | Test on a real phone, not DevTools device emulation |

**Exit criteria:** opening the Vercel URL from someone else's phone plays smoothly.

---

## Phase 5 — Demo Prep (~1–2 hrs)

| # | Task |
|---|---|
| 5.1 | Deploy to Vercel + generate a **QR code** for the room |
| 5.2 | Rehearse the two-act demo with a timer — target **under 3 minutes** |
| 5.3 | **Record a backup demo video** in case the Wi-Fi dies |
| 5.4 | Test several devices hitting it simultaneously |
| 5.5 | Rehearse the four prepared answers (README §8) |

### Demo script

**Setup — press `Unlink` then `Reset` before you begin.**

**Act 1 — make them understand the rules**
```
Open Home at 0.0 km · Ep.1 unlocked · Ep.2/3 locked
Play Ep.1 for 5 seconds → swipe up to Ep.2 → bounce back 🔒
"That wall is the whole product."
```

**Act 2 — make them believe it**
```
Press [Link Strava] → real Strava consent screen → Authorize
Press [Sync Strava] → real distance lands
→ Ep.2 then Ep.3 unlock, 600 ms apart
→ Land on the Season 2 card
```

> ⚠️ **No offline fallback exists any more.** The `+1 km` button is gone, so a dead network kills the live demo outright. Have the backup video (5.3) open in another tab.

---

## Time summary

| Phase | Time | Parallelizable |
|---|---|---|
| 0 · Validation | 1–2 hrs | ❌ blocking |
| 1 · Content | 4–6 hrs | ✅ with Phase 2 |
| 2 · App | 4–5 hrs | ✅ with Phase 1 |
| 3 · Assembly | 3–4 hrs | ❌ |
| 4 · Integration | 2–3 hrs | ❌ |
| 5 · Demo prep | 1–2 hrs | ❌ |
| **Total** | **~15–20 hrs** | **~3 working days** |

> ⚠️ **No real deadline has been set yet.** If time is shorter than this, cut in exactly this order: BGM/SFX (3.5) → haptics (4.4) → replace the treasure path with a plain progress bar (2.4).

---

## Definition of Done

- [x] Linking a real Strava account and pressing `Sync` unlocks episodes from real activity distance
- [x] `Unlink` returns the app to a disconnected state so the OAuth flow can be re-demoed
- [ ] Swiping to a locked episode bounces back with a message
- [ ] Episodes play with sound on the presentation machine
- [ ] All 3 videos have Thai VO + English subtitles, and the characters read as the same individuals
- [ ] The experience ends on the Season 2 card
- [ ] **A backup demo video exists** — mandatory now that no offline fallback remains
- [x] README fully documents the AI production pipeline

**Retired:** *"A stranger opens the URL and it just works — no login"* and *"40 devices at once"*. Strava caps the app at 1 athlete (10 after self-upgrade), so a room-wide try-it-yourself is no longer possible. The demo is presenter-driven by design — see README §2.
