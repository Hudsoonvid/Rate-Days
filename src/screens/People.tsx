import { Activity, Hash, Info, Search, Star, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { LineChart } from "../components/charts";
import { Avatar, Empty, Pager, TopBar } from "../components/ui";
import { monthKey, MONTHS_SHORT } from "../lib/dates";
import { storyYearOf } from "../lib/seasons";
import { colorFor, fmt } from "../lib/ratings";
import { navigate } from "../lib/router";
import { average, byMonth, inRange, personStats, rankByRating, sortedDays } from "../lib/stats";
import { useStore } from "../lib/store";

export function People() {
  const { data, today } = useStore();
  const [sort, setSort] = useState<"rating" | "count">("rating");
  const [page, setPage] = useState(0);
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const days = useMemo(() => sortedDays(data.days), [data.days]);

  const ranked = useMemo(() => {
    const stats = personStats(data.people, days);
    return sort === "rating" ? rankByRating(stats) : stats.slice().sort((a, b) => b.count - a.count || b.avg - a.avg);
  }, [data.people, days, sort]);
  const [selected, setSelected] = useState<string | null>(null);
  const focus = ranked.find((r) => r.item.id === selected) ?? ranked[0];

  // Lifeline over the current (school) year, month by month, against your own monthly average.
  const year = storyYearOf(today, data.format);
  const yearDays = inRange(days, year.start, year.end);
  const months = byMonth(yearDays);
  const labels = months.map((m) => MONTHS_SHORT[Number(m.key.slice(5, 7)) - 1]);
  const personValues = focus
    ? months.map((m) => {
        const list = focus.days.filter((d) => monthKey(d.date) === m.key);
        return list.length ? average(list) : null;
      })
    : [];

  const filteredChips = ranked.filter((r) => r.item.name.toLowerCase().includes(query.trim().toLowerCase()));
  const shown = ranked.slice(page * 5, page * 5 + 5);

  return (
    <div className="app">
      <TopBar
        title={
          <span className="row" style={{ gap: 6 }}>
            <UserRound size={18} color="#5ea0ff" /> Character Rankings
          </span>
        }
        right={
          <button
            className="icon-btn filled"
            style={{ width: 34, height: 34, color: "#5ea0ff" }}
            onClick={() => {
              setSort(sort === "rating" ? "count" : "rating");
              setPage(0);
            }}
            aria-label={sort === "rating" ? "Sort by appearances" : "Sort by rating"}
          >
            {sort === "rating" ? <Star size={17} fill="#5ea0ff" /> : <Hash size={17} />}
          </button>
        }
      />

      {!ranked.length ? (
        <Empty emoji="🎭" title="Your cast is empty">
          Add people to your episodes and see who makes life better.
        </Empty>
      ) : (
        <>
          <div className="row between" style={{ margin: "6px 0 12px" }}>
            <span className="small muted">{sort === "rating" ? "Ranked by average rating of days together" : "Ranked by appearances"}</span>
            <Pager page={page} pageSize={5} total={ranked.length} onChange={setPage} />
          </div>
          {shown.map((r, i) => (
            <button
              key={r.item.id}
              className="rank-row"
              style={{ borderRightColor: colorFor(r.avg) }}
              onClick={() => navigate(`/search?q=${encodeURIComponent(r.item.name)}`)}
            >
              <span className="rank-num">#{page * 5 + i + 1}</span>
              <Avatar name={r.item.name} large />
              <span className="grow">
                <div style={{ fontWeight: 500, fontSize: 17 }}>{r.item.name}</div>
                <div className="small muted">
                  {r.count} appearance{r.count === 1 ? "" : "s"}
                </div>
              </span>
              <span className="score-star">
                <Star size={17} fill={colorFor(r.avg)} color={colorFor(r.avg)} /> {fmt(r.avg)}
              </span>
            </button>
          ))}

          <div className="section">
            <div className="row between" style={{ marginBottom: 10 }}>
              <h2 className="section-title" style={{ margin: 0 }}>
                <Activity size={20} color="#4fd1c5" /> Character Lifelines
                <button onClick={() => setShowInfo(!showInfo)} aria-label="About lifelines" className="muted">
                  <Info size={16} />
                </button>
              </h2>
              <button className="icon-btn" onClick={() => setSearching(!searching)} aria-label="Find a character">
                <Search size={19} />
              </button>
            </div>
            {showInfo && (
              <p className="small muted" style={{ marginTop: 0 }}>
                A lifeline traces how your days went, season by season, when this person was in the episode — next to your overall average for that season.
              </p>
            )}
            {searching && (
              <div className="search-box" style={{ marginBottom: 10 }}>
                <Search size={16} />
                <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Find a character" autoFocus />
              </div>
            )}
            <div className="row" style={{ overflowX: "auto", paddingBottom: 6, gap: 8 }}>
              {filteredChips.map((r) => (
                <button
                  key={r.item.id}
                  className="chip selectable"
                  aria-pressed={focus?.item.id === r.item.id}
                  onClick={() => setSelected(r.item.id)}
                  style={{ flex: "none" }}
                >
                  <Avatar name={r.item.name} /> {r.item.name}
                </button>
              ))}
            </div>
            <div className="card" style={{ marginTop: 8 }}>
              {months.length && focus ? (
                <LineChart
                  labels={labels}
                  series={[
                    { name: focus.item.name, values: personValues, color: "tier" },
                    { name: "You", values: months.map((m) => m.avg), color: "#8e8e93" },
                  ]}
                />
              ) : (
                <p className="small muted center">No episodes this year yet.</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
