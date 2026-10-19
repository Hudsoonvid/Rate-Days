# RateDays

**Rate your life like a series. Every day is an episode.**

RateDays is a mobile-first web app (installable on your phone's home screen) where you rate each day from 0 to 10. Every month becomes a *season*, every day an *episode*, the people you spend time with become your *cast* — and the app shows you what actually makes your days better.

Everything is stored on your device (IndexedDB). There's no account and no server.

## Features

| Screen | What it does |
| --- | --- |
| **Home** | Your series poster, year average, and the season × episode grid (Jan = S1, the 14th = E14), colour-coded Awesome → Garbage. Switch between the detailed grid, a compact whole-year view, or an episode list. |
| **Day Summary** | Photo (or generated poster), rating, title, notes, characters, tags and location. Tap the sides of the photo to flip to the previous / next episode. |
| **New / Edit Episode** | Rating slider with quick presets, title, notes, photo, cast, tags (create your own with emoji + genre), and places (search OpenStreetMap or pin your current location). |
| **Stats** | Highest-average month and weekday, consistency (average day-to-day swing), great-day streak, longest tough stretch, rating distribution, average by weekday, histogram, season-by-season trend, top and lowest rated days, top genres. |
| **Tag Impact** | *Levers* (tags that lift your day), *Trade-offs* (great today, costly tomorrow — the next day is compared with a typical day of that weekday), *Drains*, and tags that are *too early to call*. One tap turns a lever into a weekly habit. |
| **Character Rankings** | Who your best days are spent with, plus each person's *lifeline* across the year next to your own average. |
| **Locations** | Map of your places with their average rating, best places, and each place's impact vs your average. |
| **Season Goal** | Pick goals (build strength, sleep deeper, manage money…) and weekly commitments. Commitments tick themselves when you tag a day, and the results compare days you did it with days you didn't. |
| **Search** | Find any day by person, place, note text, tag, title or date ("jul 12", "2026-03", "friday"). |
| **Season Finales** | Story-style monthly recap: your season in colours, top and lowest episodes, top genres, the cast, and a narrated recap. |
| **The Narrator's Cut** | Week / season / year recaps. Works offline with a built-in narrator; add your own Anthropic API key in Settings to have Claude write them. |
| **Settings** | Profile and poster, API key, export / import a JSON backup, load a demo year, erase everything. |

New here? Choose **Explore with a demo year** on the welcome screen to see every screen filled in, then **Settings → Erase everything** when you're ready to start your own story.

## Run it locally

Requires Node 20+.

```bash
npm install
npm run dev        # http://localhost:5173
npm test           # unit tests for the analytics, narrator, search and backups
npm run build      # production build in dist/
```

To try it on your phone over Wi-Fi: `npm run dev -- --host` and open the printed network URL. (Installing as an app and offline mode need HTTPS, so use a deployed copy for that.)

## Put it on your phone

1. Deploy it (see below) and open the URL in Safari on iPhone.
2. Tap **Share → Add to Home Screen**.
3. It opens full-screen like a native app and works offline.

### Deploy to GitHub Pages

The workflow in `.github/workflows/deploy.yml` builds and publishes on every push to `main`. One-time setup: **Settings → Pages → Build and deployment → Source: GitHub Actions**. The app will be at `https://<your-username>.github.io/<repo-name>/`.

The build uses relative paths and hash routing, so `dist/` also works on any static host (Netlify, Vercel, Cloudflare Pages, S3…) with no extra configuration.

## AI recaps with Claude

The Narrator's Cut writes recaps locally by default. For AI-written recaps, add an [Anthropic API key](https://console.anthropic.com/settings/keys) in **Settings → AI narrator**.

- Calls go straight from your browser to `api.anthropic.com` using the official `@anthropic-ai/sdk` (loaded only when you ask for a recap), with the model `claude-opus-5-5`.
- The prompt contains only the episodes in the period you're recapping. Claude writes the prose; episode titles, dates and ratings come straight from your data.
- Server-side refusal fallback is turned on (`fallbacks: "default"`), so if a safety check declines a request it's retried on a fallback model.
- Recaps are cached on the device, so each one costs a single request until you choose **Rewrite**.
- Your key is stored only on this device and is never written into backups. Because the key lives in the browser, use a key you're comfortable keeping on your phone and set a spending limit on it.

## How the numbers work

- **Rating tiers:** 9+ Awesome · 8+ Great · 7+ Good · 5+ Average · 3+ Bad · under 3 Garbage.
- **Consistency** = 100% − 20% × the average change between back-to-back rated days.
- **Streaks** count consecutive calendar days, so a missing day breaks a streak.
- **Tag impact** compares the average of days with a tag against your overall average. A tag needs 4 days before it's called. It's a *trade-off* when it lifts the day but the following day comes in at least 0.7 below a typical day of that weekday.

## Project layout

```
src/
  lib/          data model, IndexedDB persistence, analytics, narrator, Claude client, demo data
  components/   shared UI and SVG charts
  screens/      one file per screen
public/         PWA manifest, service worker, icons
```
