import { ArrowDownRight, ArrowUpDown, ArrowUpRight, ChevronRight, Crosshair, Flame, ListChecks, Minus } from "lucide-react";
import { useMemo, useState } from "react";
import { ColumnChart } from "../components/charts";
import { Delta, Empty, TopBar, useToast } from "../components/ui";
import { addDays, WEEKDAYS_SHORT, weekdayIndex } from "../lib/dates";
import { weekCount } from "../lib/goals";
import { MIN_DAYS, tagImpact, type TagImpact } from "../lib/insights";
import { colorFor, fmt } from "../lib/ratings";
import { navigate } from "../lib/router";
import { sortedDays } from "../lib/stats";
import { uid, useStore } from "../lib/store";

export function TagImpactScreen() {
  const store = useStore();
  const { data, today } = store;
  const toast = useToast();
  const [showNeutral, setShowNeutral] = useState(false);
  const days = useMemo(() => sortedDays(data.days), [data.days]);
  const report = useMemo(() => tagImpact(days, data.tags, data.days), [days, data.tags, data.days]);
  const committed = new Map(data.goals.commitments.map((c) => [c.tagId, c]));
  const habitCandidate = report.levers.find((l) => !committed.has(l.tag.id));

  const makeHabit = (impact: TagImpact) => {
    store.setGoals({
      ...data.goals,
      commitments: [...data.goals.commitments, { id: uid("c"), label: impact.tag.name, tagId: impact.tag.id, perWeek: 3 }],
    });
    toast(`${impact.tag.name} added to your weekly commitments`);
  };

  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  const row = (impact: TagImpact, variant: "lever" | "drain" | "tradeoff" | "neutral") => {
    const c = committed.get(impact.tag.id);
    const n = c ? weekCount(data.days, c, today) : 0;
    return (
      <div key={impact.tag.id} className="impact-item">
        <button className="impact-row" onClick={() => navigate(`/search?q=${encodeURIComponent(impact.tag.name)}`)}>
          <span style={{ color: variant === "lever" ? "#4ade80" : variant === "drain" ? "#ff5a4f" : variant === "tradeoff" ? "#f7a531" : "var(--muted)", flex: "none" }}>
            {variant === "lever" ? <ArrowUpRight size={20} /> : variant === "drain" ? <ArrowDownRight size={20} /> : variant === "tradeoff" ? <ArrowUpDown size={20} /> : <Minus size={20} />}
          </span>
          <span className="emoji">{impact.tag.emoji}</span>
          <span className="grow">
            <span className="row" style={{ gap: 8 }}>
              <span style={{ fontWeight: 500, fontSize: 17 }}>{impact.tag.name}</span>
              {c && (
                <span className={`streak-badge${n >= c.perWeek ? " done" : ""}`}>
                  <Flame size={12} /> {n}/{c.perWeek}
                </span>
              )}
            </span>
            <div className="small muted" style={{ marginTop: 2 }}>
              {`${impact.tag.blurb ? `${impact.tag.blurb} • ` : ""}${impact.count} days`}
            </div>
          </span>
          {variant === "tradeoff" ? (
            <span className="col" style={{ gap: 0, alignItems: "flex-end", fontSize: 16 }}>
              <Delta value={impact.delta} />
              <Delta value={impact.nextDelta!} />
            </span>
          ) : (
            <Delta value={impact.delta} />
          )}
          <ChevronRight size={18} className="dim" />
        </button>
        {variant === "lever" && habitCandidate?.tag.id === impact.tag.id && (
          <button className="pill-btn" style={{ margin: "-2px 0 12px 64px" }} onClick={() => makeHabit(impact)}>
            <Flame size={15} /> Make it a habit
          </button>
        )}
      </div>
    );
  };

  return (
    <div className="app">
      <TopBar title="Tag Impact" />

      <div className="card" style={{ marginTop: 6 }}>
        <div className="small muted" style={{ marginBottom: 4 }}>
          Last 7 days
        </div>
        <ColumnChart
          max={10}
          height={120}
          columns={last7.map((d) => {
            const r = data.days[d]?.rating;
            return {
              label: WEEKDAYS_SHORT[weekdayIndex(d)],
              value: r ?? 0,
              color: r === undefined ? "#333" : colorFor(r),
              display: r === undefined ? "" : fmt(r),
              title: r === undefined ? `${d}: not rated` : `${d}: ${fmt(r)}`,
            };
          })}
        />
      </div>

      <h2 className="section-title" style={{ marginTop: 22 }}>
        <ListChecks size={22} color="#4fd1c5" /> Tag Impact
      </h2>

      {!days.length ? (
        <Empty emoji="🏷️" title="No tagged days yet">
          Tag your episodes (Walk, Travel, Craft Beer…) and this page will show which choices move your ratings.
        </Empty>
      ) : (
        <div className="card">
          <div className="eyebrow teal">Your levers</div>
          <div className="small muted" style={{ margin: "2px 0 6px" }}>
            choices that move your days • vs your {fmt(report.baseline)} average
          </div>
          {report.levers.length ? report.levers.map((l) => row(l, "lever")) : <p className="small dim">Nothing stands out yet.</p>}

          {report.tradeoffs.length > 0 && (
            <>
              <div className="eyebrow teal" style={{ marginTop: 18 }}>
                Trade-offs
              </div>
              <div className="small muted" style={{ margin: "2px 0 6px" }}>
                great in the moment — but there's a cost
              </div>
              {report.tradeoffs.map((l) => (
                row(l, "tradeoff")
              ))}
            </>
          )}

          {report.drains.length > 0 && (
            <>
              <div className="eyebrow teal" style={{ marginTop: 18 }}>
                Drains
              </div>
              <div className="small muted" style={{ margin: "2px 0 6px" }}>
                what quietly drags your days down
              </div>
              {report.drains.map((l) => (
                row(l, "drain")
              ))}
            </>
          )}

          {report.neutral.length > 0 && (
            <>
              <button className="row" style={{ marginTop: 18, width: "100%" }} onClick={() => setShowNeutral((v) => !v)}>
                <span className="eyebrow teal">No clear effect</span>
                <span className="small muted">({report.neutral.length})</span>
                <span className="grow" />
                <ChevronRight size={16} className="dim" style={{ transform: showNeutral ? "rotate(90deg)" : undefined }} />
              </button>
              {showNeutral && report.neutral.map((l) => row(l, "neutral"))}
            </>
          )}

          {report.early.length > 0 && (
            <>
              <div className="eyebrow teal" style={{ marginTop: 18 }}>
                Too early to call
              </div>
              <div className="small muted" style={{ margin: "2px 0 6px" }}>
                still collecting evidence
              </div>
              {report.early.map((l) => (
                <button key={l.tag.id} className="impact-row" onClick={() => navigate(`/search?q=${encodeURIComponent(l.tag.name)}`)}>
                  <Crosshair size={18} className="dim" style={{ flex: "none" }} />
                  <span className="emoji">{l.tag.emoji}</span>
                  <span className="grow" style={{ fontSize: 17 }}>
                    {l.tag.name}
                  </span>
                  <span className="small muted tabular">
                    {l.count} of {MIN_DAYS} days
                  </span>
                  <ChevronRight size={18} className="dim" />
                </button>
              ))}
            </>
          )}
        </div>
      )}
      <p className="key-hint" style={{ marginTop: 14 }}>
        A tag needs {MIN_DAYS}+ days before it's called. Trade-offs lift the day itself but the next day comes in at least 0.7 below a typical day of that weekday.
      </p>
    </div>
  );
}
