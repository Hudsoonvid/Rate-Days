import { Play } from "lucide-react";
import { useMemo } from "react";
import { Empty, SeasonBadge, TopBar } from "../components/ui";
import { fmt } from "../lib/ratings";
import { navigate } from "../lib/router";
import { seasonOf, type Season } from "../lib/seasons";
import { average, sortedDays } from "../lib/stats";
import { useStore } from "../lib/store";
import type { Day } from "../lib/types";

export function Finales() {
  const { data, series } = useStore();
  const school = data.format.mode === "school";
  const seasons = useMemo(() => {
    const groups = new Map<string, { season: Season; days: Day[] }>();
    for (const d of sortedDays(data.days)) {
      const s = seasonOf(d.date, series);
      if (!groups.has(s.key)) groups.set(s.key, { season: s, days: [] });
      groups.get(s.key)!.days.push(d);
    }
    return [...groups.values()].reverse();
  }, [data.days, series]);

  return (
    <div className="app">
      <TopBar close right={<span />} />
      <div className="feature-head" style={{ marginBottom: 16 }}>
        <h1>Season Finales</h1>
        <p>{school ? "Your semester recaps" : "Your monthly recaps"}</p>
      </div>
      {!seasons.length ? (
        <Empty emoji="🎞️" title="No seasons yet">
          Rate a few days and each {school ? "semester" : "month"} becomes a season you can replay.
        </Empty>
      ) : (
        seasons.map(({ season, days }) => {
          const avg = average(days);
          return (
            <button key={season.key} className="list-row" style={{ padding: 14 }} onClick={() => navigate(`/finale/${season.start}`)}>
              <SeasonBadge label={season.badge} avg={avg} />
              <span className="grow">
                <div style={{ fontWeight: 600, fontSize: 18 }}>{season.name}</div>
                <div className="small muted">
                  {days.length} episode{days.length === 1 ? "" : "s"} • {fmt(avg)} avg
                </div>
              </span>
              <Play size={22} fill="#8e8e93" color="#8e8e93" />
            </button>
          );
        })
      )}
    </div>
  );
}
