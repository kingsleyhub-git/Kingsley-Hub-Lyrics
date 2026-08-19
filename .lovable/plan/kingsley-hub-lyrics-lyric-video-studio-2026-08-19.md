# Kingsley Hub Lyrics — lyric video studio

A branded web app where you upload a song, import lyrics from a Word document, tap-sync each line to the beat, preview an animated theme, and download the finished lyric video.

## Brand

Gold-on-deep-navy identity taken from the uploaded logo: gold (#E8B93B / #F5D779 gradients), deep navy (#0A1024), royal blue accent (#1E5FCB). Logo used in the app header, on the video's intro/outro card, and as the favicon.

## Main flows

1. **Sign in** — email/password accounts so projects, audio and lyrics are saved in the cloud and resumable on any device.
2. **New project** — name the track, artist, upload the audio file (mp3/wav/m4a).
3. **Import lyrics** — upload a .docx and the app extracts the text, one line per lyric line. Manual paste/typing also supported. A line editor lets you add, delete, reorder, split and merge lines, and mark a line as a section break (e.g. Chorus) or an instrumental gap.
4. **Tap-sync** — play the audio; press Space (or click) to stamp the start time of the current line. A waveform-style timeline shows the stamped lines; each timestamp can be nudged, retimed, or re-tapped for a single line without redoing the song.
5. **Customize** — theme picker (see below), plus per-project controls: font choice, text size, text colour/gradient, line reveal animation (fade, slide-up, word-by-word wipe, scale-pop), show/hide the next line preview, background image or looping video option, logo watermark position, intro card (title + artist) and outro card.
6. **Preview** — full-screen preview plays the audio with the live-rendered animation, scrubbable, so you can check sync before exporting.
7. **Export** — renders in the browser and downloads a video file with the audio muxed in. Choice of 720p or 1080p, 30fps, 16:9 (plus 9:16 vertical for shorts/reels). A progress bar shows render status; the finished file also gets stored on the project so it can be re-downloaded.

## Themes

Ships with one fully-built launch theme, **Kingsley Gold** — deep navy backdrop, slow-drifting gold particles, a soft rotating light sweep, subtle blue wave motion echoing the logo, and gold gradient lyric text. It is built on a theme interface so more themes can be dropped in later without touching the rest of the app; the theme picker is present from day one and shows live animated thumbnails.

## Technical notes

- **Stack**: TanStack Start + React, Tailwind, Lovable Cloud (auth, Postgres, storage).
- **Data**: `projects` (title, artist, aspect, theme id, style settings JSON, audio path, duration), `lyric_lines` (project id, order, text, start ms, end ms, type), `renders` (project id, storage path, resolution, status). RLS scoped to the owner; private storage buckets for audio and rendered video with owner-scoped policies and signed URLs.
- **DOCX parsing**: done client-side by unzipping the .docx and reading `word/document.xml` paragraph text — no server dependency, no upload of the document needed.
- **Rendering engine**: a single Canvas 2D draw function, `drawFrame(ctx, timeMs, lines, theme, style)`, used by both the live preview (requestAnimationFrame) and the exporter. This guarantees the preview matches the export exactly.
- **Export**: `canvas.captureStream()` + the decoded audio track fed through `MediaRecorder`, producing a WebM (VP9/Opus) download; where the browser supports it, MP4/H.264 is used instead. Export runs in real time in the tab, so the page warns not to switch away mid-render.
- **Tap-sync accuracy**: timestamps come from the `AudioContext` clock, not `Date.now()`, to avoid drift.

## Out of scope for this build

Automatic AI lyric alignment, multi-user collaboration, and server-side/faster-than-realtime rendering. All three can be added later on top of the same data model.
