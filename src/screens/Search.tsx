import { CalendarDays, ChevronRight, MapPin, Search, Tag, Type, Users, X } from "lucide-react";
import { useMemo, useState } from "react";
import { RatingBadge, TopBar } from "../components/ui";
import { formatShort } from "../lib/dates";
import { navigate } from "../lib/router";
import { searchDays, type MatchKind } from "../lib/search";
import { useStore } from "../lib/store";

const KIND_ICON: Record<MatchKind, JSX.Element> = {
  title: <MapPin size={13} color="#f7a531" />,
  place: <MapPin size={13} color="#f7a531" />,
  person: <Users size={13} color="#5ea0ff" />,
  tag: <Tag size={13} color="#4fd1c5" />,
  note: <Type size={13} color="#f7a531" />,
  date: <CalendarDays size={13} color="#8e8e93" />,
};

export function SearchScreen({ initialQuery }: { initialQuery: string }) {
  const { data } = useStore();
  const [q, setQ] = useState(initialQuery);
  const hits = useMemo(() => searchDays(data, q), [data, q]);
  const update = (value: string) => {
    setQ(value);
    // Keep the query in the URL so "back" from a result returns to the same search.
    navigate(value ? `/search?q=${encodeURIComponent(value)}` : "/search", { replace: true });
  };

  return (
    <div className="app">
      <TopBar title="Search your story" close right={<span />} />
      <div className="search-box" style={{ marginTop: 8 }}>
        <Search size={18} />
        <input
          value={q}
          onChange={(e) => update(e.target.value)}
          placeholder="People, places, notes, tags or dates"
          autoFocus={!initialQuery}
          enterKeyHint="search"
          aria-label="Search"
        />
        {q && (
          <button onClick={() => update("")} aria-label="Clear" className="muted">
            <X size={18} />
          </button>
        )}
      </div>

      {q.trim() ? (
        <div className="small muted" style={{ margin: "14px 4px 10px" }}>
          {hits.length} day{hits.length === 1 ? "" : "s"} found
        </div>
      ) : (
        <div className="small muted" style={{ margin: "16px 4px", lineHeight: 1.6 }}>
          Try “Lisbon”, a friend's name, “pasta”, “Craft Beer”, “jul 12” or “2026-03”.
        </div>
      )}

      {hits.slice(0, 200).map((h) => (
        <button key={h.day.date} className="list-row" onClick={() => navigate(`/day/${h.day.date}`)}>
          <RatingBadge rating={h.day.rating} size={46} />
          <span className="grow">
            <div className="ellipsis">
              <b>{formatShort(h.day.date)}</b>
              {h.day.title && <span className="muted"> · {h.day.title}</span>}
            </div>
            {h.detail && (
              <div className="small muted ellipsis row" style={{ gap: 5, marginTop: 2 }}>
                {KIND_ICON[h.kind]} <span className="ellipsis">{h.detail}</span>
              </div>
            )}
          </span>
          <ChevronRight size={18} className="chev" />
        </button>
      ))}
    </div>
  );
}
