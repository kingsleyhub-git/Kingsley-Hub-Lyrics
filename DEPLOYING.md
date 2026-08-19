# Deploying Kingsley Hub Lyrics to Vercel

## Vercel project settings

- Framework preset: **Other**
- Build command: `npm run build` (or `bun run build`)
- Output directory: leave empty — the build emits Vercel's Build Output API to `.vercel/output`
- Install command: default

## Required environment variables

`.env` is not committed, so these must be added in Vercel → Settings → Environment
Variables for **Production**, **Preview** and **Development**:

| Name | Value |
| --- | --- |
| `VITE_SUPABASE_URL` | your backend URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | your publishable key |
| `VITE_SUPABASE_PROJECT_ID` | your project id |
| `SUPABASE_URL` | same as `VITE_SUPABASE_URL` (used during SSR) |
| `SUPABASE_PUBLISHABLE_KEY` | same as `VITE_SUPABASE_PUBLISHABLE_KEY` |

Without them the app throws `Missing Supabase environment variable(s)` on first render.

## Auth redirect URLs

Add the Vercel domain(s) to the backend auth settings as allowed redirect URLs,
otherwise Google / email sign-in bounces back to the preview domain.

## Notes

- Brand images are bundled from `src/assets`, so they are served by Vercel directly.
- Video export runs entirely in the browser (Canvas + MediaRecorder); no server rendering
  is required on Vercel.
