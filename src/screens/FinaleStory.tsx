import { RotateCcw, Star, TriangleAlert, X } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Avatar, RatingBadge } from "../components/ui";
import { daysInMonth, formatMonthDay, episodeLabel, monthLabel, WEEKDAYS_SHORT, weekdayIndex } from "../lib/dates";
import { gatherFacts, localRecap, type RecapContent } from "../lib/narrator";
import { periodContaining } from "../lib/periods";
import { GENRE_COLORS } from "../lib/presets";
import { fmt, tierFor } from "../lib/ratings";
import { back, navigate } from "../lib/router";
import { genreShares, personStats, sortedDays, topDays } from "../lib/stats";
import { useStore } from "../lib/store";

const SLIDE_MS = 6500;

export function FinaleStory({ month }: { month: string }) {
  const { data } = useStore();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const [y, m] = month.split("-").map(Number);
  const days = useMemo(() => sortedDays(data.days).filter((d) => d.date.startsWith(month)), [data.days, month]);
  const period = periodContaining("season", `${month}-01`);
  const facts = useMemo(() => gatherFacts(data, period), [data, period.key]);
  const cached = data.recaps[period.key];
  let recap: RecapContent = localRecap(facts);
  if (cached) {
    try {
      recap = JSON.parse(cached.text) as RecapContent;
    } catch {
      // Use the local recap.
    }
  }

  const months = useMemo(() => [...new Set(Object.keys(data.days).map((d) => d.slice(0, 7)))].sort(), [data.days]);
  const nextSeason = months[months.indexOf(month) + 1];

  const slides: ReactNode[] = [];
  if (days.length) {
    const avgTier = tierFor(facts.avg);
    slides.push(
      <div className="center" key="cover">
        <div className="eyebrow" style={{ marginBottom: 12 }}>
          Season finale
        </div>
        <div className="headline gradient-text" style={{ fontSize: 56 }}>
          Season {m}
        </div>
        <div className="h2" style={{ marginTop: 10 }}>
          {monthLabel(month)}
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

    const firstPad = weekdayIndex(`${month}-01`);
    const cells: ReactNode[] = WEEKDAYS_SHORT.map((d) => (
      <span key={d} className="wd">
        {d[0]}
      </span>
    ));
    for (let i = 0; i < firstPad; i++) cells.push(<span key={`pad${i}`} />);
    for (let d = 1; d <= daysInMonth(y, m - 1); d++) {
      const date = `${month}-${String(d).padStart(2, "0")}`;
      const day = data.days[date];
      const t = day ? tierFor(day.rating) : null;
      cells.push(
        <span key={date} className="sq" style={{ background: t ? t.color : "#1c1c1e", color: t ? t.ink : "#5f5f66" }}>
          {d}
        </span>,
      );
    }
    slides.push(
      <div key="colors">
        <div className="small muted center">{monthLabel(month)}</div>
        <h2 className="h2 center" style={{ letterSpacing: "0.08em", textTransform: "uppercase", margin: "6px 0 22px" }}>
          Your season in colors
        </h2>
        <div className="month-grid">{cells}</div>
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
                {episodeLabel(d.date)} ({formatMonthDay(d.date)})
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
      <p className="muted">{days.length ? `Season ${m} is in the books.` : "This season has no episodes yet."}</p>
      <div className="col" style={{ marginTop: 24, position: "relative", zIndex: 2 }}>
        {nextSeason && (
          <button className="btn primary" onClick={() => navigate(`/finale/${nextSeason}`, { replace: true })}>
            Next: Season {Number(nextSeason.slice(5, 7))}
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
  useEffect(() => setIndex(0), [month]);
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
          S{m} · {monthLabel(month)}
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
