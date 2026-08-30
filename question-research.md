# What the questions should be, and why

**Caveat first.** This was written without web access. Every citation below is from memory — the findings are ones I'm confident about, but author names, years, and exact claims need verifying before any of this goes in front of users or investors. Treat it as a map of where to look, not as sourced work.

---

## What the current design already gets right

**Body-first, label-last.** This is Gendlin's *Focusing* almost exactly — attend to the felt sense in the body, then find a word that fits it, then check the word back against the body. It's also the sequence supported by interoception research: bodily signals are the raw material of emotional experience, not a symptom of it.

**Naming as the mechanism.** Affect labeling — putting a feeling into words — measurably reduces amygdala response and self-reported distress (Lieberman and colleagues, around 2007; Torre & Lieberman have a review). This is the reason the product works at all, and it's worth knowing that the effect holds even when people don't believe it's helping.

**Granularity as the goal.** Emotion differentiation research (Barrett, Kashdan and others) finds that people who make finer distinctions between emotional states regulate them better, drink less, and are less reactive to rejection. "Cornered" beats "bad" for a reason that's been measured.

**Action tendencies as a route in.** Your second-question theory is Frijda's, and it's solid. He argued emotions *are* states of action readiness — anger is the readiness to remove an obstacle, fear the readiness to escape. Naming the impulse works because the impulse is closer to the emotion than the label is.

---

## Three gaps

### 1. Location alone doesn't discriminate — you were right

Nummenmaa's bodily-maps work (PNAS, around 2014) found consistent topography across cultures, but several emotions light up the same regions. Chest activation appears in anger, fear, anxiety, love, and grief. Location narrows the field; it doesn't pick the answer.

Your four contrasts are the fix, and each has independent support:

| Contrast | Why it discriminates |
|---|---|
| **Hot / cold** | "Anger is heat" is one of the most robust conceptual metaphors in the literature (Lakoff, Kövecses) and shows up across unrelated languages. Fear and dread go cold. This one contrast separates anger from fear inside the same chest location. |
| **Heavy / light** | Sadness and depression are described as heaviness near-universally; Nummenmaa's sadness maps show limb *deactivation*, which is what heaviness feels like from the inside. |
| **Tight / loose** | Constriction is the defining somatic marker of anxiety and panic — chest tightness and throat tightness are diagnostic criteria, not metaphors. |
| **Still / moving** | This is psychomotor agitation versus retardation, which is a real clinical axis and separates agitated distress from flattened distress. |

**Add all four.** They belong on one screen with intensity, as a set of sliders — this is the phenomenology of the feeling and it should be answered as one gesture.

### 2. There is no valence question, and that's the biggest hole

Valence — pleasant versus unpleasant — is the single most established dimension in affective science. Russell's circumplex puts everything on valence and arousal, and that model has survived forty years of attack. The current app has arousal (intensity) and no valence at all.

Worse, it silently assumes negative. Every option in the impulse list is aversive. Someone using this while feeling overwhelmed by love, or grateful, or homesick in a way they don't want to lose, has nowhere to go.

**Add it, and include "both at once."** Bittersweet, nostalgic, grieving-but-glad — mixed valence is real and it's exactly the kind of state people can't name. This is the same argument that got two answers per question in the first place.

### 3. There is no agency question, and it's the strongest single discriminator

Appraisal theory (Smith & Ellsworth, mid-1980s; Scherer's work) identifies a handful of dimensions that predict which emotion you get. The most powerful is **agency** — who caused this.

Same situation, same loss, same bodily feeling:

- Someone else caused it → **anger**
- I caused it → **guilt or shame**
- No one caused it, it just happened → **sadness or grief**

Nothing else in the app separates those three. "What's it attached to" asks about the *object*, not the *cause*, and they come apart constantly — you can be attached to a person you're angry at, ashamed in front of, or grieving.

**Add "whose is it?"** It's one tap and it does more discriminating work than any other question available.

---

## One thing missing at the end

Gendlin's Focusing has six steps, and the app currently implements four of them. The one it skips is **resonating**: after you find a word, you hold it against the body and check whether it lands. If it doesn't, you don't accept it — you go back.

Right now the app hands you a summary and stops. Adding "read that back — does it land?" with a route back to any question is both faithful to the method and the thing that makes it a self-understanding tool rather than a quiz that scores you.

---

## Revised question set

1. **Where is it?** — body location, plus "anywhere else?"
2. **What's it like in there?** — five sliders: strength, heavy↔light, hot↔cold, tight↔loose, still↔moving
3. **Is it a bad feeling?** — valence, including "both at once"
4. **What would it make you do?** — action readiness, plus "anything else?"
5. **Whose is it?** — agency
6. **How has it moved?** — temporal shape, plus "and then?"
7. **What's it attached to?** — object, plus own words
8. **Does that land?** — resonance check

The impulse list should be rebuilt on Frijda's modes rather than my original six, which were assembled by intuition and missed three real categories: **being-with** (wanting to be near someone), **rejecting** (get it away from me — the disgust family), and **helplessness** (no action is available, which is distinct from choosing stillness).

---

## Sound mapping

Some of these are grounded in crossmodal correspondence research — Spence has a tutorial review, around 2011 — which documents reliable pairings between sound and other senses. Others are my design choices. I've marked which is which, because it matters for whether they'll survive testing.

| Answer | Sound | Basis |
|---|---|---|
| Heavy ↔ light | Pitch drops or rises up to half an octave, sub-bass level follows | **Established.** Low pitch ↔ heavy/large is one of the most reliable crossmodal correspondences known. |
| Hot ↔ cold | Harmonic saturation and brightness increase; vibrato speeds up | **Established.** Timbral brightness maps to visual and thermal brightness; distortion adds odd harmonics, which read as heat. |
| Tight ↔ loose | Filter resonance narrows, chord voicing compresses, reverb dries up | **Partly.** Resonance-as-constriction is intuitive and acoustically literal — a high-Q filter is physically a narrower passage. Untested. |
| Still ↔ moving | Tremolo and vibrato depth and rate | **Established.** Amplitude modulation reads as motion directly. |
| Strength | Gain, filter openness, how hard instruments are struck | **Established.** Loudness ↔ magnitude. |
| Valence | Chord mode — minor, major, or major with an added flat sixth for mixed | **Culturally specific.** Major/minor affect associations are strong in Western listeners and much weaker cross-culturally. Flag for any non-Western rollout. |
| Agency | Stereo position of the rhythm — other-caused comes from outside the field, self-caused from the centre, uncaused has no agent at all | **My invention.** Defensible as a metaphor, no evidence behind it. First thing to test. |
| Body location | Instrument choice — cello, reed, double bass, glass, brushes, harmonium | **My invention.** Relatable, not researched. |
| Impulse | Percussion and plucked instruments per action mode | **My invention.** |

---

## If it's too long

Eight stages plus follow-ups is roughly twelve screens. If testing says that drags, cut in this order:

1. The second body location follow-up — least discriminating.
2. "And then?" on temporal shape — nice, not load-bearing.
3. Merge valence into the quality sliders as a sixth slider.

Do **not** cut agency. It does more work per tap than anything else in the set.

---

## What real research should answer

- Do the five quality sliders actually discriminate between emotional states, or do people just centre all of them? Run it with a validated emotion measure alongside and check.
- Does the sound help, or is it decoration? The honest test is a version with the audio removed. If completion and self-reported clarity don't drop, the sound is a beautiful garnish rather than the mechanism.
- Is agency-as-panning legible to anyone who isn't told what it means?
- Does the resonance check change anything, or do people just click "yes"?
