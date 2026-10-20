# RateDays

**Rate your life like a series. Every day is an episode.**

RateDays is a mobile-first web app (installable on your phone's home screen) where you rate each day from 0 to 10. Every day is an *episode*, every month (or, in school-year mode, every semester) is a *season*, the people you spend time with become your *cast* — and the app shows you what actually makes your days better.

Your series premieres on your first episode: that day is **S1 E1**, Season 1 runs to the end of that month (or semester), and every month after that is the next season — Season 2, Season 3, and so on, without resetting in January.

Everything is stored on your device (IndexedDB). There's no account and no server.

## Features

| Screen | What it does |
| --- | --- |
| **Home** | Your series poster, year average, and the month × day grid with each month's season number, colour-coded Awesome → Garbage. In school-year mode the grid runs August → July with Fall / Spring / Summer bands. Switch between the detailed grid, a compact whole-year view, or an episode list grouped by season. |
| **Day Summary** | Photo (or generated poster), rating, title, notes, characters, tags and location. Tap the sides of the photo to flip to the previous / next episode. |
| **New / Edit Episode** | Rating slider with quick presets, title, notes, photo, cast, tags (create your own with emoji + genre), and places (search OpenStreetMap or pin your current location). |
| **Stats** | Highest-average month and weekday, consistency (average day-to-day swing), great-day streak, longest tough stretch, rating distribution, average by weekday, histogram, season-by-season trend, top and lowest rated days, top genres. |
| **Tag Impact** | *Levers* (tags that lift your day), *Trade-offs* (great today, costly tomorrow — the next day is compared with a typical day of that weekday), *Drains*, and tags that are *too early to call*. One tap turns a lever into a weekly habit. |
| **Character Rankings** | Who your best days are spent with, plus each person's *lifeline* across the year next to your own average. |
| **Locations** | Map of your places with their average rating, best places, and each place's impact vs your average. |
| **Season Goal** | Pick goals (build strength, sleep deeper, manage money…) and weekly commitments. Commitments tick themselves when you tag a day, and the results compare days you did it with days you didn't. |
| **Search** | Find any day by person, place, note text, tag, title or date ("jul 12", "2026-03", "friday"). |
| **Season Finales** | Story-style recap of each season: your season in colours (a month calendar, or a week-by-week heatmap for a semester), top and lowest episodes, top genres, the cast, and a narrated recap. |
| **The Narrator's Cut** | Week / season / year recaps. Works offline with a built-in narrator, or tap **Write with AI** once you've connected an AI running on your own computer (see below). |
| **Settings** | Profile and poster, seasons (months or school year), Connect to AI, export / import a JSON backup, load a demo year, erase everything. |

### School-year mode

**Settings → Seasons → School year** (or tick *I'm a student* when you start) makes each semester a season: **Fall** (August–December), **Spring** (January–May) and **Summer break** in between. You can move the start of Fall (July / August / September) and the end of Spring (April / May / June). Years become school years (2026–27), and Stats gets a semester-vs-semester card.

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

## Connect to AI

The Narrator's Cut can have an AI write your recaps. The AI runs on your own computer — a Linux box (e.g. Ubuntu Server) or Windows PC with a decent graphics card, like a gaming laptop. When you tap **Write with AI**, the app sends that period's episodes to the AI on your computer, it writes the recap, and the recap comes back to the app and is saved on your phone. Nothing goes to a third party and there's nothing to pay for.

**Setup (once, about 10 minutes):**

1. Install **[Tailscale](https://tailscale.com/download)** on your phone (and sign in). It's free, and gives the computer a private `https://` address your phone can reach from anywhere.
2. On the computer, run the setup:

   **Linux / Ubuntu Server** (in a terminal or over SSH):

   ```bash
   curl -fsSL https://raw.githubusercontent.com/Hudsoonvid/Rate-Days/main/ai/setup.sh | sudo bash
   ```

   **Windows** (in PowerShell; install Tailscale on the PC first):

   ```powershell
   irm https://raw.githubusercontent.com/Hudsoonvid/Rate-Days/main/ai/setup.ps1 | iex
   ```

   It installs [Ollama](https://ollama.com) (on Linux as a system service that starts on boot), lets the RateDays site talk to it, downloads a good AI model (about 5 GB) and prints your **AI address**. On Linux it also installs Tailscale and, the first time, prints a link to sign the machine in — open it on your phone and use the same account. If Tailscale asks you to turn on HTTPS, follow the link it shows and run the command again.
3. On your phone: **Settings → Connect to AI** → paste the address → **Connect**. Connect sends the AI a real test request, so *Connected* means it answered.

Then open the Narrator's Cut and tap **Write with AI**.

Good to know:

- The computer needs to be on and awake when you ask for a recap. Saved recaps stay on your phone.
- On a Linux machine with an NVIDIA GPU, the setup warns you if the graphics driver is missing (fix: `sudo ubuntu-drivers install && sudo reboot`, then run the setup again) — without it the AI still works, just slowly.
- The first recap after the PC wakes up takes longer while the model loads.
- The app picks the model automatically from what's installed. Advanced: to use a different one, pass `RATEDAYS_MODEL` (Linux: `curl -fsSL …/setup.sh | sudo RATEDAYS_MODEL=qwen2.5:14b bash`; Windows: `$env:RATEDAYS_MODEL = "qwen2.5:14b"` first). If you host the site somewhere other than `hudsoonvid.github.io`, set `RATEDAYS_SITE` to its address the same way.
- Any OpenAI-compatible server works (e.g. LM Studio with CORS enabled, behind `tailscale serve`).
- Long periods (a whole semester or year) are sent as highlights plus monthly averages, so the AI stays fast.
- **Couldn't reach the AI** → check the computer is on, Tailscale is connected on the phone, and Ollama is running (Linux: `systemctl status ollama`; Windows: it starts with Windows). **403** → run the setup command again.

## How the numbers work

- **Seasons** are numbered from the season of your earliest episode. If you later back-fill an earlier day, the series starts there instead and the seasons renumber.
- **Rating tiers:** 9+ Awesome · 8+ Great · 7+ Good · 5+ Average · 3+ Bad · under 3 Garbage.
- **Consistency** = 100% − 20% × the average change between back-to-back rated days.
- **Streaks** count consecutive calendar days, so a missing day breaks a streak.
- **Tag impact** compares the average of days with a tag against your overall average. A tag needs 4 days before it's called. It's a *trade-off* when it lifts the day but the following day comes in at least 0.7 below a typical day of that weekday.

## Project layout

```
src/
  lib/          data model, IndexedDB persistence, seasons, analytics, narrator, AI client, demo data
  components/   shared UI and SVG charts
  screens/      one file per screen
public/         PWA manifest, service worker, icons
ai/             one-command setup (Linux and Windows) that turns a computer into the app's AI
```
