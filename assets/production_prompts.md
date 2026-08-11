# RunDrama Video Production Prompts

Use these with the character references in `assets/characters/`.

## Character References

- Mango: `assets/characters/mango.png`
- Durian: `assets/characters/durian.png`
- Grape: `assets/characters/grape.png`
- Mangosteen: `assets/characters/mangosteen.jpg`

## Style Block

Append this to every scene-image prompt:

```text
3D animated character, Pixar-style rendering, soft cinematic lighting,
subsurface scattering, gentle rim light, warm color grading,
shallow depth of field, clean composition, 9:16 vertical
```

Negative prompt:

```text
photorealistic, human face, realistic human, text, watermark, logo,
extra limbs, deformed, blurry, low quality, mouth talking, lip sync,
nude, nudity, explicit sexual content
```

## Step 1 - Scene Images on fal.ai

Use `Nano Banana / Gemini Image Edit`. Upload the listed reference image(s), then paste the prompt.

| Shot | Upload references | Scene image prompt |
|---|---|---|
| 1.1 | `durian.png`, `grape.png` | `The durian character and the purple grape character lying close together on a bed, gently kissing, romantic betrayal implied, both fully clothed under a neat blanket, no nudity, no explicit content, soft morning light through curtains, cinematic over-the-shoulder shot. [STYLE BLOCK]` |
| 1.2 | `mango.png` | `The yellow-shirted mango character preparing a warm breakfast table at home, two plates, fresh fruit, morning sunlight, cheerful hopeful expression. Cozy apartment kitchen, medium wide shot. [STYLE BLOCK]` |
| 1.3 | `mango.png`, `durian.png` | `The mango character and the durian character sitting together at the breakfast table, smiling warmly like a happy couple, then Mango lovingly sends Durian off to work near the apartment doorway. Bright morning light, wholesome domestic mood. [STYLE BLOCK]` |
| 2.1 | `mango.png` | `The mango character sitting alone at a dinner table at night, one untouched plate across from her, checking her phone with a worried expression, apartment lights dim and quiet. [STYLE BLOCK]` |
| 2.2 | `mango.png` | `Close-up of the mango character looking at the apartment door late at night, wall clock showing very late hour, her expression shifting from patience to fear, soft shadows. [STYLE BLOCK]` |
| 2.3 | `mango.png` | `The mango character asleep on a sofa under a small blanket, phone still in her hand, untouched dinner on the table in the background, lonely apartment at night. [STYLE BLOCK]` |
| 3.1 | `mango.png` | `Morning light in the apartment. The mango character wakes on the sofa and checks her phone, realizing the durian character still has not come home. Her face shows fear and confusion. [STYLE BLOCK]` |
| 3.2 | `mango.png`, `mangosteen.jpg` | `The dark purple mangosteen character arriving at Mango's apartment and gently comforting the worried mango character, sitting beside her on the sofa, supportive friend energy, soft morning light. [STYLE BLOCK]` |
| 3.3 | `mangosteen.jpg` | `The mangosteen character alone in a quiet hallway outside the apartment, phone held to her ear, face calm and unreadable, secretly making a call. She says nothing visibly, a slow satisfied smile forming, deep shadows. [STYLE BLOCK]` |

Save outputs as:

```text
assets/scenes/ep1_shot1.png
assets/scenes/ep1_shot2.png
assets/scenes/ep1_shot3.png
assets/scenes/ep2_shot1.png
assets/scenes/ep2_shot2.png
assets/scenes/ep2_shot3.png
assets/scenes/ep3_shot1.png
assets/scenes/ep3_shot2.png
assets/scenes/ep3_shot3.png
```

## Step 2 - Image to Video on fal.ai

Use `Kling 2.6 Pro Image to Video`.

Settings:

```text
Duration: 10 seconds
Aspect: 9:16
Generate audio: off / false
Input: one scene image per shot
```

Motion prompts:

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

Save outputs as:

```text
assets/clips/ep1_shot1.mp4
assets/clips/ep1_shot2.mp4
assets/clips/ep1_shot3.mp4
assets/clips/ep2_shot1.mp4
assets/clips/ep2_shot2.mp4
assets/clips/ep2_shot3.mp4
assets/clips/ep3_shot1.mp4
assets/clips/ep3_shot2.mp4
assets/clips/ep3_shot3.mp4
```

## Step 3 - ElevenLabs Thai VO

Use Text to Speech.

Recommended settings:

```text
Model: eleven_multilingual_v2
Voice: female Thai/natural voice
Stability: 40
Similarity: 80
Style exaggeration: 0-25
Speaker boost: on
Speed: 0.95-1.0
```

Ep.1:

```text
มะม่วง: "ตื่นแล้วเหรอพี่ทุเรียน มากินข้าวเร็ว"
มะม่วง: "วันนี้ทำของโปรดพี่ด้วยนะ"
ทุเรียน: "ขอบคุณนะ มะม่วง"
มะม่วง: "ช่วงนี้พี่เหนื่อยไหม ดูไม่ค่อยได้นอนเลย"
ทุเรียน: "งานยุ่งนิดหน่อย ไม่มีอะไรหรอก"
มะม่วง: "งั้นตั้งใจทำงานนะ เดี๋ยวเย็นนี้มะม่วงรอ"
ทุเรียน: "อืม... แล้วเจอกัน"
```

Ep.2:

```text
มะม่วง: "พี่ทุเรียน... อยู่ไหนแล้วนะ"
มะม่วง: "โทรไปก็ไม่รับ ไลน์ไปก็ไม่อ่าน"
มะม่วง: "หรือว่างานยุ่งจริงๆ"
มะม่วง: "แต่ปกติพี่ไม่เคยหายไปแบบนี้นี่นา"
มะม่วง: "กลับมาเถอะนะ... มะม่วงเป็นห่วง"
มะม่วง: "ถ้าพี่เห็นข้อความนี้ โทรกลับหน่อยนะ"
```

Ep.3:

```text
มะม่วง: "มังคุด... พี่ทุเรียนยังไม่กลับมาเลย"
มะม่วง: "เมื่อคืนทั้งคืน เขาไม่รับสายเราเลย"
มังคุด: "ใจเย็นๆ นะมะม่วง เราอยู่นี่แล้ว"
มะม่วง: "เรากลัว... กลัวว่าเกิดอะไรขึ้นกับเขา"
มังคุด: "ไม่เป็นไรนะ เดี๋ยวเราช่วยสืบให้เอง"
มะม่วง: "ขอบคุณนะมังคุด เราไม่รู้จะโทรหาใครแล้ว"
มังคุด: "ไม่ต้องกลัวนะ... เชื่อเรา"
มังคุด: "เริ่มจัดการได้เลย"
```

Save as:

```text
assets/audio/ep1_th.mp3
assets/audio/ep2_th.mp3
assets/audio/ep3_th.mp3
```

## Step 4 - Edit and Export

In CapCut:

1. Import the 9 clips and 3 audio files.
2. For each episode, place its 3 clips in order.
3. Add Thai VO.
4. Add burned-in English subtitles from `README.md`.
5. Export each episode:

```text
Resolution: 720 x 1280
Codec: H.264
Target size: <= 4 MB per episode
```

Final files:

```text
public/videos/ep1.mp4
public/videos/ep2.mp4
public/videos/ep3.mp4
```
