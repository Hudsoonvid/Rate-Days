import { CalendarDays, ChevronLeft, ChevronRight, Grid2x2, Grid3x3, Info, List, Pencil, Share } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader, Dialog, Legend, RatingBadge, Ring, useToast } from "../components/ui";
import { DEFAULT_COVER } from "../lib/coverArt";
import { daysInMonth, formatShort, monthLabel, MONTHS_SHORT, WEEKDAYS, weekdayIndex, yearOf } from "../lib/dates";
import { weekCount } from "../lib/goals";
import { readPref, writePref } from "../lib/prefs";
import { colorFor, fmt, tierFor } from "../lib/ratings";
import { navigate } from "../lib/router";
import { average, byMonth, sortedDays, topDays } from "../lib/stats";
import { useStore } from "../lib/store";
import type { Day, GridView } from "../lib/types";

const VIEWS = ["grid", "compact", "list"] as const;
let rememberedYear: number | null = null;

export function Home() {
  const { data, today } = useStore();
  const toast = useToast();
  const [year, setYearState] = useState(() => rememberedYear ?? yearOf(today));
  const [view, setViewState] = useState<GridView>(() => readPref("view", "grid", VIEWS));
  const [about, setAbout] = useState(false);

  const setYear = (y: number) => {
    rememberedYear = y;
    setYearState(y);
  };
  const setView = (v: GridView) => {
    writePref("view", v);
    setViewState(v);
  };

  const all = useMemo(() => sortedDays(data.days), [data.days]);
  const yearDays = useMemo(() => all.filter((d) => yearOf(d.date) === year), [all, year]);
  const years = useMemo(() => {
    const set = new Set(all.map((d) => yearOf(d.date)));
    set.add(yearOf(today));
    return [...set].sort();
  }, [all, today]);
  const avg = average(yearDays);
  const { profile } = data;
  const storyTitle = profile.storyTitle || (profile.name ? `${profile.name}'s Story` : "My Story");

  const share = async () => {
    const best = topDays(yearDays, 1)[0];
    const text = yearDays.length
      ? `${storyTitle} — ${year}: ${fmt(avg)}/10 across ${yearDays.length} episodes.${best ? ` Best episode: “${best.title || formatShort(best.date)}” (${fmt(best.rating)}).` : ""} Rated with RateDays.`
      : `${storyTitle} — every day is an episode. Rated with RateDays.`;
    try {
      if (navigator.share) await navigator.share({ title: storyTitle, text });
      else {
        await navigator.clipboard.writeText(text);
        toast("Copied to clipboard");
      }
    } catch {
      // User dismissed the share sheet.
    }
  };

  return (
    <div className="app">
      <AppHeader />

      <section className="profile-card">
        <button className="info-btn" onClick={() => setAbout(true)} aria-label="How it works">
          <Info size={20} />
        </button>
        <img className="cover" src={profile.cover || DEFAULT_COVER} alt="" />
        <div className="profile-meta">
          <div className="score">
            <span style={{ color: "#f7c948" }}>★</span>
            <span className="tabular">{yearDays.length ? `${fmt(avg)}/10` : "–/10"}</span>
            <span className="muted">({yearDays.length} rating{yearDays.length === 1 ? "" : "s"})</span>
          </div>
          <div className="story-title">{storyTitle}</div>
          <div className="year">{year}</div>
          {profile.tagline && <div className="tagline">{profile.tagline}</div>}
          <div className="profile-actions">
            <button className="share" onClick={share}>
              <Share size={17} /> Share
            </button>
            <button className="edit" onClick={() => navigate("/profile")}>
              <Pencil size={16} /> Edit Profile
            </button>
          </div>
        </div>
      </section>

      <TodayPrompt />
      <WeekCommitments />

      <div style={{ marginTop: 18 }}>
        <Legend />
      </div>

      <div className="year-bar">
        <div className="year-picker">
          <CalendarDays size={22} className="muted" style={{ marginRight: 6 }} />
          <button className="icon-btn" onClick={() => setYear(year - 1)} aria-label="Previous year" disabled={year <= years[0]}>
            <ChevronLeft size={20} />
          </button>
          <span className="tabular">{year}</span>
          <button className="icon-btn" onClick={() => setYear(year + 1)} aria-label="Next year" disabled={year >= years[years.length - 1]}>
            <ChevronRight size={20} />
          </button>
        </div>
        <div className="view-toggles" role="group" aria-label="Layout">
          <button aria-pressed={view === "grid"} onClick={() => setView("grid")} aria-label="Detailed grid">
            <Grid3x3 size={22} />
          </button>
          <button aria-pressed={view === "compact"} onClick={() => setView("compact")} aria-label="Compact grid">
            <Grid2x2 size={22} />
          </button>
          <button aria-pressed={view === "list"} onClick={() => setView("list")} aria-label="List">
            <List size={22} />
          </button>
        </div>
      </div>

      {view === "list" ? <EpisodeList days={yearDays} /> : <YearGrid year={year} compact={view === "compact"} />}

      <Dialog open={about} onClose={() => setAbout(false)}>
        <h2 className="h2">Your life, as a series</h2>
        <p className="muted" style={{ lineHeight: 1.5 }}>
          Every day is an <b style={{ color: "#fff" }}>episode</b> you rate from 0 to 10. Every month is a <b style={{ color: "#fff" }}>season</b> — S1 is
          January, E14 is the 14th. Add the people (your cast), places and tags, and RateDays shows what lifts your days and what drags them down.
        </p>
        <Legend />
        <p className="small muted" style={{ marginTop: 16 }}>
          9+ Awesome · 8+ Great · 7+ Good · 5+ Average · 3+ Bad · under 3 Garbage
        </p>
        <button className="btn block" style={{ marginTop: 10 }} onClick={() => setAbout(false)}>
          Got it
        </button>
      </Dialog>
    </div>
  );
}

function TodayPrompt() {
  const { data, today } = useStore();
  if (data.days[today]) return null;
  return (
    <button className="list-row" style={{ marginTop: 16, background: "linear-gradient(90deg, rgba(247,165,49,0.18), rgba(111,91,255,0.14))" }} onClick={() => navigate("/edit/today")}>
      <span style={{ fontSize: 26 }}>🎬</span>
      <span className="grow">
        <b>Tonight's episode</b>
        <div className="small muted">How was {WEEKDAYS[weekdayIndex(today)]}? Rate it before the credits roll.</div>
      </span>
      <span className="pill-btn">Rate</span>
    </button>
  );
}

function WeekCommitments() {
  const { data, today } = useStore();
  const list = data.goals.commitments;
  if (!list.length) return null;
  return (
    <button className="card tight" style={{ width: "100%", marginTop: 12, textAlign: "left" }} onClick={() => navigate("/goals")}>
      <div className="row between" style={{ marginBottom: 10 }}>
        <span className="eyebrow">This week</span>
        <ChevronRight size={18} className="dim" />
      </div>
      <div className="row" style={{ gap: 14, overflowX: "auto" }}>
        {list.map((c) => {
          const n = weekCount(data.days, c, today);
          const tag = data.tags.find((t) => t.id === c.tagId);
          const color = n >= c.perWeek ? "#4ade80" : "#f7a531";
          return (
            <div key={c.id} className="col" style={{ alignItems: "center", gap: 4, minWidth: 56 }}>
              <Ring value={n} max={c.perWeek} color={color} size={44}>
                <span style={{ fontSize: 18 }}>{tag?.emoji ?? "⭐"}</span>
              </Ring>
              <span className="tiny muted tabular">
                {n}/{c.perWeek}
              </span>
            </div>
          );
        })}
      </div>
    </button>
  );
}

function YearGrid({ year, compact }: { year: number; compact: boolean }) {
  const { data, today } = useStore();
  const scroller = useRef<HTMLDivElement>(null);
  const cellW = compact ? 0 : 44;

  useEffect(() => {
    // Bring the current season into view.
    const el = scroller.current;
    if (!el || compact) return;
    const month = yearOf(today) === year ? Number(today.slice(5, 7)) - 1 : 0;
    el.scrollLeft = Math.max(0, (month - 4) * (cellW + 4));
  }, [year, compact, today, cellW]);

  const open = (date: string) => {
    if (data.days[date]) navigate(`/day/${date}`);
    else if (date <= today) navigate(`/edit/${date}`);
  };

  const columns = compact ? `20px repeat(12, minmax(0, 1fr))` : `26px repeat(12, ${cellW}px)`;
  const cells: JSX.Element[] = [<span key="corner" className="corner" />];
  for (let m = 0; m < 12; m++) {
    cells.push(
      <span key={`h${m}`} className="head">
        <b>{compact ? MONTHS_SHORT[m][0] : MONTHS_SHORT[m]}</b>
        {!compact && <small>S{m + 1}</small>}
      </span>,
    );
  }
  for (let d = 1; d <= 31; d++) {
    cells.push(
      <span key={`r${d}`} className="label row-label">
        {compact ? (d % 5 === 0 || d === 1 ? d : "") : `E${d}`}
      </span>,
    );
    for (let m = 0; m < 12; m++) {
      const key = `${m}-${d}`;
      if (d > daysInMonth(year, m)) {
        cells.push(<span key={key} className="cell none" />);
        continue;
      }
      const date = `${year}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const day = data.days[date];
      if (day) {
        const t = tierFor(day.rating);
        cells.push(
          <button key={key} className="cell" style={{ background: t.color, color: t.ink }} onClick={() => open(date)} aria-label={`${date}: ${fmt(day.rating)}`}>
            {fmt(day.rating)}
          </button>,
        );
      } else {
        const cls = date === today ? "cell today" : date > today ? "cell future" : "cell unrated";
        cells.push(<button key={key} className={cls} onClick={() => open(date)} aria-label={`${date}: not rated`} disabled={date > today} />);
      }
    }
  }

  return (
    <div className="grid-scroll" ref={scroller}>
      <div className={`year-grid${compact ? " compact" : ""}`} style={{ gridTemplateColumns: columns }}>
        {cells}
      </div>
    </div>
  );
}

function EpisodeList({ days }: { days: Day[] }) {
  const { data } = useStore();
  const months = byMonth(days).reverse();
  if (!days.length) {
    return (
      <div className="empty">
        <div className="emoji">🍿</div>No episodes this year yet.
      </div>
    );
  }
  const tags = new Map(data.tags.map((t) => [t.id, t]));
  return (
    <div className="episode-list">
      {months.map((m) => {
        const list = days.filter((d) => d.date.startsWith(m.key)).reverse();
        return (
          <div key={m.key}>
            <div className="season-head">
              <b>
                S{Number(m.key.slice(5, 7))} · {monthLabel(m.key)}
              </b>
              <span className="small tabular" style={{ color: colorFor(m.avg) }}>
                {fmt(m.avg)} avg
              </span>
            </div>
            {list.map((d) => (
              <button key={d.date} className="list-row" onClick={() => navigate(`/day/${d.date}`)}>
                <RatingBadge rating={d.rating} size={42} />
                <span className="grow">
                  <div className="ellipsis" style={{ fontWeight: 600 }}>
                    {d.title || "Untitled episode"}
                  </div>
                  <div className="small muted ellipsis">
                    E{Number(d.date.slice(8))} · {formatShort(d.date)} {d.tags.slice(0, 4).map((id) => tags.get(id)?.emoji).join(" ")}
                  </div>
                </span>
                <ChevronRight size={18} className="chev" />
              </button>
            ))}
          </div>
        );
      })}
    </div>
  );
}
