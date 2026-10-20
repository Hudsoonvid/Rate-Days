import { ChevronRight, Clapperboard, Flag, MapPin, Sparkles, Star, Tags, TrendingDown, TriangleAlert, UserRound } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { ColumnChart, LineChart } from "../components/charts";
import { AppHeader, Empty, Pager, Segmented } from "../components/ui";
import { formatMonthDay, MONTHS, MONTHS_SHORT, WEEKDAYS, WEEKDAYS_SHORT } from "../lib/dates";
import { episodeLabel, seasonOf, storyYearOf } from "../lib/seasons";
import { GENRE_COLORS } from "../lib/presets";
import { colorFor, fmt } from "../lib/ratings";
import { navigate } from "../lib/router";
import {
  average, bestMonth, bestWeekday, inRange, byMonth, byWeekday, consistency, genreShares, histogram,
  loggingStreak, longestStreak, sortedDays, tierDistribution, topDays,
} from "../lib/stats";
import { useStore } from "../lib/store";
import type { Day } from "../lib/types";

export function Stats() {
  const { data, today } = useStore();
  const [scope, setScope] = useState<"year" | "all">("year");
  const year = storyYearOf(today, data.format);
  const all = useMemo(() => sortedDays(data.days), [data.days]);
  const days = useMemo(() => (scope === "year" ? inRange(all, year.start, year.end) : all), [all, scope, year.start, year.end]);

  return (
    <div className="app">
      <AppHeader />
      <div className="row between" style={{ margin: "8px 0 14px" }}>
        <h1 className="h1">Stats</h1>
        <Segmented
          value={scope}
          onChange={setScope}
          options={[
            { value: "year", label: year.label },
            { value: "all", label: "All time" },
          ]}
        />
      </div>

      {days.length < 2 ? (
        <Empty emoji="📊" title="Not enough episodes yet">
          Rate a few more days and your numbers will show up here.
        </Empty>
      ) : (
        <StatsBody days={days} streak={loggingStreak(data.days, today)} />
      )}

      <div className="section nav-list">
        <h2 className="section-title">Explore</h2>
        <NavRow icon={<Tags size={20} />} color="#4fd1c5" title="Tag Impact" sub="What lifts your days, what drags them down" to="/impact" />
        <NavRow icon={<UserRound size={20} />} color="#5ea0ff" title="Character Rankings" sub="Who makes life better" to="/people" />
        <NavRow icon={<MapPin size={20} />} color="#f7a531" title="Locations" sub="Where your best days happen" to="/places" />
        <NavRow icon={<Flag size={20} />} color="#4ade80" title="Season Goal" sub="Commitments that tick themselves" to="/goals" />
        <NavRow icon={<Sparkles size={20} />} color="#f7c948" title="The Narrator's Cut" sub="Recaps of your weeks, seasons and years" to="/narrator" />
        <NavRow icon={<Clapperboard size={20} />} color="#e8467c" title="Season Finales" sub="Monthly recaps, story-style" to="/finales" />
      </div>
    </div>
  );
}

function NavRow({ icon, color, title, sub, to }: { icon: ReactNode; color: string; title: string; sub: string; to: string }) {
  return (
    <button className="list-row" onClick={() => navigate(to)}>
      <span className="nav-icon" style={{ background: `${color}22`, color }}>
        {icon}
      </span>
      <span className="grow">
        <div style={{ fontWeight: 600 }}>{title}</div>
        <div className="small muted">{sub}</div>
      </span>
      <ChevronRight size={18} className="chev" />
    </button>
  );
}

function StatsBody({ days, streak }: { days: Day[]; streak: number }) {
  const { data } = useStore();
  const school = data.format.mode === "school";
  const month = bestMonth(days, 5) ?? bestMonth(days, 1);
  const weekday = bestWeekday(days);
  const cons = consistency(days);
  const great = longestStreak(days, (d) => d.rating >= 8);
  const tough = longestStreak(days, (d) => d.rating < 5);
  const dist = tierDistribution(days);
  const weekdays = byWeekday(days);
  const hist = histogram(days);
  const months = byMonth(days);

  return (
    <>
      <div className="grid-2">
        <div className="card tile">
          <div className="big glow-gold">{month ? MONTHS[Number(month.key.slice(5, 7)) - 1] : "—"}</div>
          <div className="label">Highest Avg Month</div>
          {month && (
            <div className="sub">
              {fmt(month.avg)} avg • {month.count} days
            </div>
          )}
        </div>
        <div className="card tile">
          <div className="big glow-gold" style={{ fontSize: 30 }}>
            {weekday ? WEEKDAYS[Number(weekday.key)] : "—"}
          </div>
          <div className="label">Highest Avg Day</div>
          {weekday && (
            <div className="sub">
              {fmt(weekday.avg)} avg • {weekday.count} days
            </div>
          )}
        </div>
      </div>

      <div className="card tile" style={{ marginTop: 10 }}>
        <div className="big glow-green" style={{ fontSize: 44 }}>
          {cons.pairs ? `${cons.percent}%` : "—"}
        </div>
        <div className="label">Consistency</div>
        <div className="sub">{cons.pairs ? `avg swing ±${fmt(cons.swing)} pts day to day` : "rate back-to-back days to measure"}</div>
      </div>

      <div className="grid-2" style={{ marginTop: 10 }}>
        <div className="card tile">
          <div className="big glow-green">{great.length} 🔥</div>
          <div className="label">Great Days Streak</div>
          <div className="sub">consecutive days ≥ 8.0</div>
        </div>
        <div className="card tile">
          <div className="big glow-red">
            {tough.length} <TrendingDown size={26} style={{ verticalAlign: -3 }} />
          </div>
          <div className="label">Longest Tough Stretch</div>
          <div className="sub">consecutive days &lt; 5.0</div>
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <div className="row between">
          <b>Rating Distribution</b>
          <span className="small muted">
            {days.length} episodes · {fmt(average(days))} avg
          </span>
        </div>
        <div className="dist-bar">
          {dist
            .filter((t) => t.count > 0)
            .map((t) => (
              <span key={t.tier.key} title={`${t.tier.label}: ${t.count} days (${t.percent}%)`} style={{ flex: t.count, background: t.tier.color }} />
            ))}
        </div>
        <div className="dist-legend">
          {dist.map((t) => (
            <span key={t.tier.key}>
              <i className="dot" style={{ background: t.tier.color, width: 9, height: 9 }} /> {t.tier.label} {t.percent}%
            </span>
          ))}
        </div>
        <div className="small muted" style={{ marginTop: 12 }}>
          🔥 {streak}-day logging streak
        </div>
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <b>📅 Avg by Day</b>
        <ColumnChart
          max={10}
          columns={weekdays.map((b, i) => ({
            label: WEEKDAYS_SHORT[i],
            sub: String(b.count),
            value: b.avg,
            color: b.count ? colorFor(b.avg) : "#333",
            display: b.count ? fmt(b.avg) : "",
            title: `${WEEKDAYS[i]}: ${b.count ? `${fmt(b.avg)} avg over ${b.count} days` : "no ratings"}`,
          }))}
        />
      </div>

      <div className="card" style={{ marginTop: 10 }}>
        <b>📊 Distribution</b>
        <ColumnChart
          max={Math.max(...hist)}
          columns={hist.map((n, i) => ({
            label: String(i),
            value: n,
            color: colorFor(i === 10 ? 10 : i + 0.5),
            display: n ? String(n) : "",
            title: `${i}${i < 10 ? `–${i}.9` : ""}: ${n} day${n === 1 ? "" : "s"}`,
          }))}
        />
      </div>

      {months.length > 1 && (
        <div className="card" style={{ marginTop: 10 }}>
          <b>📈 {school ? "Month by month" : "Season by season"}</b>
          <LineChart
            labels={months.map((m) => MONTHS_SHORT[Number(m.key.slice(5, 7)) - 1])}
            series={[{ name: "Monthly average", values: months.map((m) => m.avg), color: "tier" }]}
            min={Math.max(0, Math.floor(Math.min(...months.map((m) => m.avg)) - 1))}
            max={10}
          />
        </div>
      )}

      {school && <SemesterCard days={days} />}

      <RankedDays title="Top Rated Days" icon={<Star size={18} color="#f7c948" fill="#f7c948" />} list={topDays(days, 25, "best")} accent="#3767f2" />
      <RankedDays title="Lowest Rated Days" icon={<TriangleAlert size={18} color="#ff5a4f" />} list={topDays(days, 25, "worst")} accent="#a23be0" />
      <TopGenres days={days} tags={data.tags} />
    </>
  );
}

function SemesterCard({ days }: { days: Day[] }) {
  const { series } = useStore();
  const groups = new Map<string, Day[]>();
  for (const d of days) {
    const k = seasonOf(d.date, series).key;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k)!.push(d);
  }
  const rows = [...groups.values()].map((list) => ({ season: seasonOf(list[0].date, series), avg: average(list), count: list.length }));
  const [prev, last] = rows.slice(-2);
  return (
    <div className="card" style={{ marginTop: 10 }}>
      <b>🎓 Semesters</b>
      <div className="col" style={{ gap: 12, marginTop: 12 }}>
        {rows.map((r) => (
          <div key={r.season.key} className="row" style={{ gap: 10 }}>
            <span className="rank-num" style={{ width: 38, fontSize: 12 }}>
              {r.season.badge}
            </span>
            <span style={{ width: 92, flex: "none" }}>
              <div style={{ fontWeight: 600 }}>{r.season.name}</div>
              <div className="tiny muted">{r.count} episodes</div>
            </span>
            <span className="grow" style={{ height: 10, background: "#2c2c30", borderRadius: 5, overflow: "hidden" }}>
              <span style={{ display: "block", height: "100%", width: `${r.avg * 10}%`, background: colorFor(r.avg), borderRadius: 5 }} />
            </span>
            <b className="tabular" style={{ width: 30, textAlign: "right" }}>
              {fmt(r.avg)}
            </b>
          </div>
        ))}
      </div>
      {prev && last && (
        <div className="small muted" style={{ marginTop: 12 }}>
          {Math.abs(last.avg - prev.avg) < 0.05
            ? `${last.season.name} is level with ${prev.season.name}.`
            : `${last.season.name} is ${last.avg > prev.avg ? "up" : "down"} ${fmt(Math.abs(last.avg - prev.avg))} on ${prev.season.name}.`}
        </div>
      )}
    </div>
  );
}

function RankedDays({ title, icon, list, accent }: { title: string; icon: ReactNode; list: Day[]; accent: string }) {
  const { series } = useStore();
  const [page, setPage] = useState(0);
  const shown = list.slice(page * 5, page * 5 + 5);
  return (
    <div className="section">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          {icon} {title}
        </h2>
        <Pager page={page} pageSize={5} total={list.length} onChange={setPage} />
      </div>
      {shown.map((d, i) => (
        <button key={d.date} className="rank-row" style={{ borderRightColor: accent }} onClick={() => navigate(`/day/${d.date}`)}>
          <span className="rank-num">#{page * 5 + i + 1}</span>
          <span className="grow">
            <div className="ellipsis" style={{ fontWeight: 600 }}>
              {d.title || "Untitled episode"}
            </div>
            <div className="small muted">
              {episodeLabel(d.date, series)} ({formatMonthDay(d.date)}, {d.date.slice(0, 4)})
            </div>
          </span>
          <span className="score-star">
            <Star size={16} fill={colorFor(d.rating)} color={colorFor(d.rating)} /> {fmt(d.rating)}
          </span>
        </button>
      ))}
    </div>
  );
}

function TopGenres({ days, tags }: { days: Day[]; tags: Parameters<typeof genreShares>[1] }) {
  const [page, setPage] = useState(0);
  const genres = genreShares(days, tags);
  if (!genres.length) return null;
  const shown = genres.slice(page * 5, page * 5 + 5);
  return (
    <div className="section">
      <div className="row between" style={{ marginBottom: 12 }}>
        <h2 className="section-title" style={{ margin: 0 }}>
          <Star size={18} color="#f7c948" fill="#f7c948" /> Top Genres
        </h2>
        <Pager page={page} pageSize={5} total={genres.length} onChange={setPage} />
      </div>
      {shown.map((g, i) => (
        <div key={g.genre} className="rank-row">
          <span className="rank-num">#{page * 5 + i + 1}</span>
          <i className="dot" style={{ background: GENRE_COLORS[g.genre] ?? GENRE_COLORS.Other, width: 9, height: 9 }} />
          <span className="grow" style={{ fontWeight: 600 }}>
            {g.genre}
          </span>
          <span className="small" style={{ textAlign: "right" }}>
            <b>{g.count} days</b>
            <div className="muted tiny">{g.percent}%</div>
          </span>
        </div>
      ))}
    </div>
  );
}
