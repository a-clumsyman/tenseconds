import React, { useState, useRef, useEffect, useCallback } from "react";
import * as Tone from "tone";

/* ================================================================== */
const INK = "#101419", PANEL = "#161B22", LINE = "#242A33";
const BONE = "#E9E4DA", ASH = "#79828E", NEUTRAL = "#8A94A0", RED = "#C56472";
const SERIF = "Georgia, 'Iowan Old Style', 'Times New Roman', serif";
const SANS = "-apple-system, BlinkMacSystemFont, 'Segoe UI', Inter, Helvetica, sans-serif";
const MONO = "ui-monospace, 'SF Mono', Menlo, Consolas, monospace";
const BPM = 96, LOOP = 10;
const T = () => (Tone.getTransport ? Tone.getTransport() : Tone.Transport);
const DEST = () => (Tone.getDestination ? Tone.getDestination() : Tone.Destination);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const join = (a) => (a.length < 2 ? a[0] || "" : `${a[0]} and ${a[1]}`);

/* ================================================================== */
/*  Glyphs — each one depicts what the answer does to the sound        */
/* ================================================================== */
const G = (d, extra) => ({ d, extra });
const GLYPH = {
  fall: G("M4 8 L44 26"), rise: G("M4 26 L44 8"),
  cross: G("M4 8 L44 26 M4 26 L44 8"), flat: G("M4 17 L44 17"),
  dotRight: G("M4 17 L30 17", "circle:40,17,4"),
  dotMid: G("M8 17 L18 17 M30 17 L40 17", "circle:24,17,4"),
  dotNone: G("M4 17 L44 17", "dash"),
  dotTwo: G("", "circle:14,17,3.5;circle:34,17,3.5"),
  arrowL: G("M44 17 L6 17 M14 10 L6 17 L14 24"),
  arrowR: G("M4 17 L42 17 M34 10 L42 17 L34 24"),
  here: G("M4 17 L16 17 M32 17 L44 17", "circle:24,17,5"),
  land: G("M4 8 C18 8 22 26 40 26", "circle:42,26,3"),
  trail: G("M4 12 C18 12 26 22 44 21", "dash"),
  wobble: G("M4 17 C12 8 20 26 28 14 C34 8 40 22 44 17"),
  spike: G("M4 26 L14 6 L18 26 L44 25"),
  ramp: G("M4 26 L44 7"),
  waves: G("M4 17 C10 4 18 30 24 17 C30 4 38 30 44 17"),
  hum: G("M4 17 L44 17", "thick"),
};

function Glyph({ name, color }) {
  const g = GLYPH[name];
  if (!g) return null;
  const circles = [];
  let dashed = false, thick = false;
  (g.extra || "").split(";").forEach((e) => {
    if (e.startsWith("circle:")) { const [x, y, r] = e.slice(7).split(",").map(Number); circles.push({ x, y, r }); }
    if (e === "dash") dashed = true;
    if (e === "thick") thick = true;
  });
  return (
    <svg viewBox="0 0 48 34" width="48" height="34" aria-hidden="true" style={{ display: "block", flexShrink: 0 }}>
      {g.d && <path d={g.d} fill="none" stroke={color} strokeWidth={thick ? 3 : 1.6}
        strokeLinecap="round" strokeLinejoin="round" strokeDasharray={dashed ? "3 4" : undefined} />}
      {circles.map((c, k) => <circle key={k} cx={c.x} cy={c.y} r={c.r} fill={color} />)}
    </svg>
  );
}

/* ================================================================== */
/*  1. WHERE                                                           */
/* ================================================================== */
const PLACE = {
  head: { label: "Behind my eyes", instrument: "glass harmonica", short: "behind your eyes", phrase: "behind your eyes", root: "A4", accent: "#8FB6D6", cutoff: 4200, wet: 0.55 },
  throat: { label: "My throat, or my jaw", instrument: "a reed", short: "your throat", phrase: "in your throat", root: "E3", accent: "#B49BD4", cutoff: 1500, wet: 0.3 },
  chest: { label: "My chest", instrument: "a cello", short: "your chest", phrase: "in your chest", root: "C3", accent: "#C56472", cutoff: 1500, wet: 0.42 },
  stomach: { label: "My stomach", instrument: "a bowed double bass", short: "your stomach", phrase: "in your stomach", root: "F2", accent: "#9C8A4E", cutoff: 700, wet: 0.35 },
  skin: { label: "My hands, my skin", instrument: "brushes and air", short: "your hands", phrase: "across your skin", root: "D4", accent: "#6FC0B6", cutoff: 5200, wet: 0.6 },
  everywhere: { label: "Everywhere. All of me.", instrument: "a harmonium", short: "everywhere", phrase: "everywhere at once", root: "C3", accent: "#A6ADB8", cutoff: 1800, wet: 0.62 },
};

/* ================================================================== */
/*  2. QUALITY                                                         */
/* ================================================================== */
const SLIDERS = [
  { key: "intensity", left: "BARELY", right: "ALL OF IT", q: "How strong is it?",
    words: [[0.2, "Barely there. But there."], [0.4, "Quiet. You'd have to look."], [0.6, "Present. Hard to ignore."], [0.8, "Strong. Taking up room."], [1.01, "Loud. Most of what's happening."]] },
  { key: "weight", left: "LIGHT", right: "HEAVY", q: "Heavy or light?",
    words: [[0.2, "Light. Almost floating."], [0.4, "Fairly light."], [0.6, "Neither, really."], [0.8, "Heavy."], [1.01, "Heavy. Like weight on you."]] },
  { key: "temp", left: "COLD", right: "HOT", q: "Hot or cold?",
    words: [[0.2, "Cold."], [0.4, "Cool."], [0.6, "Neither."], [0.8, "Warm. Rising."], [1.01, "Hot."]] },
  { key: "tension", left: "LOOSE", right: "TIGHT", q: "Tight or loose?",
    words: [[0.2, "Loose. Open."], [0.4, "Slack."], [0.6, "Neither."], [0.8, "Tight."], [1.01, "Clenched."]] },
  { key: "motion", left: "STILL", right: "MOVING", q: "Still or moving?",
    words: [[0.2, "Completely still."], [0.4, "Mostly still."], [0.6, "Shifting slightly."], [0.8, "Moving."], [1.01, "Churning."]] },
];
const sWord = (k, v) => SLIDERS.find((s) => s.key === k).words.find(([t]) => v < t)[1];

/* ================================================================== */
/*  3. VALENCE   4. AGENCY  — together these pick the impulse set     */
/* ================================================================== */
const VALENCE = {
  bad: { label: "Bad. I don't want it.", phrase: "It isn't a good feeling", chord: [0, 3, 7], sound: "minor", glyph: "fall" },
  good: { label: "Good, actually.", phrase: "It's a good feeling", chord: [0, 4, 7], sound: "major", glyph: "rise" },
  both: { label: "Both at the same time.", phrase: "It's good and bad at once", chord: [0, 4, 7, 8], sound: "major with a flat sixth", glyph: "cross" },
  neither: { label: "Neither. It's just loud.", phrase: "It's neither good nor bad, just loud", chord: [0, 5, 7], sound: "suspended, no mode", glyph: "flat" },
};

const AGENCY = {
  other: { label: "Someone else did this.", phrase: "Someone else caused it", pan: 0.6, sound: "rhythm from outside you", glyph: "dotRight" },
  self: { label: "I did this.", phrase: "You caused it", pan: 0, sound: "rhythm inside your own voice", glyph: "dotMid" },
  none: { label: "No one. It just happened.", phrase: "No one caused it", pan: 0, duck: 0.32, sound: "almost no rhythm — no one to answer", glyph: "dotNone" },
  unsure: { label: "I can't tell.", phrase: "You can't tell who caused it", pan: 0, drift: true, sound: "rhythm won't settle on a side", glyph: "dotTwo" },
};

/* ================================================================== */
/*  5. IMPULSE — a pool, selected by family                            */
/* ================================================================== */
const P = (label, phrase, instrument, kit, sub, subAlt, steps, vel, pitched) =>
  ({ label, phrase, instrument, kit, sub, subAlt, steps, vel, pitched });

const IMPULSE = {
  confront: P("Say it to their face.", "say it to their face", "a hand drum", "drum", "8n", "8t", [1, null, 0.55, null, 0.9, null, null, 0.6], 0.62),
  retaliate: P("Make them feel it too.", "make them feel it too", "a hard woodblock", "block", "8n", "8t", [1, null, null, 0.9, null, 1, null, null], 0.6),
  cutoff: P("Never speak to them again.", "cut them off entirely", "one damped string", "muted", "1m", "2n.", [12, null], 0.5, true),
  freeze: P("Freeze. Don't move.", "freeze", "no rhythm at all", null, null, null, null, 0),
  fix: P("Undo it. Make it right.", "undo it", "a busy marimba", "marimba", "8n", "8t", [0, 3, null, 7, 3, null, 0, null], 0.44, true),
  confess: P("Tell someone what I did.", "tell someone what you did", "a soft hand drum", "drum", "4n", "4t", [0.7, null, 0.5, null], 0.42),
  hide: P("Disappear. Be smaller.", "disappear", "a muted string", "muted", "2n", "2t", [null, 12, null, null, null, null, 15, null], 0.4, true),
  punish: P("Sit in it. Deserve it.", "sit in it", "a low drum", "lowdrum", "2n", "2n.", [0.85, null, 0.6, null], 0.5),
  reachback: P("Go back to before.", "go back to before", "a harp", "harp", "4n", "4t", [19, null, 15, null, 12, null, 7, null, 0, null, null, null, null, null, null, null], 0.6, true),
  hold: P("Curl up and hold on.", "curl up and hold on", "one low drum a pass", "lowdrum", "1m", "2n.", [0.9, null, null, null], 0.5),
  beheld: P("Have someone hold me.", "be held", "a celesta", "bells", "2n", "2t", [7, null, 12, null, 16, null, null, null], 0.5, true),
  keepgoing: P("Keep going anyway.", "keep going anyway", "a steady drum", "drum", "4n", "4t", [0.6, 0.4, 0.6, 0.4], 0.4),
  escape: P("Get out. Now.", "get out", "a shaker", "shaker", "16n", "8t", [1, 0.35, 0.6, 0.35, 0.9, 0.35, 0.6, 0.45, 1, 0.35, 0.6, 0.35, 0.9, 0.4, 0.7, 0.55], 0.5),
  scan: P("Check. Then check again.", "keep checking", "quick ticks", "ticks", "16n", "8t", [1, null, 0.5, null, null, 0.7, null, 0.4, 1, null, null, 0.6, null, 0.4, null, null], 0.42),
  brace: P("Get ready for it.", "brace for it", "sparse hard hits", "block", "2n", "2t", [0.8, null, null, 1], 0.55),
  tell: P("Tell them what they mean to me.", "tell them what they mean to you", "a celesta", "bells", "4n", "4t", [0, null, 7, null, 12, null, null, null], 0.5, true),
  savour: P("Stay in it. Don't move.", "stay in it", "slow bells", "bells", "1m", "2n.", [12, null, null, null], 0.45, true),
  share: P("Show someone.", "show someone", "a bright marimba", "marimba", "8n", "8t", [12, null, 16, null, 19, null, 16, null], 0.48, true),
  doubt: P("Wait for it to be taken away.", "wait for it to be taken away", "off-kilter ticks", "ticks", "4n", "4t", [0.7, null, null, 0.5, null, 0.6, null, null, null, 0.4, null, null], 0.4),
  letgo: P("Let it go.", "let it go", "a rising harp", "harp", "2n", "2t", [0, null, 7, null, 12, null, 19, null], 0.5, true),
  nothing: P("Nothing. There's nothing to do.", "do nothing, because there's nothing to do", "one low drum a pass", "lowdrum", "1m", "2n.", [0.9, null, null, null], 0.5),
};

const FAMILY = {
  wronged: { name: "wronged", set: ["confront", "retaliate", "cutoff", "freeze"] },
  atfault: { name: "at fault", set: ["fix", "confess", "hide", "punish"] },
  loss: { name: "loss", set: ["reachback", "hold", "beheld", "keepgoing"] },
  threat: { name: "under threat", set: ["escape", "freeze", "scan", "brace"] },
  given: { name: "given something", set: ["tell", "beheld", "savour", "keepgoing"] },
  earned: { name: "having earned it", set: ["share", "savour", "keepgoing", "doubt"] },
  lucky: { name: "lucky", set: ["savour", "share", "hold", "nothing"] },
  mixed: { name: "mixed", set: ["hold", "letgo", "reachback", "savour"] },
  flooded: { name: "flooded", set: ["escape", "freeze", "nothing", "scan"] },
};

function familyOf(ans) {
  const v = ans.valence, a = ans.agency;
  if (v === "both") return "mixed";
  if (v === "neither") return "flooded";
  if (v === "good") return a === "other" ? "given" : a === "self" ? "earned" : "lucky";
  return a === "other" ? "wronged" : a === "self" ? "atfault" : a === "none" ? "loss" : "threat";
}
const impulseSet = (ans) => {
  const set = {};
  FAMILY[familyOf(ans)].set.forEach((k) => { set[k] = IMPULSE[k]; });
  return set;
};

/* ================================================================== */
/*  6. TIME   7. CONTROL — replacing the vague "attached to"          */
/* ================================================================== */
const TIME = {
  past: { label: "Something that already happened.", phrase: "It's about something already over", sound: "the rhythm trails behind itself", glyph: "arrowL" },
  now: { label: "Something happening right now.", phrase: "It's about right now", sound: "dry and present, no echo", glyph: "here" },
  coming: { label: "Something that hasn't happened yet.", phrase: "It's about something still coming", sound: "a rising sweep each pass", glyph: "arrowR" },
};

const CONTROL = {
  act: { label: "Yes. There's something I could do.", phrase: "There is something you could do about it", sound: "the loop resolves at the end of each pass", glyph: "land" },
  cant: { label: "No. It's out of my hands.", phrase: "There's nothing you can do about it", sound: "the loop never lands", glyph: "trail" },
  unsure: { label: "I don't know yet.", phrase: "You don't know yet whether you can do anything", sound: "it lands every other pass", glyph: "wobble" },
};

const SHAPE = {
  spike: { label: "It hit all at once.", first: "It arrived all at once", sound: "one sharp swell a pass", glyph: "spike" },
  build: { label: "It built up slowly.", first: "It built up slowly", sound: "rises across each pass", glyph: "ramp" },
  waves: { label: "It keeps coming in waves.", first: "It comes in waves", sound: "two swells a pass", glyph: "waves" },
  hum: { label: "It's been the same throughout.", first: "It has stayed the same throughout", sound: "even, unbroken", glyph: "hum" },
};

/* ================================================================== */
const FLOW = [
  { id: "place1", kind: "list", key: "place", slot: 0, opts: () => PLACE,
    q: () => "Where do you feel it in your body?",
    calm: "Close your eyes if you can, and scan down slowly from your head. Don't try to name the feeling yet — just find where it lives. The place you point to picks the first instrument." },
  { id: "place2", kind: "list", key: "place", slot: 1, opts: () => PLACE, gentle: true, none: "No, just there",
    q: (a) => `${cap(PLACE[a.place[0]].short)}. Anywhere else?`,
    calm: "Sometimes it lives in two places at once. If it's only the one, that's just as true — carry on." },
  { id: "quality", kind: "sliders", q: () => "What is it like in there?",
    calm: "Move each slider until the sound matches what's in your body — you'll hear it change as you go. No right answers, and no hurry. The loop will wait." },
  { id: "valence", kind: "cards", key: "valence", single: true, opts: () => VALENCE,
    q: () => "Is it a feeling you want, or one you don't?",
    calm: "Not everything that hurts is unwanted, and not everything pleasant is welcome. Whatever you choose sets the key the loop plays in." },
  { id: "agency", kind: "cards", key: "agency", single: true, opts: () => AGENCY,
    q: () => "Who put it there?",
    calm: "The same feeling means something different depending on who caused it. Your answer decides where the rhythm stands — beside you, inside you, or nowhere at all." },
  { id: "pull1", kind: "cards", key: "pull", slot: 0, opts: impulseSet,
    q: () => "If you let it move you, what would it make you do?",
    calm: "Even if you'd never actually do it. Especially then. This is the instrument that gets struck, not held." },
  { id: "pull2", kind: "cards", key: "pull", slot: 1, opts: impulseSet, gentle: true, none: "No, just that",
    q: (a) => (a.pull[0] ? `It wants you to ${IMPULSE[a.pull[0]].phrase}. Anything else, at the same time?` : "Anything else, at the same time?"),
    calm: "Feelings often want two things at once. A second pull plays in triplets, leaning against the first. If there's just the one, carry on." },
  { id: "time", kind: "cards", key: "time", single: true, opts: () => TIME,
    q: () => "Is it about something behind you, or ahead?",
    calm: "Your answer decides whether the loop trails an echo, climbs toward something, or stays right here in the room." },
  { id: "control", kind: "cards", key: "control", single: true, opts: () => CONTROL,
    q: () => "Is there anything you could do about it?",
    calm: "Answer honestly, not bravely. This is the one that decides whether the loop ever gets to land." },
  { id: "shape", kind: "cards", key: "shape", single: true, opts: () => SHAPE,
    q: () => "And over time — how has it been moving?",
    calm: "Think back over however long it's been with you, a day or a year. This shapes how each pass of the loop swells and falls." },
];

const STAGE = { place1: "where it is", place2: "where else", quality: "what it's like", valence: "want it or not", agency: "who caused it", pull1: "what it wants", pull2: "what else it wants", time: "behind or ahead", control: "whether you can act", shape: "how it moved" };

/* ================================================================== */
function summary(ans) {
  if (!ans.place.length) return "";
  const q = ans.quality, o = [];
  o.push(`It's ${join(ans.place.map((k) => PLACE[k].phrase))}.`);
  const f = [];
  if (q.weight > 0.62) f.push("heavy"); else if (q.weight < 0.38) f.push("light");
  if (q.temp > 0.62) f.push("hot"); else if (q.temp < 0.38) f.push("cold");
  if (q.tension > 0.62) f.push("tight"); else if (q.tension < 0.38) f.push("loose");
  if (q.motion > 0.62) f.push("moving"); else if (q.motion < 0.38) f.push("still");
  if (f.length) o.push(`${cap(f.slice(0, 2).join(" and "))}${f.length > 2 ? `, and ${f.slice(2).join(" and ")}` : ""}.`);
  o.push(sWord("intensity", q.intensity));
  if (ans.valence) o.push(`${VALENCE[ans.valence].phrase}.`);
  if (ans.agency) o.push(`${AGENCY[ans.agency].phrase}.`);
  if (ans.pull.length)
    o.push(ans.pull.length === 2
      ? `It wants you to ${IMPULSE[ans.pull[0]].phrase} and ${IMPULSE[ans.pull[1]].phrase} at the same time.`
      : `It wants you to ${IMPULSE[ans.pull[0]].phrase}.`);
  if (ans.time) o.push(`${TIME[ans.time].phrase}.`);
  if (ans.control) o.push(`${CONTROL[ans.control].phrase}.`);
  if (ans.shape) o.push(`${SHAPE[ans.shape].first}.`);
  return o.join(" ");
}

/* ------------------------------------------------------------------ */
/*  Tensions: contradictions already present in what they answered.     */
/*  Nothing is interpreted or added — their own words, put side by      */
/*  side, because the gap between two answers is usually the thing.     */
/* ------------------------------------------------------------------ */
const ACTS = ["confront", "retaliate", "fix", "confess", "share", "tell", "escape", "scan", "brace", "keepgoing"];
const STAYS = ["hide", "freeze", "punish", "hold", "nothing", "savour", "doubt", "cutoff"];
const ph = (k) => (IMPULSE[k] ? IMPULSE[k].phrase : "");

const RULES = [
  { when: (a) => a.pull.length === 2 && a.pull.some((k) => ACTS.includes(k)) && a.pull.some((k) => STAYS.includes(k)),
    say: (a) => `It wants you to ${ph(a.pull[0])}. It also wants you to ${ph(a.pull[1])}.` },
  { when: (a) => a.control === "cant" && ACTS.includes(a.pull[0]),
    say: (a) => `It's pushing you to ${ph(a.pull[0])}. You also said there's nothing you can do.` },
  { when: (a) => a.agency === "other" && a.pull.some((k) => ["hide", "punish"].includes(k)),
    say: (a) => `Someone else caused it. You're the one who wants to ${ph(a.pull.find((k) => ["hide", "punish"].includes(k)))}.` },
  { when: (a) => a.agency === "none" && a.pull.some((k) => ["punish", "confess", "fix"].includes(k)),
    say: (a) => `No one caused it. It still wants you to ${ph(a.pull.find((k) => ["punish", "confess", "fix"].includes(k)))}.` },
  { when: (a) => a.agency === "self" && a.valence === "good" && a.pull.includes("doubt"),
    say: () => "You made something good happen. You're waiting for it to be taken away." },
  { when: (a) => a.time === "past" && a.control === "act",
    say: () => "It's about something already over. You still think there's something you could do." },
  { when: (a) => a.time === "coming" && a.pull.includes("reachback"),
    say: () => "It's about something ahead of you. It's pulling you backwards." },
  { when: (a) => a.valence === "bad" && a.pull.some((k) => ["savour", "hold"].includes(k)),
    say: () => "You don't want the feeling. Something in you wants to stay in it." },
  { when: (a) => a.time === "past" && a.quality.temp > 0.66,
    say: () => "It's already finished. It's still hot." },
  { when: (a) => a.quality.tension > 0.66 && a.quality.motion < 0.34,
    say: () => "Clenched, and completely still." },
  { when: (a) => a.quality.intensity < 0.35 && a.quality.weight > 0.66,
    say: () => "Quiet, and heavy." },
  { when: (a) => a.valence === "both",
    say: () => "Good and bad at the same time." },
];


function tensions(ans) {
  if (!ans.place.length || !ans.pull.length) return [];
  const out = [];
  for (const r of RULES) {
    try { if (r.when(ans)) out.push(r.say(ans)); } catch (e) {}
    if (out.length === 2) break;
  }
  return out;
}

/* ================================================================== */
/*  Audio                                                              */
/* ================================================================== */
function chordFor(root, ans) {
  const base = (ans.valence ? VALENCE[ans.valence].chord : [0, 3, 7]).slice();
  if (ans.control === "cant") base.push(17);
  else if (ans.control === "unsure") base.push(14);
  let set = [...new Set(base)].sort((a, b) => a - b);
  const t = ans.quality.tension;
  if (t > 0.66) set = [...new Set(set.map((n) => n % 12))].sort((a, b) => a - b);
  else if (t < 0.34) set = set.map((n, i) => (i % 2 ? n + 12 : n));
  return set.slice(0, 5).map((n) => Tone.Frequency(root).transpose(n).toNote());
}

function makeBody(key, notes, dest, level, t0) {
  const p = PLACE[key], nodes = [], synths = [];
  const gain = new Tone.Gain(level).connect(dest);
  const meter = new Tone.Meter({ normalRange: true, smoothing: 0.82 });
  gain.connect(meter);
  const filter = new Tone.Filter({ frequency: p.cutoff, type: "lowpass", Q: 1 }).connect(gain);
  nodes.push(gain, meter, filter);
  const add = (s) => { synths.push(s); nodes.push(s); return s; };

  if (key === "chest" || key === "stomach") {
    add(new Tone.PolySynth(Tone.Synth, { volume: key === "stomach" ? -14 : -15, oscillator: { type: "sawtooth" }, detune: 5, envelope: { attack: 1.4, decay: 1.5, sustain: 0.9, release: 6 } }).connect(filter)).triggerAttack(notes, t0);
    add(new Tone.PolySynth(Tone.Synth, { volume: -22, oscillator: { type: "triangle" }, detune: -6, envelope: { attack: 2.2, decay: 1, sustain: 0.9, release: 6 } }).connect(filter)).triggerAttack(notes, t0);
  } else if (key === "throat") {
    add(new Tone.PolySynth(Tone.Synth, { volume: -18, oscillator: { type: "square" }, detune: 3, envelope: { attack: 0.5, decay: 1, sustain: 0.85, release: 4 } }).connect(filter)).triggerAttack(notes, t0);
    const bg = new Tone.Gain(0.022).connect(filter);
    const bf = new Tone.Filter({ frequency: 1100, type: "bandpass", Q: 2 }).connect(bg);
    const breath = new Tone.Noise("white").connect(bf); breath.start(t0);
    nodes.push(bg, bf, breath);
  } else if (key === "head") {
    add(new Tone.PolySynth(Tone.Synth, { volume: -19, oscillator: { type: "sine" }, detune: 4, envelope: { attack: 2.4, decay: 1, sustain: 0.9, release: 6 } }).connect(filter)).triggerAttack(notes, t0);
  } else if (key === "skin") {
    const ng = new Tone.Gain(0.12).connect(filter);
    const nf = new Tone.Filter({ frequency: 3800, type: "bandpass", Q: 1.2 }).connect(ng);
    const sweep = new Tone.LFO({ frequency: 0.09, min: 2200, max: 6200 }).start(); sweep.connect(nf.frequency);
    const noise = new Tone.Noise("pink").connect(nf); noise.start(t0);
    nodes.push(ng, nf, sweep, noise);
    add(new Tone.PolySynth(Tone.Synth, { volume: -26, oscillator: { type: "triangle" }, detune: 12, envelope: { attack: 3, decay: 1, sustain: 0.8, release: 6 } }).connect(filter)).triggerAttack(notes, t0);
  } else {
    add(new Tone.PolySynth(Tone.Synth, { volume: -18, oscillator: { type: "triangle" }, envelope: { attack: 1.2, decay: 1, sustain: 0.92, release: 5 } }).connect(filter)).triggerAttack(notes, t0);
    add(new Tone.PolySynth(Tone.Synth, { volume: -23, oscillator: { type: "sawtooth" }, detune: 9, envelope: { attack: 1.6, decay: 1, sustain: 0.9, release: 5 } }).connect(filter)).triggerAttack(notes, t0);
  }
  return { nodes, filter, meter, gain, synths, baseCutoff: p.cutoff, baseLevel: level };
}

function makeRhythm(key, root, dest, second, velRef) {
  const u = IMPULSE[key];
  const sub = second ? u.subAlt : u.sub;
  if (!u.kit || !sub) return null;
  const nodes = [];
  const base = second ? 0.6 : 1;
  const gain = new Tone.Gain(base).connect(dest);
  const meter = new Tone.Meter({ normalRange: true, smoothing: 0.7 });
  gain.connect(meter);
  nodes.push(gain, meter);
  let voice, fire;

  if (u.kit === "drum") {
    voice = new Tone.MembraneSynth({ volume: -6, pitchDecay: 0.035, octaves: 4, envelope: { attack: 0.001, decay: 0.34, sustain: 0 } }).connect(gain);
    fire = (t, s) => voice.triggerAttackRelease(second ? "A1" : "F1", "8n", t, Math.min(1, u.vel * s * velRef()));
  } else if (u.kit === "lowdrum") {
    voice = new Tone.MembraneSynth({ volume: -3, pitchDecay: 0.12, octaves: 6, envelope: { attack: 0.001, decay: 1.4, sustain: 0 } }).connect(gain);
    fire = (t, s) => voice.triggerAttackRelease("C1", "2n", t, Math.min(1, u.vel * s * velRef()));
  } else if (u.kit === "shaker" || u.kit === "ticks") {
    const hp = new Tone.Filter({ frequency: u.kit === "ticks" ? 9000 : 6500, type: "highpass" }).connect(gain);
    voice = new Tone.NoiseSynth({ volume: u.kit === "ticks" ? -14 : -10, noise: { type: "white" }, envelope: { attack: 0.001, decay: u.kit === "ticks" ? 0.022 : 0.05, sustain: 0 } }).connect(hp);
    nodes.push(hp);
    fire = (t, s) => voice.triggerAttackRelease("32n", t, Math.min(1, u.vel * s * velRef()));
  } else if (u.kit === "block") {
    voice = new Tone.MetalSynth({ volume: -26, frequency: 780, harmonicity: 8, modulationIndex: 22, resonance: 3200, octaves: 1, envelope: { attack: 0.001, decay: 0.09, release: 0.02 } }).connect(gain);
    fire = (t, s) => voice.triggerAttackRelease("32n", t, Math.min(1, u.vel * s * velRef()));
  } else if (u.kit === "muted") {
    voice = new Tone.PluckSynth({ volume: -6, attackNoise: 0.5, dampening: 1200, resonance: 0.7 }).connect(gain);
    fire = (t, s, n) => voice.triggerAttack(n, t, Math.min(1, u.vel * s * velRef()));
  } else if (u.kit === "harp") {
    voice = new Tone.PluckSynth({ volume: -3, attackNoise: 0.9, dampening: 4000, resonance: 0.96 }).connect(gain);
    fire = (t, s, n) => voice.triggerAttack(n, t, Math.min(1, u.vel * s * velRef()));
  } else if (u.kit === "marimba") {
    voice = new Tone.FMSynth({ volume: -10, harmonicity: 4, modulationIndex: 2.4, envelope: { attack: 0.002, decay: 0.5, sustain: 0, release: 0.4 }, modulationEnvelope: { attack: 0.002, decay: 0.22, sustain: 0 } }).connect(gain);
    fire = (t, s, n) => voice.triggerAttackRelease(n, "8n", t, Math.min(1, u.vel * s * velRef()));
  } else {
    voice = new Tone.FMSynth({ volume: -10, harmonicity: 3.01, modulationIndex: 6, envelope: { attack: 0.002, decay: 1.6, sustain: 0, release: 1.4 }, modulationEnvelope: { attack: 0.002, decay: 0.3, sustain: 0 } }).connect(gain);
    fire = (t, s, n) => voice.triggerAttackRelease(n, "2n", t, Math.min(1, u.vel * s * velRef()));
  }
  nodes.push(voice);

  const seq = new Tone.Sequence((time, v) => {
    if (v === null || v === undefined) return;
    /* played by a hand, not a grid: a few ms early or late, never twice the same weight */
    const when = time + (Math.random() - 0.5) * 0.012;
    const str = (u.pitched ? 1 : v) * (1 + (Math.random() - 0.5) * 0.16);
    const note = u.pitched ? Tone.Frequency(root).transpose(v + 12 + (second ? 7 : 0)).toNote() : null;
    fire(when, str, note);
  }, u.steps, sub);
  seq.loop = true; seq.start(0);
  nodes.push(seq);
  return { nodes, meter, gain, baseLevel: base };
}

function buildPatch({ dest, ans, t0, velRef }) {
  const nodes = [], meters = {}, gains = {}, filters = [];
  const count = ans.place.length + ans.pull.filter((k) => IMPULSE[k].kit).length;
  const headroom = count >= 4 ? 0.8 : count === 3 ? 0.9 : 1;

  const shapeGain = new Tone.Gain(0.7 * headroom).connect(dest);
  const sweep = new Tone.Filter({ frequency: 18000, type: "lowpass", Q: 1.2 }).connect(shapeGain);
  const tremolo = new Tone.Tremolo({ frequency: 1.5, depth: 0 }).connect(sweep).start();
  const distortion = new Tone.Distortion({ distortion: 0.4, wet: 0 }).connect(tremolo);
  const eq = new Tone.EQ3({ low: 0, mid: 0, high: 0 }).connect(distortion);
  const vibrato = new Tone.Vibrato({ frequency: 5, depth: 0 }).connect(eq);
  const voiceBus = new Tone.Gain(1).connect(vibrato);
  const subGain = new Tone.Gain(0).connect(eq);
  const shimmer = new Tone.Gain(0).connect(eq);

  const panner = new Tone.Panner(0).connect(tremolo);
  const echo = new Tone.FeedbackDelay({ delayTime: "8n.", feedback: 0.34, wet: 0 }).connect(panner);
  const rhythmGain = new Tone.Gain(1).connect(echo);
  nodes.push(shapeGain, sweep, tremolo, distortion, eq, vibrato, voiceBus, subGain, shimmer, panner, echo, rhythmGain);

  const crowded = ans.place.length === 2 && ans.pull.length === 2;
  ans.place.forEach((k, i) => {
    const b = makeBody(k, chordFor(PLACE[k].root, ans), voiceBus, i === 0 ? 1 : crowded ? 0.45 : 0.62, t0);
    nodes.push(...b.nodes); filters.push({ f: b.filter, base: b.baseCutoff });
    meters[`place:${k}`] = b.meter; gains[`place:${k}`] = { g: b.gain, base: b.baseLevel };
  });

  const root = PLACE[ans.place[0]].root;
  const subNote = Tone.Frequency(root).transpose(-12).toNote();
  const fifthNote = Tone.Frequency(root).transpose(-17).toNote();
  const sub = new Tone.Synth({ volume: -8, oscillator: { type: "sine" }, envelope: { attack: 3, decay: 1, sustain: 1, release: 8 } }).connect(subGain);
  sub.triggerAttack(subNote, t0);
  const shine = new Tone.PolySynth(Tone.Synth, { volume: -20, oscillator: { type: "sine" }, detune: 8, envelope: { attack: 3.5, decay: 1, sustain: 0.9, release: 7 } }).connect(shimmer);
  shine.triggerAttack(chordFor(root, ans).map((n) => Tone.Frequency(n).transpose(12).toNote()), t0);
  nodes.push(sub, shine);

  ans.pull.forEach((k, i) => {
    const r = makeRhythm(k, root, rhythmGain, i === 1, velRef);
    if (r) { nodes.push(...r.nodes); meters[`pull:${k}`] = r.meter; gains[`pull:${k}`] = { g: r.gain, base: r.baseLevel }; }
  });

  if (ans.agency === "unsure") {
    const drift = new Tone.LFO({ frequency: 0.08, min: -0.75, max: 0.75 }).start();
    drift.connect(panner.pan); nodes.push(drift);
  } else if (ans.agency) panner.pan.value = AGENCY[ans.agency].pan;
  if (ans.agency === "none") rhythmGain.gain.value = AGENCY.none.duck;
  if (ans.time === "past") echo.wet.value = 0.38;

  return { nodes, meters, gains, filters, shapeGain, sweep, voiceBus, rhythmGain,
    tremolo, distortion, eq, vibrato, subGain, shimmer, sub, subNote, fifthNote };
}

function applyShape(param, shape, t, dur) {
  if (shape === "spike") {
    param.setValueAtTime(0.14, t); param.linearRampToValueAtTime(1, t + 0.05);
    param.exponentialRampToValueAtTime(0.16, t + dur * 0.9);
  } else if (shape === "build") {
    param.setValueAtTime(0.12, t); param.linearRampToValueAtTime(1, t + dur * 0.94);
  } else if (shape === "hum") {
    param.setValueAtTime(0.72, t);
  } else {
    const p = dur / 2;
    for (let k = 0; k < 2; k++) {
      const s = t + k * p;
      param.setValueAtTime(0.22, s);
      param.linearRampToValueAtTime(1, s + p * 0.45);
      param.linearRampToValueAtTime(0.22, s + p);
    }
  }
}

/* per-pass gestures for time and control */
function passGestures(b, ans, when, pass) {
  if (ans.time === "coming") {
    b.sweep.frequency.cancelScheduledValues(when);
    b.sweep.frequency.setValueAtTime(500, when);
    b.sweep.frequency.exponentialRampToValueAtTime(14000, when + LOOP * 0.92);
  }
  const lands = ans.control === "act" || (ans.control === "unsure" && pass % 2 === 0);
  if (lands && b.sub) {
    try {
      b.sub.setNote(b.fifthNote, when + LOOP * 0.75);
      b.sub.setNote(b.subNote, when + LOOP * 0.97);
    } catch (e) {}
  }
}

/* ------------------------------------------------------------------ */
/*  The send-off: one short, warm phrase built from the same answers.  */
/*  The loop only resolves if you said you could act — but the send-   */
/*  off always lands, because naming the thing is itself an act. It    */
/*  plays once when the feeling gets its name, and again in the last   */
/*  two seconds of the recording, so the video ends settled.           */
function sendoffNotes(ans) {
  const root = ans.place.length ? PLACE[ans.place[0]].root : "C3";
  const f = Tone.Frequency(root);
  const iv = [0, 7, 12];
  if (ans.valence === "good") iv.push(16, 19);        /* major, openly */
  else if (ans.valence === "both") iv.push(15, 16);   /* the minor third, then the turn */
  else iv.push(14, 19);                                /* add9 — warm without pretending */
  return iv.map((n) => f.transpose(n + 12).toNote());  /* up an octave, bell register */
}

function playSendoff(dest, ans, when) {
  const q = ans.quality || { motion: 0.5, intensity: 0.5 };
  const notes = sendoffNotes(ans);
  const nodes = [];
  const gain = new Tone.Gain(0.9).connect(dest);
  const bell = new Tone.PolySynth(Tone.FMSynth, {
    volume: -16, harmonicity: 2.01, modulationIndex: 1.6,
    envelope: { attack: 0.005, decay: 2.4, sustain: 0, release: 2.6 },
    modulationEnvelope: { attack: 0.005, decay: 0.5, sustain: 0 },
  }).connect(gain);
  const under = new Tone.Synth({
    volume: -18, oscillator: { type: "sine" },
    envelope: { attack: 0.4, decay: 2.6, sustain: 0, release: 2.2 },
  }).connect(gain);
  nodes.push(gain, bell, under);
  const t0 = when !== undefined ? when : Tone.now() + 0.05;
  const gap = 0.19 - 0.09 * q.motion;                 /* a moving feeling rolls quicker */
  const vel = 0.32 + 0.3 * q.intensity;
  notes.forEach((n, k) => {
    const last = k === notes.length - 1;
    /* a small breath before the landing note */
    const at = t0 + k * gap + (last ? gap * 0.8 : 0);
    bell.triggerAttackRelease(n, "2n", at, Math.min(0.7, vel * (last ? 1.1 : 1 - k * 0.06)));
  });
  /* and the root underneath, once everything is ringing */
  under.triggerAttackRelease(Tone.Frequency(notes[0]).transpose(-12).toNote(), "1n",
    t0 + gap * (notes.length - 1) + 0.3, 0.5);
  let disposed = false;
  const dispose = () => {
    if (disposed) return;
    disposed = true;
    nodes.forEach((n) => { try { n.dispose(); } catch (e) {} });
  };
  const timer = setTimeout(dispose, Math.max(0, (t0 - Tone.now()) + 8) * 1000);
  return () => { clearTimeout(timer); dispose(); };
}

/* ================================================================== */
/* the pads take seconds to bloom, so render two passes and keep the second —
   the exported ten seconds is then fully established from its first sample */
/* ---- video: canvas + live audio, for the surfaces that eat links ---- */
const MIMES = ["video/mp4;codecs=avc1.42E01E,mp4a.40.2", "video/mp4;codecs=avc1,mp4a.40.2", "video/mp4",
  "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];

function videoMime() {
  if (typeof MediaRecorder === "undefined") return null;
  return MIMES.find((m) => { try { return MediaRecorder.isTypeSupported(m); } catch (e) { return false; } }) || null;
}

/* isTypeSupported lies on some builds — record a quarter second and check bytes came out */
async function probeMime() {
  if (typeof MediaRecorder === "undefined" || typeof document === "undefined") return null;
  for (const m of MIMES) {
    let stream;
    try {
      if (!MediaRecorder.isTypeSupported(m)) continue;
      const cv = document.createElement("canvas");
      cv.width = 64; cv.height = 64;
      const cx = cv.getContext("2d");
      cx.fillStyle = "#101419"; cx.fillRect(0, 0, 64, 64);
      stream = cv.captureStream(12);
      const rec = new MediaRecorder(stream, { mimeType: m });
      let bytes = 0;
      rec.ondataavailable = (e) => { bytes += e.data.size; };
      const done = new Promise((r) => { rec.onstop = r; });
      rec.start();
      await new Promise((r) => setTimeout(r, 260));
      rec.stop();
      await done;
      stream.getTracks().forEach((t) => t.stop());
      if (bytes > 0) return m;
    } catch (e) {
      try { if (stream) stream.getTracks().forEach((t) => t.stop()); } catch (e2) {}
    }
  }
  return null;
}

/* ---- palette: the body part picks the family, the answers tune it ---- */
function seedOf(ans) {
  if (!ans.place.length) return "";
  const q = ans.quality;
  return [ans.place.join("+"),
    ["intensity", "weight", "temp", "tension", "motion"].map((k) => Math.round(q[k] * 20)).join(""),
    ans.valence, ans.agency, ans.pull.join("+"), ans.time, ans.control, ans.shape].join("|");
}
function toHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), l = (mx + mn) / 2, d = mx - mn;
  const sat = d === 0 ? 0 : d / (1 - Math.abs(2 * l - 1));
  let h = 0;
  if (d !== 0) h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return [((h * 60) + 360) % 360, sat, l];
}
function toHex(h, sat, l) {
  const c = (1 - Math.abs(2 * l - 1)) * sat, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2;
  const [r, g, b] = h < 60 ? [c, x, 0] : h < 120 ? [x, c, 0] : h < 180 ? [0, c, x]
    : h < 240 ? [0, x, c] : h < 300 ? [x, 0, c] : [c, 0, x];
  const f = (v) => Math.round(Math.max(0, Math.min(255, (v + m) * 255))).toString(16).padStart(2, "0");
  return `#${f(r)}${f(g)}${f(b)}`;
}
/* two feelings only share a colour if every single answer matches */
function palette(ans) {
  const base = ans.place.length ? PLACE[ans.place[0]].accent : NEUTRAL;
  const seed = seedOf(ans);
  if (!seed) return { accent: base, second: base };
  const n = hashOf(seed);
  const [bh, bs, bl] = toHsl(...hex(base));
  const accent = toHex((bh + ((n % 61) - 30) + 360) % 360,
    Math.max(0.24, Math.min(0.74, bs + (((n >> 6) % 25) - 12) / 100)),
    Math.max(0.44, Math.min(0.7, bl + (((n >> 11) % 17) - 8) / 100)));
  const [ah, as_, al] = toHsl(...hex(accent));
  const second = toHex((ah + 120 + ((n >> 4) % 90)) % 360, Math.max(0.22, as_ * 0.85), Math.min(0.62, al * 0.92));
  return { accent, second };
}

/* ---- album art: a seeded photo, duotoned past literalness ---- */
const COVER = (seed) => `https://picsum.photos/seed/${encodeURIComponent(seed)}/1080/1080?grayscale&blur=2`;

function loadCover(seed) {
  return new Promise((resolve) => {
    if (typeof Image === "undefined") return resolve(null);
    const img = new Image();
    img.crossOrigin = "anonymous";
    const bail = setTimeout(() => resolve(null), 6000);
    img.onload = () => { clearTimeout(bail); resolve(img); };
    img.onerror = () => { clearTimeout(bail); resolve(null); };
    img.src = COVER(seed);
  });
}

const hashOf = (s) => { let h = 2166136261; for (let k = 0; k < s.length; k++) { h ^= s.charCodeAt(k); h = Math.imul(h, 16777619); } return Math.abs(h); };
const hex = (c) => { const n = parseInt(c.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };

/* if the photo never arrives, generate the sleeve instead */
function paintProcedural(c, W, H, accent, seed, second) {
  const h = hashOf(seed || "x"), [r, g, b] = hex(accent);
  const alt = hex(second || accent);
  c.fillStyle = INK; c.fillRect(0, 0, W, H);
  for (let k = 0; k < 7; k++) {
    const a = ((h >> (k * 3)) & 255) / 255;
    const q = ((h >> (k * 5 + 2)) & 255) / 255;
    const z = ((h >> (k * 7 + 1)) & 255) / 255;
    const x = W * (-0.1 + 1.2 * a), y = H * (-0.05 + 0.95 * q), rad = W * (0.3 + 0.55 * z);
    const col = k % 2 ? alt : [r, g, b];
    const grd = c.createRadialGradient(x, y, 0, x, y, rad);
    grd.addColorStop(0, `rgba(${col[0]},${col[1]},${col[2]},${0.2 + 0.3 * z})`);
    grd.addColorStop(0.55, `rgba(${col[0]},${col[1]},${col[2]},${0.07 + 0.11 * a})`);
    grd.addColorStop(1, "rgba(0,0,0,0)");
    c.fillStyle = grd; c.fillRect(0, 0, W, H);
  }
  const sweep = c.createLinearGradient(0, 0, W, H * 0.8);
  sweep.addColorStop(0, `rgba(${r},${g},${b},0.16)`);
  sweep.addColorStop(0.6, "rgba(0,0,0,0)");
  sweep.addColorStop(1, `rgba(${alt[0]},${alt[1]},${alt[2]},0.12)`);
  c.fillStyle = sweep; c.fillRect(0, 0, W, H);
}

function grain(c, W, H, amount) {
  const n = Math.floor(W * H * 0.012);
  c.save();
  for (let k = 0; k < n; k++) {
    c.fillStyle = `rgba(255,255,255,${Math.random() * amount})`;
    c.fillRect(Math.random() * W, Math.random() * H, 1.4, 1.4);
  }
  c.restore();
}

function wrap(c, text, maxW) {
  const lines = [];
  let line = "";
  text.split(" ").forEach((w) => {
    if (c.measureText(line + w).width > maxW && line) { lines.push(line.trim()); line = ""; }
    line += w + " ";
  });
  if (line.trim()) lines.push(line.trim());
  return lines;
}

/* the sleeve: artwork, duotone, then a bottom stack laid out from the floor up */
function paintSleeve(c, W, H, opts) {
  const { img, accent, second, seed, name, text, level, hist, t, grainOn = true } = opts;
  const [r, g, b] = hex(accent);
  const S = W / 1080;                                  /* everything scales off 1080 wide */
  c.fillStyle = INK; c.fillRect(0, 0, W, H);

  if (img) {
    const s = Math.max(W / img.width, H / img.height);
    const dw = img.width * s, dh = img.height * s;
    c.save();
    c.globalAlpha = 0.72;
    c.drawImage(img, (W - dw) / 2, (H - dh) / 2 - H * 0.06, dw, dh);
    c.restore();
    c.globalCompositeOperation = "multiply";
    c.fillStyle = `rgb(${Math.round(r * 0.95)},${Math.round(g * 0.9)},${Math.round(b * 0.95)})`;
    c.fillRect(0, 0, W, H);
    c.globalCompositeOperation = "source-over";
    c.fillStyle = "rgba(16,20,25,0.3)";
    c.fillRect(0, 0, W, H);
  } else {
    paintProcedural(c, W, H, accent, seed, second);
  }

  const fade = c.createLinearGradient(0, H * 0.42, 0, H);
  fade.addColorStop(0, "rgba(16,20,25,0)");
  fade.addColorStop(0.45, "rgba(16,20,25,0.55)");
  fade.addColorStop(0.8, "rgba(16,20,25,0.9)");
  fade.addColorStop(1, "rgba(16,20,25,0.97)");
  c.fillStyle = fade; c.fillRect(0, 0, W, H);
  if (grainOn) grain(c, W, H, 0.05);

  const pad = 90 * S;
  c.textBaseline = "alphabetic";
  c.fillStyle = `rgba(${r},${g},${b},0.92)`;
  c.font = `500 ${22 * S}px ${MONO}`;
  c.fillText("TEN SECONDS OF IT", pad, 108 * S);

  /* --- bottom stack, measured upward so nothing can collide --- */
  let y = H - 66 * S;
  const bh = 92 * S, bc = y - bh / 2, n = hist.length || 1, bw = (W - pad * 2) / n;
  for (let k = 0; k < n; k++) {
    const idx = t === undefined ? k : (k + Math.floor(t * 26)) % n;
    const a = Math.max(0.02, Math.min(1, hist[idx])) * (bh / 2);
    c.fillStyle = `rgba(${r},${g},${b},${0.42 + 0.58 * Math.min(1, hist[idx] * 1.6)})`;
    c.fillRect(pad + k * bw, bc - a, Math.max(1.5, bw - 2 * S), a * 2);
  }
  y = bc - bh / 2 - 46 * S;

  if (level >= 2 && text) {
    c.font = `400 ${29 * S}px ${SERIF}`;
    const lines = wrap(c, text, W - pad * 2).slice(-4);
    c.fillStyle = "rgba(233,228,218,0.62)";
    const lh = 42 * S;
    lines.forEach((ln, k) => c.fillText(ln, pad, y - (lines.length - 1 - k) * lh));
    y -= (lines.length - 1) * lh + 34 * S;
  }

  if (level >= 1 && name) {
    c.fillStyle = BONE;
    let s = 92 * S; c.font = `400 ${s}px ${SERIF}`;
    while (c.measureText(name).width > W - pad * 2 && s > 34 * S) { s -= 4 * S; c.font = `400 ${s}px ${SERIF}`; }
    c.fillText(name, pad, y);
  }
}

/* ================================================================== */
const EMPTY = {
  place: [], quality: { intensity: 0.5, weight: 0.5, temp: 0.5, tension: 0.5, motion: 0.5 },
  valence: null, agency: null, pull: [], time: null, control: null, shape: null,
};

export default function FeelingInstrument() {
  const [phase, setPhase] = useState("cover");
  const [i, setI] = useState(0);
  const [ans, setAns] = useState(EMPTY);
  const [name, setName] = useState("");
  const [ready, setReady] = useState(false);
  const [silent, setSilent] = useState(false);
  const [muted, setMuted] = useState(false);
  const [booting, setBooting] = useState(false);
  const [job, setJob] = useState({ state: "idle", msg: "" });
  const [vis, setVis] = useState({ q: false, calm: false, opts: false });
  const [leaving, setLeaving] = useState(false);
  const [chosen, setChosen] = useState(null);
  const [flash, setFlash] = useState(0);
  const [offer, setOffer] = useState(false);
  const [solo, setSolo] = useState(null);
  const [level, setLevel] = useState(0);       /* 0 sound · 1 +name · 2 +words */
  const [art, setArt] = useState({ img: null, state: "idle", seed: "" });
  const [prog, setProg] = useState(0);

  const out = useRef(null);
  const patch = useRef({ nodes: [], sched: [] });
  const qRef = useRef(EMPTY.quality);
  const accentRef = useRef(NEUTRAL);
  const secondRef = useRef(NEUTRAL);
  const mimeRef = useRef(undefined);
  const canvasRef = useRef(null);
  const histRef = useRef(new Array(150).fill(0.02));
  const barRefs = useRef(new Map());
  const sleeveRef = useRef(null);
  const headRef = useRef(null);

  const { accent, second } = palette(ans);
  accentRef.current = accent;
  secondRef.current = second;
  const reduced = typeof window !== "undefined" && window.matchMedia
    && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const screen = phase === "flow" ? FLOW[i] : null;
  const text = summary(ans);
  const notes = phase === "name" ? tensions(ans) : [];

  /* artwork is seeded by the answers, so a feeling always gets the same sleeve */
  const artSeed = seedOf(ans);
  const artRef = useRef({ img: null, seed: "" });
  artRef.current = { img: art.img, seed: artSeed };
  const nameRef = useRef(""); nameRef.current = name;
  const textRef = useRef(""); textRef.current = text;
  const levelRef = useRef(0); levelRef.current = level;

  useEffect(() => {
    if (!artSeed || !["name", "result"].includes(phase)) return;
    let dead = false;
    setArt((a) => (a.seed === artSeed ? a : { img: a.img, state: "loading", seed: artSeed }));
    loadCover(artSeed).then((img) => {
      if (!dead) setArt({ img, state: img ? "ready" : "fallback", seed: artSeed });
    });
    return () => { dead = true; };
  }, [artSeed, phase]);

  /* ---------- audio ---------- */
  const teardown = useCallback(() => {
    patch.current.sched.forEach((id) => { try { T().clear(id); } catch (e) {} });
    patch.current.nodes.forEach((n) => {
      try { if (n.stop) n.stop(); } catch (e) {}
      try { n.dispose(); } catch (e) {}
    });
    patch.current = { nodes: [], sched: [] };
  }, []);

  const applyQuality = useCallback((q) => {
    qRef.current = q;
    const p = patch.current;
    if (!p.voiceBus) return;
    const { intensity: iv, weight: w, temp: h, tension: tn, motion: mo } = q;
    p.voiceBus.gain.rampTo(0.42 + 0.58 * iv, 0.3);
    p.filters.forEach(({ f, base }) => {
      f.frequency.rampTo(base * (0.5 + 0.9 * iv) * (0.72 + 0.62 * h), 0.35);
      f.Q.rampTo(0.5 + 7.5 * tn, 0.35);
    });
    p.eq.low.rampTo(-4 + 10 * w, 0.35);
    p.eq.high.rampTo(4 - 9 * w, 0.35);
    p.subGain.gain.rampTo(0.06 + 0.5 * w, 0.35);
    p.shimmer.gain.rampTo(0.05 + 0.42 * (1 - w), 0.35);
    p.distortion.wet.rampTo(Math.max(0, (h - 0.5) * 0.6), 0.35);
    p.vibrato.frequency.rampTo(3 + 4.5 * h, 0.35);
    p.vibrato.depth.rampTo(0.015 + 0.13 * mo, 0.35);
    p.tremolo.depth.rampTo(0.65 * mo, 0.35);
    p.tremolo.frequency.rampTo(0.3 + 5.2 * mo, 0.35);
    /* a moving feeling doesn't sit square on the beat */
    const tr = T();
    tr.swing = 0.18 * mo; tr.swingSubdivision = "8n";
    if (out.current && ans.place.length)
      out.current.reverb.wet.rampTo(Math.max(0.12, PLACE[ans.place[0]].wet * (1.25 - 0.85 * tn) * (1.1 - 0.3 * iv)), 0.4);
  }, [ans.place]);

  const applySolo = useCallback((id) => {
    const g = patch.current.gains;
    if (!g) return;
    Object.entries(g).forEach(([k, { g: node, base }]) => {
      node.gain.rampTo(id === null || id === k ? base : 0, 0.25);
    });
  }, []);

  const rebuild = useCallback(() => {
    if (!out.current || !ans.place.length) return;
    const t = T();
    try { t.pause(); } catch (e) {}
    teardown();
    const built = buildPatch({ dest: out.current.reverb, ans, t0: Tone.now() + 0.12,
      velRef: () => 0.5 + 0.7 * qRef.current.intensity });
    patch.current = { ...built, sched: [] };
    applyQuality(qRef.current);
    setSolo(null);

    let pass = 0;
    const run = (when) => {
      if (ans.shape) {
        built.shapeGain.gain.cancelScheduledValues(when);
        applyShape(built.shapeGain.gain, ans.shape, when, LOOP);
      }
      passGestures(built, ans, when, pass);
      pass++;
    };
    if (!ans.shape) built.shapeGain.gain.rampTo(0.7, 1);
    run(Tone.now() + 0.14);
    patch.current.sched.push(t.scheduleRepeat((when) => run(when), "4m", "4m"));
    t.position = 0;
    t.start("+0.1");
  }, [ans, teardown, applyQuality]);

  const start = async (to) => {
    /* one guided breath before the first question — skipped for reduced motion */
    const target = typeof to === "string" ? to : reduced ? "flow" : "settle";
    setBooting(true);
    try {
      await Tone.start();
      const limiter = new Tone.Limiter(-3).connect(DEST());
      const master = new Tone.Gain(0).connect(limiter);
      const analyser = new Tone.Analyser("waveform", 512);
      master.connect(analyser);
      const reverb = new Tone.Freeverb({ roomSize: 0.87, dampening: 2500, wet: 0.4 }).connect(master);
      out.current = { limiter, master, analyser, reverb };
      const t = T();
      t.bpm.value = BPM; t.loop = false; t.position = 0;
      master.gain.rampTo(0.9, 2);
      setReady(true);
    } catch (e) { console.error(e); setSilent(true); setReady(true); }
    setPhase(target); setBooting(false);
  };

  const structural = JSON.stringify([ans.place, ans.valence, ans.agency, ans.pull, ans.time, ans.control, ans.shape]);
  useEffect(() => {
    if (!ready || silent) return;
    rebuild();
    if (ans.place.length) setFlash((f) => f + 1);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [ready, silent, structural]);

  useEffect(() => { if (out.current) out.current.master.gain.rampTo(muted ? 0 : 0.9, 0.5); }, [muted]);

  /* the send-off plays once, live, the moment the feeling has its name */
  useEffect(() => {
    if (phase !== "result" || !ready || silent || !out.current || !ans.place.length) return;
    return playSendoff(out.current.reverb, ans, Tone.now() + 0.15);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [phase]);

  useEffect(() => () => {
    try { T().stop(); } catch (e) {}
    teardown();
    if (out.current) Object.values(out.current).forEach((n) => { try { n.dispose(); } catch (e) {} });
    out.current = null;
  }, [teardown]);

  useEffect(() => {
    if (phase !== "flow") return;
    setChosen(null); setLeaving(false);
    setVis({ q: false, calm: false, opts: false });
    const g = screen && screen.gentle;
    const ts = [
      setTimeout(() => setVis((v) => ({ ...v, q: true })), reduced ? 0 : 80),
      setTimeout(() => setVis((v) => ({ ...v, calm: true })), reduced ? 0 : g ? 340 : 560),
      setTimeout(() => setVis((v) => ({ ...v, opts: true })), reduced ? 0 : g ? 900 : 1600),
      setTimeout(() => { if (headRef.current) headRef.current.focus(); }, 120),
    ];
    return () => ts.forEach(clearTimeout);
    /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [phase, i, reduced]);

  /* ---------- canvas ---------- */
  useEffect(() => {
    const cv = canvasRef.current;
    if (!cv) return;
    let raf, last = 0, tick = 0;
    const ctx = cv.getContext("2d");
    const fit = () => {
      const r = cv.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.width = Math.max(1, r.width * dpr); cv.height = Math.max(1, r.height * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    fit(); window.addEventListener("resize", fit);
    const draw = (ts) => {
      raf = requestAnimationFrame(draw);
      if (reduced && ts - last < 110) return;
      last = ts;
      const ms = patch.current.meters;
      if (ms) Object.entries(ms).forEach(([id, m]) => {
        const el = barRefs.current.get(id);
        if (!el) return;
        let v = 0; try { v = m.getValue(); } catch (e) {}
        if (typeof v !== "number" || !isFinite(v)) v = 0;
        el.style.transform = `scaleX(${muted ? 0.015 : Math.max(0.015, Math.min(1, v * 2.6))})`;
      });
      const r = cv.getBoundingClientRect(), w = r.width, h = r.height, mid = h / 2;
      ctx.clearRect(0, 0, w, h);
      let data = null;
      if (out.current && !muted) { try { data = out.current.analyser.getValue(); } catch (e) {} }
      if (data && data.length && ++tick % 3 === 0) {
        let s = 0;
        for (let k = 0; k < data.length; k += 4) s += data[k] * data[k];
        histRef.current.push(Math.min(1, Math.sqrt(s / (data.length / 4)) * 3.4));
        histRef.current.shift();
      }

      /* the sleeve preview, repainted lightly */
      const sv = sleeveRef.current;
      if (sv && tick % 5 === 0) {
        const sc = sv.getContext("2d");
        paintSleeve(sc, sv.width, sv.height, {
          img: artRef.current.img, accent: accentRef.current, second: secondRef.current, seed: artRef.current.seed,
          name: nameRef.current, text: textRef.current, level: levelRef.current,
          hist: histRef.current, t: ts / 1000, grainOn: false,
        });
      }
      const col = accentRef.current;
      if (phase === "name" || phase === "result") {
        const hist = histRef.current, n = hist.length, bw = w / n;
        ctx.fillStyle = col;
        for (let k = 0; k < n; k++) {
          const a = Math.max(0.012, hist[k]) * (h / 2) * 0.9;
          ctx.fillRect(k * bw, mid - a, Math.max(1, bw - 1.5), a * 2);
        }
      } else {
        ctx.lineWidth = 1.4; ctx.lineJoin = "round"; ctx.strokeStyle = col;
        ctx.shadowBlur = 14; ctx.shadowColor = col;
        ctx.beginPath();
        if (data && data.length) {
          for (let k = 0; k < data.length; k++) {
            const x = (k / (data.length - 1)) * w, y = mid - data[k] * (h * 0.42);
            k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
        } else {
          for (let k = 0; k <= 120; k++) {
            const x = (k / 120) * w, y = mid + Math.sin(k * 0.6 + ts / 900) * 0.7;
            k === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
          }
        }
        ctx.stroke(); ctx.shadowBlur = 0;
      }
    };
    raf = requestAnimationFrame(draw);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", fit); };
  }, [muted, reduced, phase]);

  /* ---------- exports ---------- */
  const slug = (name || "how-it-feels").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "how-it-feels";

  const deliver = async (blob, fname, type) => {
    const file = typeof File !== "undefined" ? new File([blob], fname, { type }) : null;
    if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
      try { await navigator.share({ files: [file], title: name || undefined, text: name ? `${name} — ${text}` : text }); return; } catch (e) {}
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = fname; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  const copyText = async () => {
    try {
      await navigator.clipboard.writeText(`${name ? name + "\n\n" : ""}${text}`);
      setJob({ state: "done", msg: "Copied." });
    } catch (e) { setJob({ state: "error", msg: "Couldn't copy here." }); }
  };

  /* ten seconds of animated sleeve plus the live audio bus */
  const saveVideo = async () => {
    if (silent || !out.current) {
      setJob({ state: "error", msg: "No audio here, so there's nothing to record. The image still works." });
      return;
    }
    if (mimeRef.current === undefined) {
      setJob({ state: "working", msg: "Checking this browser…" });
      mimeRef.current = (await probeMime()) || videoMime();
    }
    const mime = mimeRef.current;
    if (!mime) {
      setJob({ state: "error", msg: "This browser can't record video. Save the image and the audio instead." });
      return;
    }
    let cleanup = () => {};
    let ticker = null;
    try {
      const W = 1080, H = 1350;
      const cv = document.createElement("canvas");
      cv.width = W; cv.height = H;
      const ctx = cv.getContext("2d");
      const ctxRaw = Tone.getContext().rawContext || Tone.getContext();
      const msd = ctxRaw.createMediaStreamDestination();
      out.current.master.connect(msd);

      const stream = cv.captureStream(30);
      msd.stream.getAudioTracks().forEach((t) => stream.addTrack(t));
      const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 4_000_000 });
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };

      let raf, t0 = performance.now();
      const loop = () => {
        raf = requestAnimationFrame(loop);
        paintSleeve(ctx, W, H, {
          img: artRef.current.img, accent, second, seed: artSeed, name, text, level,
          hist: histRef.current, t: (performance.now() - t0) / 1000, grainOn: false,
        });
      };
      loop();

      /* only wait for the next bar — at most 2.5s — then re-arm the envelope
         so the ten seconds is a proper cycle without a ten second wait */
      const tr = T();
      let wait = 0;
      try {
        const bar = Tone.Time("1m").toSeconds();
        wait = bar - (tr.seconds % bar);
        if (wait > bar - 0.06) wait = 0;
      } catch (e) { wait = 0; }
      if (wait > 0) await new Promise((r) => setTimeout(r, wait * 1000));
      try {
        const live = patch.current;
        if (live.shapeGain && ans.shape) {
          live.shapeGain.gain.cancelScheduledValues(Tone.now());
          applyShape(live.shapeGain.gain, ans.shape, Tone.now() + 0.02, LOOP);
        }
        passGestures(live, ans, Tone.now() + 0.02, 0);
      } catch (e) {}

      const g0 = out.current.master.gain, tNow = Tone.now();
      g0.cancelScheduledValues(tNow);
      g0.setValueAtTime(0.0001, tNow);
      g0.linearRampToValueAtTime(0.9, tNow + 0.25);
      g0.setValueAtTime(0.9, tNow + LOOP - 0.7);
      g0.linearRampToValueAtTime(0.0001, tNow + LOOP);

      /* the recording ends on the send-off, ringing out under the fade */
      try { playSendoff(out.current.reverb, ans, tNow + LOOP - 2.4); } catch (e) {}

      cleanup = () => {
        cancelAnimationFrame(raf);
        try { out.current.master.disconnect(msd); } catch (e) {}
        try { out.current.master.gain.cancelScheduledValues(Tone.now()); } catch (e) {}
        if (out.current) out.current.master.gain.rampTo(muted ? 0 : 0.9, 0.4);
      };

      const done = new Promise((res) => { rec.onstop = res; });
      rec.start();
      const began = performance.now();
      setProg(0.001);
      setJob({ state: "working", msg: "Keep this tab in front — it records in real time." });
      ticker = setInterval(() => {
        setProg(Math.min(1, (performance.now() - began) / (LOOP * 1000)));
      }, 80);
      await new Promise((r) => setTimeout(r, LOOP * 1000 + 250));
      clearInterval(ticker); ticker = null;
      setProg(1);
      rec.stop();
      await done;
      cleanup();

      const ext = mime.startsWith("video/mp4") ? "mp4" : "webm";
      await deliver(new Blob(chunks, { type: mime }), `${slug}.${ext}`, mime);
      setProg(0);
      setJob({ state: "done", msg: ext === "mp4"
        ? "Saved. Ten seconds of MP4 — post it anywhere."
        : "Saved as WebM — this browser can't make MP4. Chrome or Safari will." });
    } catch (e) {
      console.error(e);
      if (ticker) clearInterval(ticker);
      setProg(0); cleanup();
      setJob({ state: "error", msg: "Recording failed part way through. The image and the audio still work." });
    }
  };

  /* ---------- interaction ---------- */
  const go = (n) => { if (n >= FLOW.length) setPhase("name"); else setI(n); };
  const leave = (after) => { setLeaving(true); setTimeout(after, reduced ? 0 : 460); };
  const pick = (key, slot, val, single) => {
    if (leaving) return;
    setChosen(val);
    setAns((p) => {
      if (single) {
        const next = { ...p, [key]: val };
        /* changing valence or agency changes which impulses exist */
        if ((key === "valence" || key === "agency") && p.pull.length) next.pull = [];
        return next;
      }
      const cur = [...p[key]]; cur[slot] = val;
      return { ...p, [key]: cur.filter(Boolean) };
    });
    setJob({ state: "idle", msg: "" });
    leave(() => go(i + 1));
  };
  const skip = () => { if (leaving) return; setChosen("__none"); leave(() => go(i + 1)); };
  const back = () => { if (i > 0 && !leaving) leave(() => setI(i - 1)); };
  const jumpTo = (id) => { const n = FLOW.findIndex((f) => f.id === id); if (n >= 0) { setOffer(false); setPhase("flow"); setI(n); } };
  const reset = () => {
    setAns(EMPTY); qRef.current = { ...EMPTY.quality };
    setName(""); setI(0); setPhase("flow"); setOffer(false); setSolo(null);
    setLevel(0);
    setArt({ img: null, state: "idle", seed: "" });
    setJob({ state: "idle", msg: "" });
    histRef.current = new Array(150).fill(0.02);
  };
  const toggleSolo = (id) => {
    const next = solo === id ? null : id;
    setSolo(next); applySolo(next);
  };

  const layers = [
    ...ans.place.map((k) => ({ id: `place:${k}`, why: PLACE[k].short, name: PLACE[k].instrument, metered: true })),
    ...(ans.valence ? [{ id: "v", why: "want it or not", name: VALENCE[ans.valence].sound }] : []),
    ...(ans.agency ? [{ id: "a", why: "who caused it", name: AGENCY[ans.agency].sound }] : []),
    ...ans.pull.filter((k) => IMPULSE[k].kit).map((k, n) => ({
      id: `pull:${k}`, why: IMPULSE[k].phrase.split(" ").slice(0, 3).join(" "),
      name: IMPULSE[k].instrument + (n === 1 && ans.pull.length === 2 ? ", in triplets" : ""), metered: true })),
    ...(ans.pull.includes("freeze") ? [{ id: "f", why: "freeze", name: "no rhythm at all" }] : []),
    ...(ans.time ? [{ id: "t", why: "behind or ahead", name: TIME[ans.time].sound }] : []),
    ...(ans.control ? [{ id: "c", why: "can you act", name: CONTROL[ans.control].sound }] : []),
    ...(ans.shape ? [{ id: "s", why: "how it moved", name: SHAPE[ans.shape].sound }] : []),
  ];

  const softBtn = { background: "transparent", color: ASH, border: `1px solid ${LINE}`, borderRadius: 2, font: `500 13px ${SANS}`, padding: "12px 22px", cursor: "pointer" };


  return (
    <div style={{ minHeight: "100vh", background: INK, color: BONE, fontFamily: SANS, display: "flex", justifyContent: "center", padding: "0 22px 56px" }}>
      <style>{`
        @keyframes layerIn { from{opacity:0;transform:translateX(-6px);} to{opacity:1;transform:none;} }
        @keyframes breathe { 0%,100%{transform:scale(.72);opacity:.45} 45%,58%{transform:scale(1);opacity:1} }
        .layer{ animation:layerIn .45s ease both; }
        .opt{ display:block;width:100%;text-align:left;background:transparent;border:none;
              border-bottom:1px solid ${LINE};padding:16px 2px;color:${BONE};
              font:400 18px/1.35 ${SERIF};cursor:pointer;
              transition:color .2s ease,opacity .25s ease,padding-left .2s ease; }
        .opt:hover:not(:disabled){ color:${accent};padding-left:8px; }
        .opt:disabled{ cursor:default; }
        .grid{ display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px; }
        .card{ display:flex;flex-direction:column;gap:10px;text-align:left;background:${PANEL};
               border:1px solid ${LINE};border-radius:3px;padding:16px 16px 15px;color:${BONE};
               cursor:pointer;transition:border-color .2s ease,opacity .25s ease,transform .2s ease; }
        .card:hover:not(:disabled){ border-color:${accent};transform:translateY(-2px); }
        .card:disabled{ cursor:default; }
        .solo{ width:100%;display:flex;align-items:center;gap:12px;padding:5px 0;background:transparent;
               border:none;cursor:pointer;text-align:left; }
        button:focus-visible,input:focus-visible,h2:focus-visible{ outline:2px solid ${accent};outline-offset:3px; }
        h2:focus{ outline:none; }
        input[type=range]{ accent-color:${accent};width:100%;height:30px;margin:0; }
        input[type=text]::placeholder{ color:${ASH}; }
        @media (prefers-reduced-motion: reduce){ .layer{animation:none;} *{transition:none !important;} }
      `}</style>

      <div style={{ width: "100%", maxWidth: 640 }}>
        <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "24px 0 18px" }}>
          <div style={{ font: `500 10px ${MONO}`, letterSpacing: "0.22em", color: ASH }}>TEN SECONDS OF IT</div>
          {ready && !silent && (
            <button onClick={() => setMuted((m) => !m)} aria-pressed={!muted}
              style={{ background: "transparent", border: `1px solid ${LINE}`, borderRadius: 2, color: muted ? ASH : accent, font: `500 9.5px ${MONO}`, letterSpacing: "0.14em", padding: "6px 11px", cursor: "pointer" }}>
              {muted ? "SOUND OFF" : "SOUND ON"}
            </button>
          )}
        </header>

        {phase === "flow" && (
          <div aria-hidden="true" style={{ display: "flex", gap: 4, marginBottom: 14 }}>
            {FLOW.map((f, n) => (
              <div key={f.id} style={{ flex: 1, height: 2, borderRadius: 1, transition: "background .35s ease",
                background: n < i ? accent : n === i ? BONE : LINE, opacity: n <= i ? 1 : 0.7 }} />
            ))}
          </div>
        )}
        <div style={{ height: phase === "name" || phase === "result" ? 170 : 96, background: PANEL, border: `1px solid ${LINE}`, borderRadius: 2, overflow: "hidden", transition: reduced ? "none" : "height .5s ease" }} aria-hidden="true">
          <canvas ref={canvasRef} style={{ width: "100%", height: "100%", display: "block" }} />
        </div>

        {ready && (
          <div style={{ marginTop: 10, minHeight: 24 }} aria-live="polite" aria-label="What's playing">
            {layers.length === 0 && (
              <div style={{ font: `500 9px ${MONO}`, letterSpacing: "0.16em", color: ASH, padding: "6px 0" }}>
                {silent ? "NO AUDIO HERE — TEXT ONLY" : "NOTHING PLAYING YET"}
              </div>
            )}
            {layers.map((l) => {
              const dim = solo && solo !== l.id;
              const row = (
                <>
                  <div style={{ width: 104, flexShrink: 0, font: `500 9px ${MONO}`, letterSpacing: "0.13em", color: solo === l.id ? accent : ASH, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.why.toUpperCase()}</div>
                  <div style={{ flex: 1, height: 3, background: LINE, position: "relative", overflow: "hidden" }}>
                    {l.metered ? (
                      <div ref={(el) => { el ? barRefs.current.set(l.id, el) : barRefs.current.delete(l.id); }}
                        style={{ position: "absolute", inset: 0, background: accent, transformOrigin: "left center", transform: "scaleX(0.015)" }} />
                    ) : <div style={{ position: "absolute", inset: 0, background: accent, opacity: 0.3 }} />}
                  </div>
                  <div style={{ width: 190, flexShrink: 0, textAlign: "right", font: `400 11.5px ${SANS}`, color: BONE, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{l.name}</div>
                </>
              );
              return l.metered && phase === "result" && !silent ? (
                <button key={l.id + ":" + flash} className="layer solo" onClick={() => toggleSolo(l.id)}
                  aria-pressed={solo === l.id} style={{ opacity: dim ? 0.3 : 1, transition: "opacity .25s ease" }}>{row}</button>
              ) : (
                <div key={l.id + ":" + flash} className="layer" style={{ display: "flex", alignItems: "center", gap: 12, padding: "5px 0", opacity: dim ? 0.3 : 1 }}>{row}</div>
              );
            })}
          </div>
        )}

        <main style={{ paddingTop: 36 }}>
          {phase === "cover" && (
            <div>
              <h1 style={{ font: `400 clamp(31px, 7vw, 45px)/1.14 ${SERIF}`, letterSpacing: "-0.02em", margin: "0 0 20px" }}>
                Something's there and you can't say what.<br />
                <span style={{ color: ASH }}>Let's hear it instead.</span>
              </h1>
              <p style={{ font: `400 16px/1.65 ${SANS}`, color: ASH, maxWidth: 480, margin: "0 0 26px" }}>
                Ten slow questions about the feeling you're carrying, and no wrong answers —
                nothing is diagnosed, and nothing is named for you.
              </p>
              <div style={{ maxWidth: 480, margin: "0 0 30px", borderTop: `1px solid ${LINE}` }}>
                {[["01", "Answer slowly", "each answer adds an instrument, live"],
                  ["02", "Hear it back", "ten seconds of what you just described"],
                  ["03", "Name it yourself", "your words, your name, one MP4 to keep"]].map(([n, t, d]) => (
                  <div key={n} style={{ display: "flex", gap: 14, alignItems: "baseline", padding: "11px 2px", borderBottom: `1px solid ${LINE}`, flexWrap: "wrap" }}>
                    <span style={{ font: `500 10px ${MONO}`, color: ASH }}>{n}</span>
                    <span style={{ font: `400 15px ${SERIF}`, color: BONE, minWidth: 128 }}>{t}</span>
                    <span style={{ font: `400 12.5px ${SANS}`, color: ASH }}>{d}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => start()} disabled={booting}
                style={{ background: BONE, color: INK, border: "none", borderRadius: 3, font: `600 15px ${SANS}`, padding: "16px 34px", cursor: "pointer" }}>
                {booting ? "Tuning…" : "Begin"}
              </button>
              <p style={{ font: `400 12px/1.5 ${SANS}`, color: ASH, marginTop: 16 }}>
                About two minutes. Nothing is saved or sent anywhere. Sound on, if you can — headphones are better.
              </p>
            </div>
          )}

          {phase === "settle" && (
            <div>
              <div aria-hidden="true" style={{ width: 84, height: 84, borderRadius: "50%",
                border: `1px solid ${LINE}`, background: `radial-gradient(circle, ${accent}44, transparent 72%)`,
                margin: "8px 0 30px", animation: reduced ? "none" : "breathe 8s ease-in-out infinite" }} />
              <h2 style={{ font: `400 clamp(25px, 5.6vw, 34px)/1.28 ${SERIF}`, letterSpacing: "-0.015em", margin: "0 0 12px" }}>
                First, one slow breath.
              </h2>
              <p style={{ font: `400 15px/1.6 ${SANS}`, color: ASH, maxWidth: 440, margin: "0 0 30px" }}>
                In while the circle brightens, out while it dims. There's no clock on any of
                this — the questions start when you do.
              </p>
              <button onClick={() => setPhase("flow")}
                style={{ background: BONE, color: INK, border: "none", borderRadius: 3, font: `600 15px ${SANS}`, padding: "15px 32px", cursor: "pointer" }}>
                I'm ready
              </button>
            </div>
          )}

          {screen && (
            <div style={{ opacity: leaving ? 0 : 1, transform: leaving ? "translateY(-10px)" : "none", transition: reduced ? "none" : "opacity .42s ease, transform .42s ease" }}>
              <div style={{ font: `500 9.5px ${MONO}`, letterSpacing: "0.18em", color: ASH, marginBottom: 14,
                opacity: vis.q ? 1 : 0, transition: reduced ? "none" : "opacity .5s ease" }}>
                {i + 1} OF {FLOW.length} · {STAGE[screen.id].toUpperCase()}
              </div>
              <h2 ref={headRef} tabIndex={-1}
                style={{ font: `400 clamp(25px, 5.6vw, 34px)/1.28 ${SERIF}`, letterSpacing: "-0.015em", margin: "0 0 12px", maxWidth: 540,
                  opacity: vis.q ? 1 : 0, transform: vis.q ? "none" : "translateY(6px)", transition: reduced ? "none" : "opacity .5s ease, transform .5s ease" }}>
                {screen.q(ans)}
              </h2>
              {screen.calm && (
                <p style={{ font: `400 15px/1.6 ${SANS}`, color: ASH, margin: "0 0 28px", maxWidth: 450, opacity: vis.calm ? 1 : 0, transition: reduced ? "none" : "opacity .6s ease" }}>
                  {screen.calm}
                </p>
              )}

              <div style={{ opacity: vis.opts ? 1 : 0, transform: vis.opts ? "none" : "translateY(6px)", transition: reduced ? "none" : "opacity .7s ease, transform .7s ease", pointerEvents: vis.opts && !leaving ? "auto" : "none" }}>
                {screen.kind === "sliders" && (
                  <div>
                    {SLIDERS.map((s) => (
                      <div key={s.key} style={{ marginBottom: 30 }}>
                        <div style={{ font: `500 9.5px ${MONO}`, letterSpacing: "0.16em", color: ASH, marginBottom: 6 }}>
                          {s.q.replace(/\?$/, "").toUpperCase()}
                        </div>
                        <div style={{ font: `400 21px/1.3 ${SERIF}`, color: accent, marginBottom: 10, minHeight: 28 }}>
                          {sWord(s.key, ans.quality[s.key])}
                        </div>
                        <input type="range" min="0" max="1" step="0.01" defaultValue={ans.quality[s.key]}
                          aria-label={s.q} aria-valuetext={sWord(s.key, ans.quality[s.key])}
                          onChange={(e) => {
                            const q = { ...qRef.current, [s.key]: +e.target.value };
                            applyQuality(q); setAns((p) => ({ ...p, quality: q }));
                          }} />
                        <div style={{ display: "flex", justifyContent: "space-between", font: `400 9px ${MONO}`, letterSpacing: "0.14em", color: ASH }}>
                          <span>{s.left}</span><span>{s.right}</span>
                        </div>
                      </div>
                    ))}
                    <button onClick={() => { if (!leaving) leave(() => go(i + 1)); }}
                      style={{ marginTop: 10, background: accent, color: INK, border: "none", borderRadius: 3,
                        font: `600 15px ${SANS}`, padding: "15px 34px", cursor: "pointer" }}>
                      That's how it feels
                    </button>
                  </div>
                )}

                {screen.kind === "list" && (
                  <div role="group" aria-label={screen.q(ans)}>
                    {Object.entries(screen.opts(ans))
                      .filter(([k]) => !(screen.slot === 1 && ans[screen.key][0] === k))
                      .map(([k, o]) => (
                        <button key={k} className="opt" disabled={!!chosen} onClick={() => pick(screen.key, screen.slot, k, screen.single)}
                          style={{ color: chosen === k ? accent : BONE, opacity: chosen && chosen !== k ? 0.22 : 1 }}>
                          {o.label}
                          <span style={{ display: "block", font: `400 13px ${SANS}`, color: chosen === k ? accent : ASH, marginTop: 5 }}>{o.instrument}</span>
                        </button>
                      ))}
                  </div>
                )}

                {screen.kind === "cards" && (
                  <div className="grid" role="group" aria-label={screen.q(ans)}>
                    {Object.entries(screen.opts(ans))
                      .filter(([k]) => !(screen.slot === 1 && ans[screen.key][0] === k))
                      .map(([k, o]) => (
                        <button key={k} className="card" disabled={!!chosen} onClick={() => pick(screen.key, screen.slot, k, screen.single)}
                          style={{ borderColor: chosen === k ? accent : LINE, opacity: chosen && chosen !== k ? 0.22 : 1 }}>
                          <Glyph name={o.glyph || "flat"} color={chosen === k ? accent : ASH} />
                          <span style={{ font: `400 17px/1.3 ${SERIF}`, color: chosen === k ? accent : BONE }}>{o.label}</span>
                          <span style={{ font: `400 12px/1.4 ${SANS}`, color: ASH }}>{o.instrument || o.sound}</span>
                        </button>
                      ))}
                  </div>
                )}

                {screen.none && (
                  <button onClick={skip} disabled={!!chosen}
                    style={{ marginTop: 26, background: "transparent", border: "none", borderBottom: `1px solid ${LINE}`, color: chosen === "__none" ? accent : ASH, opacity: chosen && chosen !== "__none" ? 0.22 : 1, font: `400 14px ${SANS}`, padding: "3px 0", cursor: chosen ? "default" : "pointer" }}>
                    {screen.none}
                  </button>
                )}
              </div>

              {i > 0 && (
                <div style={{ marginTop: 30, opacity: vis.opts && !chosen ? 1 : 0, transition: "opacity .4s ease" }}>
                  <button onClick={back} disabled={!!chosen} style={{ background: "transparent", border: "none", color: ASH, font: `400 13px ${SANS}`, padding: 0, cursor: "pointer" }}>← Back</button>
                </div>
              )}
            </div>
          )}

          {/* ---- read it back, then name it yourself ---- */}
          {phase === "name" && (
            <div>
              <div style={{ font: `500 9.5px ${MONO}`, letterSpacing: "0.18em", color: ASH, marginBottom: 14 }}>
                LAST STEP · READ IT BACK, THEN NAME IT
              </div>
              <h2 ref={headRef} tabIndex={-1} style={{ font: `400 clamp(24px, 5.4vw, 32px)/1.25 ${SERIF}`, margin: "0 0 10px" }}>
                Read that back, slowly.
              </h2>
              <p style={{ font: `400 15px/1.6 ${SANS}`, color: ASH, margin: "0 0 24px", maxWidth: 440 }}>
                Out loud, if you're somewhere you can. Saying it is different from thinking it —
                and check it against your body rather than your head.
              </p>
              <p style={{ font: `400 20px/1.7 ${SERIF}`, margin: "0 0 20px", maxWidth: 540, borderLeft: `2px solid ${accent}`, paddingLeft: 18 }}>{text}</p>

              {notes.length > 0 && (
                <div style={{ marginBottom: 28 }}>
                  <div style={{ font: `500 9.5px ${MONO}`, letterSpacing: "0.16em", color: ASH, marginBottom: 12 }}>
                    YOUR ANSWERS, SIDE BY SIDE
                  </div>
                  {notes.map((n, k) => (
                    <p key={k} style={{ font: `400 16px/1.65 ${SERIF}`, color: BONE, margin: "0 0 12px", maxWidth: 520 }}>{n}</p>
                  ))}
                  <p style={{ font: `400 12.5px/1.6 ${SANS}`, color: ASH, margin: 0, maxWidth: 460 }}>
                    Nothing added and nothing decided. Only what you already said.
                  </p>
                </div>
              )}

              {offer ? (
                <div>
                  <p style={{ font: `400 15px ${SANS}`, color: ASH, margin: "0 0 12px" }}>Which part is off?</p>
                  {FLOW.filter((f) => !f.gentle).map((f) => (
                    <button key={f.id} className="opt" onClick={() => jumpTo(f.id)} style={{ font: `400 16px ${SERIF}` }}>{cap(STAGE[f.id])}</button>
                  ))}
                  <button onClick={() => setOffer(false)} style={{ ...softBtn, marginTop: 22 }}>Never mind, it's close enough</button>
                </div>
              ) : (
                <div>
                  <h3 style={{ font: `400 22px ${SERIF}`, margin: "0 0 8px" }}>Now give it a name.</h3>
                  <p style={{ font: `400 14px/1.6 ${SANS}`, color: ASH, margin: "0 0 14px", maxWidth: 450 }}>
                    It doesn't have to be an emotion word — those are often the worst fit. A colour, a
                    weather, a room, an animal, a line from something. Whatever your body agrees with.
                  </p>
                  <input type="text" value={name} onChange={(e) => setName(e.target.value)} maxLength={60}
                    placeholder="low tide, or wet cement, or Tuesday" aria-label="Name for this feeling"
                    onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) setPhase("result"); }}
                    style={{ width: "100%", background: PANEL, border: `1px solid ${LINE}`, borderRadius: 2, color: BONE, font: `400 20px ${SERIF}`, padding: "15px 16px", boxSizing: "border-box" }} />
                  <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 20 }}>
                    <button onClick={() => setPhase("result")} disabled={!name.trim()}
                      style={{ background: name.trim() ? accent : "transparent", color: name.trim() ? INK : ASH,
                        border: `1px solid ${name.trim() ? accent : LINE}`, borderRadius: 3, font: `600 15px ${SANS}`,
                        padding: "15px 32px", cursor: name.trim() ? "pointer" : "default" }}>
                      Name it
                    </button>
                    <button onClick={() => setPhase("result")} style={softBtn}>Leave it unnamed</button>
                    <button onClick={() => setOffer(true)} style={softBtn}>Something's off</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {phase === "result" && (
            <div>
              <div style={{ font: `500 10px ${MONO}`, letterSpacing: "0.2em", color: accent, marginBottom: 12 }}>
                {name ? "YOU CALLED IT" : "UNNAMED"}
              </div>
              <h2 ref={headRef} tabIndex={-1} style={{ font: `400 clamp(30px, 7.5vw, 48px)/1.1 ${SERIF}`, letterSpacing: "-0.025em", margin: "0 0 22px" }}>
                {name || "Here it is."}
              </h2>
              <p style={{ font: `400 19px/1.7 ${SERIF}`, color: name ? ASH : BONE, margin: "0 0 12px", maxWidth: 540 }}>{text}</p>
              {!silent && (
                <p style={{ font: `400 12.5px ${SANS}`, color: ASH, margin: "0 0 28px" }}>
                  Tap any instrument above to hear just that part on its own.
                </p>
              )}

              <div style={{ display: "flex", gap: 20, flexWrap: "wrap", alignItems: "flex-start", marginBottom: 26 }}>
                <div style={{ flex: "0 0 auto" }}>
                  <canvas ref={sleeveRef} width={432} height={540}
                    style={{ width: 216, height: 270, display: "block", borderRadius: 3, border: `1px solid ${LINE}`, background: PANEL }}
                    aria-label="Cover art for your sound" />
                  <div style={{ font: `500 9px ${MONO}`, letterSpacing: "0.14em", color: ASH, marginTop: 8 }}>
                    {art.state === "loading" ? "FINDING ARTWORK…" : art.state === "fallback" ? "GENERATED SLEEVE" : "SLEEVE"}
                  </div>
                </div>
                <p style={{ flex: "1 1 240px", font: `400 13px/1.7 ${SANS}`, color: ASH, margin: 0 }}>
                  The colour and the artwork both come from your answers. Change any one of them and
                  you get a different sleeve. This is exactly what the video will look like.
                </p>
              </div>

              <div style={{ borderTop: `1px solid ${LINE}`, paddingTop: 22, marginBottom: 18 }}>
                <div style={{ font: `500 9.5px ${MONO}`, letterSpacing: "0.16em", color: ASH, marginBottom: 12 }}>WHAT'S IN THE VIDEO</div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
                  {[[0, "Just the sound"], [1, "Sound and name"], [2, "Sound, name and words"]].map(([lv, lbl]) => (
                    <button key={lv} onClick={() => setLevel(lv)} aria-pressed={level === lv}
                      disabled={lv >= 1 && !name.trim()}
                      style={{ background: level === lv ? accent : "transparent", color: level === lv ? INK : (lv >= 1 && !name.trim() ? LINE : ASH),
                        border: `1px solid ${level === lv ? accent : LINE}`, borderRadius: 2, font: `500 12.5px ${SANS}`,
                        padding: "9px 15px", cursor: lv >= 1 && !name.trim() ? "default" : "pointer" }}>
                      {lbl}
                    </button>
                  ))}
                </div>
                <p style={{ font: `400 12px/1.55 ${SANS}`, color: ASH, margin: 0, maxWidth: 480 }}>
                  {level === 0 && "Artwork and sound only. Nothing written on it."}
                  {level === 1 && "Your name for it, over the artwork."}
                  {level === 2 && "Your name and the whole description — including where in your body it sits, and whose it is."}
                </p>
              </div>

              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
                <button onClick={saveVideo} disabled={job.state === "working" || silent}
                  style={{ flex: "1 1 100%", maxWidth: 430, background: accent, color: INK, border: "none", borderRadius: 3,
                    font: `600 16px ${SANS}`, padding: "18px 26px", cursor: silent ? "default" : "pointer",
                    opacity: silent ? 0.35 : 1, position: "relative", overflow: "hidden" }}>
                  <span style={{ position: "relative", zIndex: 2 }}>
                    {job.state === "working"
                      ? (prog > 0 ? `Recording ${Math.round(prog * 100)}%` : "Getting ready…")
                      : "Download the ten seconds"}
                  </span>
                  {prog > 0 && (
                    <span aria-hidden="true" style={{ position: "absolute", inset: 0, transformOrigin: "left center",
                      transform: `scaleX(${prog})`, background: "rgba(16,20,25,0.24)", zIndex: 1 }} />
                  )}
                </button>
                <button onClick={copyText} style={softBtn}>Copy the words</button>
                <button onClick={() => setPhase("name")} style={softBtn}>{name ? "Rename" : "Name it"}</button>
                {!silent && <button onClick={() => setMuted((m) => !m)} style={softBtn}>{muted ? "Play" : "Pause"}</button>}
                <button onClick={reset} style={softBtn}>Start again</button>
              </div>
              <div role="status" aria-live="polite" style={{ font: `400 12px ${SANS}`, color: job.state === "error" ? RED : ASH, minHeight: 18, marginBottom: 26 }}>
                {job.msg || "One MP4, ten seconds, a single pass of your loop — it ends on the same warm send-off you just heard. Yours — send it to someone or don't."}
              </div>

              <p style={{ font: `400 12.5px/1.6 ${SANS}`, color: ASH, maxWidth: 480, margin: 0 }}>
                Nothing here is a diagnosis, and nothing here decided what you feel — you did, one
                answer at a time, right down to the name. If what you're carrying feels bigger than
                ten seconds, it's worth saying out loud to someone you trust.
              </p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
