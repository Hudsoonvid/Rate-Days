import { Play } from "lucide-react";
import { useMemo } from "react";
import { Empty, SeasonBadge, TopBar } from "../components/ui";
import { monthLabel } from "../lib/dates";
import { fmt } from "../lib/ratings";
import { navigate } from "../lib/router";
import { byMonth, sortedDays } from "../lib/stats";
import { useStore } from "../lib/store";

export function Finales() {
  const { data } = useStore();
  const months = useMemo(() => byMonth(sortedDays(data.days)).reverse(), [data.days]);

  return (
    <div className="app">
      <TopBar close right={<span />} />
      <div className="feature-head" style={{ marginBottom: 16 }}>
        <h1>Season Finales</h1>
        <p>Your monthly recaps</p>
      </div>
      {!months.length ? (
        <Empty emoji="🎞️" title="No seasons yet">
          Rate a few days and each month becomes a season you can replay.
        </Empty>
      ) : (
        months.map((m) => (
          <button key={m.key} className="list-row" style={{ padding: 14 }} onClick={() => navigate(`/finale/${m.key}`)}>
            <SeasonBadge season={Number(m.key.slice(5, 7))} avg={m.avg} />
            <span className="grow">
              <div style={{ fontWeight: 600, fontSize: 18 }}>{monthLabel(m.key)}</div>
              <div className="small muted">
                {m.count} episode{m.count === 1 ? "" : "s"} • {fmt(m.avg)} avg
              </div>
            </span>
            <Play size={22} fill="#8e8e93" color="#8e8e93" />
          </button>
        ))
      )}
    </div>
  );
}
