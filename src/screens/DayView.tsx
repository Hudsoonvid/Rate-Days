import { MapPin, Pencil, Trash2 } from "lucide-react";
import { useState } from "react";
import { Avatar, Dialog, Empty, Poster, TopBar } from "../components/ui";
import { addDays, episodeLabel, formatLong, startOfWeek } from "../lib/dates";
import { fmt, tierFor } from "../lib/ratings";
import { back, navigate } from "../lib/router";
import { useStore } from "../lib/store";

export function DayView({ date }: { date: string }) {
  const { data, removeDay } = useStore();
  const [confirm, setConfirm] = useState(false);
  const day = data.days[date];

  if (!day) {
    return (
      <div className="app">
        <TopBar title="Day Summary" />
        <Empty emoji="📭" title="No episode here">
          This day hasn't been rated.{" "}
          <button className="text-btn" onClick={() => navigate(`/edit/${date}`, { replace: true })}>
            Rate it
          </button>
        </Empty>
      </div>
    );
  }

  const tier = tierFor(day.rating);
  const people = day.people.map((id) => data.people.find((p) => p.id === id)).filter(Boolean);
  const tags = day.tags.map((id) => data.tags.find((t) => t.id === id)).filter(Boolean);
  const place = data.places.find((p) => p.id === day.placeId);

  // Story-style strip of the week, like flipping through episodes.
  const weekStart = startOfWeek(date);
  const week = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const rated = Object.keys(data.days).sort();
  const idx = rated.indexOf(date);
  const prev = idx > 0 ? rated[idx - 1] : undefined;
  const next = idx >= 0 && idx < rated.length - 1 ? rated[idx + 1] : undefined;
  const go = (d?: string) => d && navigate(`/day/${d}`, { replace: true });

  return (
    <div className="app">
      <div className="story-bars" aria-hidden>
        {week.map((d) => {
          const r = data.days[d];
          return <span key={d} className={d === date ? "active" : ""} style={{ background: r ? tierFor(r.rating).color : undefined }} />;
        })}
      </div>
      <TopBar
        title="Day Summary"
        backLabel="Close"
        right={
          <>
            <button className="icon-btn" onClick={() => navigate(`/edit/${date}`)} aria-label="Edit" style={{ color: "var(--link)" }}>
              <Pencil size={20} />
            </button>
            <button className="icon-btn" onClick={() => setConfirm(true)} aria-label="Delete" style={{ color: "var(--danger)" }}>
              <Trash2 size={20} />
            </button>
          </>
        }
      />

      <div className="day-hero">
        {day.photo ? <img src={day.photo} alt="" /> : <Poster day={day} tags={data.tags} />}
        {prev && <button className="tap prev" onClick={() => go(prev)} aria-label="Previous episode" />}
        {next && <button className="tap next" onClick={() => go(next)} aria-label="Next episode" />}
      </div>

      <div className="day-body">
        <div className="center muted">{formatLong(date)}</div>
        <div className="center tiny dim" style={{ marginTop: 2 }}>
          {episodeLabel(date)}
        </div>
        <div className="day-score">
          <b className="tabular">{fmt(day.rating)}</b>
          <span>/10</span>
        </div>
        <div className="score-bar">
          <span style={{ width: `${day.rating * 10}%`, background: tier.color }} />
        </div>
        <h2 className="h2 center">{day.title || "Untitled episode"}</h2>
        {day.notes && <p className="day-notes">{day.notes}</p>}

        {people.length > 0 && (
          <>
            <div className="day-section-title">Characters</div>
            <div className="chips">
              {people.map((p) => (
                <button key={p!.id} className="chip" onClick={() => navigate(`/search?q=${encodeURIComponent(p!.name)}`)}>
                  <Avatar name={p!.name} /> {p!.name}
                </button>
              ))}
            </div>
          </>
        )}

        {tags.length > 0 && (
          <>
            <div className="day-section-title">Tags</div>
            <div className="chips">
              {tags.map((t) => (
                <button key={t!.id} className="chip" onClick={() => navigate(`/search?q=${encodeURIComponent(t!.name)}`)}>
                  <span>{t!.emoji}</span> {t!.name}
                </button>
              ))}
            </div>
          </>
        )}

        {place && (
          <>
            <div className="day-section-title">Location</div>
            <div className="chips">
              <button className="chip" onClick={() => navigate(`/search?q=${encodeURIComponent(place.name)}`)}>
                <MapPin size={16} color="#f7a531" /> {place.name}
              </button>
            </div>
          </>
        )}
      </div>

      <Dialog open={confirm} onClose={() => setConfirm(false)}>
        <h2 className="h2">Delete this episode?</h2>
        <p className="muted">The rating, notes and photo for {formatLong(date)} will be removed.</p>
        <div className="col">
          <button
            className="btn danger block"
            onClick={() => {
              removeDay(date);
              setConfirm(false);
              back();
            }}
          >
            Delete episode
          </button>
          <button className="btn block" onClick={() => setConfirm(false)}>
            Cancel
          </button>
        </div>
      </Dialog>
    </div>
  );
}
