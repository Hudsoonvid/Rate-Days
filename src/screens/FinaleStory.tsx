import { RotateCcw, Star, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Avatar, RatingBadge } from "../components/ui";
import { addDays, daysBetween, daysInMonth, formatMonthDay, MONTHS_SHORT, startOfWeek, WEEKDAYS_SHORT, weekdayIndex } from "../lib/dates";
import { gatherFacts, localRecap, type RecapContent } from "../lib/narrator";
import { periodContaining } from "../lib/periods";
import { GENRE_COLORS } from "../lib/presets";
import { fmt, tierFor } from "../lib/ratings";
import { back, navigate } from "../lib/router";
import { episodeLabel, seasonOf, type Season } from "../lib/seasons";
import { genreShares, inRange, personStats, sortedDays, topDays } from "../lib/stats";
import { useStore } from "../lib/store";
import type { Day } from "../lib/types";

const SLIDE_MS = 6500;

/** `anchor` is any date in the season (older links pass just "YYYY-MM"). */
export function FinaleStory({ anchor }: { anchor: string }) {
  const { data, series } = useStore();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const date = /^\d{4}-\d{2}$/.test(anchor) ? `${anchor}-01` : anchor;
  const season = seasonOf(date, series);
  const all = useMemo(() => sortedDays(data.days), [data.days]);
  const days = useMemo(() => inRange(all, season.start, season.end), [all, season.start, season.end]);
  const period = periodContaining("season", date, series);
  const facts = useMemo(() => gatherFacts(data, period), [data, period.key, series]);
  const cached = data.recaps[period.key];
  let recap: RecapContent = localRecap(facts);
  if (cached) {
    try {
      recap = JSON.parse(cached.text) as RecapContent;
    } catch {
      // Use the local recap.
    }
  }

  const nextSeason = useMemo(() => {
    const later = all.find((d) => d.date > season.end);
    return later ? seasonOf(later.date, series) : null;
  }, [all, season.end, series]);

  const slides: ReactNode[] = [];
  if (days.length) {
    const avgTier = tierFor(facts.avg);
    slides.push(
      <div className="center" key="cover">
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Season finale
        </div>
        <div className="headline gradient-text" style={{ fontSize: 56 }}>
          {season.label}
        </div>
        <div className="h2" style={{ marginTop: 10 }}>
          {season.name}
        </div>
        <div style={{ margin: "34px auto 12px", width: "fit-content" }}>
          <RatingBadge rating={facts.avg} size={120} />
        </div>
        <div className="h3" style={{ color: avgTier.color }}>
          {avgTier.label} season
        </div>
        <div className="muted" style={{ marginTop: 6 }}>
          {days.length} episode{days.length === 1 ? "" : "s"} rated
        </div>
      </div>,
    );

    slides.push(
      <div key="colors">
        <div className="small muted center">{season.name}</div>
        <h2 className="h2 center" style={{ letterSpacing: "0.08em", textTransform: "uppercase", margin: "6px 0 22px" }}>
          Your {season.noun} in colors
        </h2>
        {season.kind === "month" ? <MonthSquares season={season} byDate={data.days} /> : <SemesterHeatmap season={season} byDate={data.days} />}
        <p className="small muted center" style={{ marginTop: 18 }}>
          Each square is one episode.
        </p>
      </div>,
    );

    const ranked = (title: string, icon: ReactNode, list: typeof days) => (
      <div key={title}>
        <h2 className="section-title">
          {icon} {title}
        </h2>
        {list.map((d, i) => (
          <div key={d.date} className="rank-row" style={{ borderRightColor: tierFor(d.rating).color }}>
            <span className="rank-num">#{i + 1}</span>
            <span className="grow">
              <div className="ellipsis" style={{ fontWeight: 600 }}>
                {d.title || "Untitled episode"}
              </div>
              <div className="small muted">
                {episodeLabel(d.date, series)} ({formatMonthDay(d.date)})
              </div>
            </span>
            <span className="score-star">
              <Star size={15} fill={tierFor(d.rating).color} color={tierFor(d.rating).color} /> {fmt(d.rating)}
            </span>
          </div>
        ))}
      </div>
    );
    slides.push(ranked("Top Rated Days", <Star size={20} color="#f7c948" fill="#f7c948" />, topDays(days, 5, "best")));
    if (days.length > 5) slides.push(ranked("Lowest Rated Days", <TriangleAlert size={20} color="#ff5a4f" />, topDays(days, 5, "worst")));

    const genres = genreShares(days, data.tags).slice(0, 5);
    if (genres.length) {
      slides.push(
        <div key="genres">
          <h2 className="section-title">
            <Star size={20} color="#f7c948" fill="#f7c948" /> Top Genres
          </h2>
          {genres.map((g, i) => (
            <div key={g.genre} className="rank-row">
              <span className="rank-num">#{i + 1}</span>
              <i className="dot" style={{ background: GENRE_COLORS[g.genre] ?? GENRE_COLORS.Other }} />
              <span className="grow" style={{ fontWeight: 600 }}>
                {g.genre}
              </span>
              <span className="small" style={{ textAlign: "right" }}>
                <b>{g.count} days</b>
                <div className="muted tiny">{g.percent}%</div>
              </span>
            </div>
          ))}
        </div>,
      );
    }

    const cast = personStats(data.people, days).sort((a, b) => b.count - a.count || b.avg - a.avg).slice(0, 5);
    if (cast.length) {
      slides.push(
        <div key="cast">
          <h2 className="section-title">🎭 Starring</h2>
          {cast.map((c) => (
            <div key={c.item.id} className="rank-row" style={{ borderRightColor: tierFor(c.avg).color }}>
              <Avatar name={c.item.name} large />
              <span className="grow">
                <div style={{ fontWeight: 600 }}>{c.item.name}</div>
                <div className="small muted">
                  {c.count} episode{c.count === 1 ? "" : "s"}
                </div>
              </span>
              <span className="score-star">
                <Star size={15} fill={tierFor(c.avg).color} color={tierFor(c.avg).color} /> {fmt(c.avg)}
              </span>
            </div>
          ))}
        </div>,
      );
    }

    slides.push(
      <div key="recap" className="recap-card" style={{ marginTop: 0 }}>
        <div className="eyebrow">Previously on {data.profile.storyTitle || "your story"}…</div>
        <p className="logline">{recap.logline}</p>
        <hr />
        {recap.paragraphs.slice(0, 3).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p style={{ fontStyle: "italic" }}>{recap.closing}</p>
      </div>,
    );
  }

  slides.push(
    <div key="end" className="center">
      <div style={{ fontSize: 64 }}>🎬</div>
      <div className="headline gradient-text" style={{ fontSize: 40, marginTop: 10 }}>
        That's a wrap
      </div>
      <p className="muted">{days.length ? `${season.label} is in the books.` : `This ${season.noun} has no episodes yet.`}</p>
      <div className="col" style={{ marginTop: 24, position: "relative", zIndex: 2 }}>
        {nextSeason && (
          <button className="btn primary" onClick={() => navigate(`/finale/${nextSeason.start}`, { replace: true })}>
            Next: {nextSeason.label}
          </button>
        )}
        <button className="btn" onClick={() => setIndex(0)}>
          <RotateCcw size={17} /> Replay
        </button>
        <button className="btn" onClick={() => back("/finales")}>
          Close
        </button>
      </div>
    </div>,
  );

  const last = slides.length - 1;
  useEffect(() => setIndex(0), [season.key]);
  useEffect(() => {
    if (paused || index >= last) return;
    const t = window.setTimeout(() => setIndex((i) => Math.min(last, i + 1)), SLIDE_MS);
    return () => window.clearTimeout(t);
  }, [index, paused, last]);

  return (
    <div
      className="story"
      onPointerDown={() => setPaused(true)}
      onPointerUp={() => setPaused(false)}
      onPointerCancel={() => setPaused(false)}
    >
      <div className="story-progress">
        {slides.map((_, i) => (
          <span key={i} className={i < index ? "done" : i === index ? "active" : ""}>
            <i style={i === index ? { animationDuration: `${SLIDE_MS}ms`, animationPlayState: paused ? "paused" : "running", width: index === last ? "100%" : undefined } : undefined} />
          </span>
        ))}
      </div>
      <div className="row between" style={{ margin: "10px 0 6px" }}>
        <span className="small muted">
          {season.badge} · {season.name}
        </span>
        <button className="close-btn" onClick={() => back("/finales")} aria-label="Close" style={{ position: "relative", zIndex: 2 }}>
          <X size={18} />
        </button>
      </div>
      <div className="story-slide">
        {index > 0 && <button className="story-tap prev" onClick={() => setIndex(index - 1)} aria-label="Previous" />}
        {index < last && <button className="story-tap next" onClick={() => setIndex(index + 1)} aria-label="Next" />}
        <div key={index} style={{ animation: "rise 0.25s ease-out" }}>
          {slides[index]}
        </div>
      </div>
      {index > 0 && index < last && (
        <div className="tiny dim center">tap the sides to skip · hold to pause</div>
      )}
    </div>
  );
}

function MonthSquares({ season, byDate }: { season: Season; byDate: Record<string, Day> }) {
  const [y, m] = [Number(season.start.slice(0, 4)), Number(season.start.slice(5, 7)) - 1];
  const cells: ReactNode[] = WEEKDAYS_SHORT.map((d) => (
    <span key={d} className="wd">
      {d[0]}
    </span>
  ));
  for (let i = 0; i < weekdayIndex(season.start); i++) cells.push(<span key={`pad${i}`} />);
  for (let d = 1; d <= daysInMonth(y, m); d++) {
    const date = `${season.start.slice(0, 8)}${String(d).padStart(2, "0")}`;
    const day = date >= season.firstDay ? byDate[date] : undefined;
    const t = day ? tierFor(day.rating) : null;
    cells.push(
      <span key={date} className="sq" style={{ background: t ? t.color : "#1c1c1e", color: t ? t.ink : "#5f5f66", opacity: date < season.firstDay ? 0.35 : 1 }}>
        {d}
      </span>,
    );
  }
  return <div className="month-grid">{cells}</div>;
}

/** A semester at a glance: one column per week, Monday at the top. */
function SemesterHeatmap({ season, byDate }: { season: Season; byDate: Record<string, Day> }) {
  const start = startOfWeek(season.firstDay);
  const weeks = Math.ceil((daysBetween(start, season.end) + 1) / 7);
  const labels: ReactNode[] = [<span key="corner" />];
  const cells: ReactNode[] = [];
  for (let w = 0; w < weeks; w++) {
    const monday = addDays(start, w * 7);
    const firstOfMonth = Array.from({ length: 7 }, (_, i) => addDays(monday, i)).find((d) => d.endsWith("-01") && d >= season.firstDay);
    const label = w === 0 ? MONTHS_SHORT[Number(season.firstDay.slice(5, 7)) - 1] : firstOfMonth ? MONTHS_SHORT[Number(firstOfMonth.slice(5, 7)) - 1] : "";
    labels.push(
      <span key={`m${w}`} className="tiny muted" style={{ whiteSpace: "nowrap", overflow: "visible" }}>
        {label}
      </span>,
    );
    for (let i = 0; i < 7; i++) {
      const date = addDays(monday, i);
      const inSeason = date >= season.firstDay && date <= season.end;
      const day = inSeason ? byDate[date] : undefined;
      cells.push(
        <span
          key={date}
          title={day ? `${date}: ${fmt(day.rating)}` : date}
          style={{
            gridColumn: w + 2,
            gridRow: i + 1,
            aspectRatio: "1",
            borderRadius: 3,
            background: !inSeason ? "transparent" : day ? tierFor(day.rating).color : "#1c1c1e",
          }}
        />,
      );
    }
  }
  const template = `14px repeat(${weeks}, minmax(0, 1fr))`;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: template, gap: 3, marginBottom: 4 }}>{labels}</div>
      <div style={{ display: "grid", gridTemplateColumns: template, gap: 3 }}>
        {["M", "", "W", "", "F", "", "S"].map((d, i) => (
          <span key={`wd${i}`} className="tiny muted" style={{ gridColumn: 1, gridRow: i + 1, alignSelf: "center" }}>
            {d}
          </span>
        ))}
        {cells}
      </div>
    </div>
  );
}
