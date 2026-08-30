# Ten seconds of it

Slow questions about a feeling you can't name. Every answer adds an instrument
to a ten-second loop that plays while you answer. At the end you read your own
words back, name the thing yourself, and download one MP4.

Nothing is stored. There is no account, no database, no analytics, and no
sharing service — the video is the only thing that leaves the browser, and only
because you saved it.

## Run it

```bash
npm install
npm run dev
```

## Deploy to Vercel

The project is a static Vite build with no server side, so deployment is the
default path:

```bash
npm i -g vercel
vercel
```

Or connect the repository in the Vercel dashboard. It will detect Vite and use
`vercel.json` as-is — build `npm run build`, output `dist`. No environment
variables are required.

## How it works

| File | What's in it |
|---|---|
| `src/App.jsx` | Everything: the answer model, the synthesis, the artwork, the UI |
| `src/main.jsx` | Mount point. Deliberately no `StrictMode` — see the comment there |
| `index.html` | Shell, base styles, metadata |
| `vite.config.js` | Vite + the React plugin, nothing else |
| `vercel.json` | Build config and headers |

### The sound

Fixed 96bpm, four bars, which is exactly ten seconds. Body location picks the
sustained instrument — cello, reed, double bass, glass harmonica, brushes,
harmonium. The impulse question picks a played one — hand drum, shaker, harp,
marimba, woodblock, muted string. Everything else bends those: the quality
sliders drive EQ tilt, saturation, filter resonance and tremolo live; valence
sets the chord mode; agency sets stereo position; time adds delay or a rising
sweep; control decides whether the bass makes a cadence at the end of each pass
or never resolves.

Rebuilding on each answer restarts the loop from the top, so you hear the new
instrument arrive.

The rhythms are humanized — every hit lands a few milliseconds early or late
and never twice at the same weight, the pitched instruments respond to the
step velocities, and the motion slider adds a touch of swing on top of the
tremolo it already drives.

### The send-off

The loop itself only resolves if you said there was something you could do.
But the last two seconds of the recording always land: a short rolled phrase —
root, fifth, octave, and a colour tone picked by valence (a major third if it
was good, an add9 if it wasn't, the minor third turning major if it was both) —
played on a soft bell into the same reverb, with the root underneath. Naming
the thing is itself an act, so the send-off plays once when the feeling gets
its name, and again at the end of the video, so it leaves settled. Its roll
speed follows the motion slider and its weight follows intensity.

### The video

Recorded live with `MediaRecorder` from a 1080×1350 canvas plus the audio bus.
MP4 is preferred and WebM is the fallback, and the app probes the encoder with a
throwaway clip first because `isTypeSupported` is unreliable. Exactly one pass,
ten seconds.

### The artwork

Seeded by the answers, so a given feeling always produces the same sleeve and a
different one always produces a different sleeve. A grayscale photo from
picsum.photos is duotoned past literalness — deliberately, so a random image can
never read as a literal comment on what someone wrote. If the request fails the
app generates the sleeve locally instead.

## Known limits

- Recording happens in real time, so saving takes ten seconds with the tab in
  front. Server-side `ffmpeg` would remove that wait.
- iOS Safari sometimes drops the audio track from canvas recordings. Test on a
  real device.
- Major/minor as good/bad is a Western listening convention and will not carry
  everywhere.
- The contradiction lines on the read-back screen are hand-written and have not
  been tested on real users. They are the first thing to validate.
