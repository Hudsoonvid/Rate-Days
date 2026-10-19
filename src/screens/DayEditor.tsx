import { Camera, LocateFixed, MapPin, Minus, Plus, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Avatar, Dialog, TopBar, useToast } from "../components/ui";
import { episodeLabel, formatLong } from "../lib/dates";
import { fileToDataUrl } from "../lib/image";
import { EMOJI_CHOICES, GENRES } from "../lib/presets";
import { fmt, roundRating, tierFor } from "../lib/ratings";
import { back, navigate } from "../lib/router";
import { uid, useStore } from "../lib/store";
import type { Day, Place, Tag } from "../lib/types";

function usageCounts(days: Record<string, Day>, pick: (d: Day) => string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of Object.values(days)) for (const id of pick(d)) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

export function DayEditor({ date: param }: { date: string }) {
  const store = useStore();
  const { data, today } = store;
  const toast = useToast();
  const initialDate = !param || param === "today" ? today : param;
  const existing = data.days[initialDate];

  const [date, setDate] = useState(initialDate);
  const [rating, setRating] = useState(existing?.rating ?? 7);
  const [title, setTitle] = useState(existing?.title ?? "");
  const [notes, setNotes] = useState(existing?.notes ?? "");
  const [photo, setPhoto] = useState(existing?.photo);
  const [people, setPeople] = useState<string[]>(existing?.people ?? []);
  const [tags, setTags] = useState<string[]>(existing?.tags ?? []);
  const [placeId, setPlaceId] = useState(existing?.placeId);
  const [newPerson, setNewPerson] = useState("");
  const [tagDialog, setTagDialog] = useState(false);
  const [placeDialog, setPlaceDialog] = useState(false);
  const [showAllTags, setShowAllTags] = useState(false);

  const tier = tierFor(rating);
  const personUse = useMemo(() => usageCounts(data.days, (d) => d.people), [data.days]);
  const tagUse = useMemo(() => usageCounts(data.days, (d) => d.tags), [data.days]);
  const placeUse = useMemo(() => usageCounts(data.days, (d) => (d.placeId ? [d.placeId] : [])), [data.days]);
  const sortedPeople = data.people.slice().sort((a, b) => (personUse.get(b.id) ?? 0) - (personUse.get(a.id) ?? 0) || a.name.localeCompare(b.name));
  // Most-used first; ties keep the curated starter order (stable sort), so new users see common tags up front.
  const sortedTags = data.tags.slice().sort((a, b) => (tagUse.get(b.id) ?? 0) - (tagUse.get(a.id) ?? 0));
  const visibleTags = showAllTags ? sortedTags : sortedTags.filter((t, i) => i < 14 || tags.includes(t.id));
  const sortedPlaces = data.places.slice().sort((a, b) => (placeUse.get(b.id) ?? 0) - (placeUse.get(a.id) ?? 0));

  const toggle = (list: string[], id: string) => (list.includes(id) ? list.filter((x) => x !== id) : [...list, id]);
  const bump = (n: number) => setRating((r) => Math.max(0, Math.min(10, roundRating(r + n))));

  const addPerson = () => {
    const name = newPerson.trim();
    if (!name) return;
    const found = data.people.find((p) => p.name.toLowerCase() === name.toLowerCase());
    const person = found ?? { id: uid("p"), name };
    if (!found) store.upsertPerson(person);
    setPeople((list) => (list.includes(person.id) ? list : [...list, person.id]));
    setNewPerson("");
  };

  const pickPhoto = async (file?: File) => {
    if (!file) return;
    try {
      setPhoto(await fileToDataUrl(file));
    } catch (e) {
      toast((e as Error).message);
    }
  };

  const save = () => {
    if (date > today) return toast("You can't rate an episode that hasn't aired yet.");
    if (date !== initialDate && data.days[date] && !window.confirm(`${formatLong(date)} already has a rating. Replace it?`)) return;
    const day: Day = { date, rating: roundRating(rating), title: title.trim(), notes: notes.trim(), photo, people, tags, placeId, updatedAt: Date.now() };
    if (date !== initialDate && existing) store.removeDay(initialDate);
    store.saveDay(day);
    // Editing from the Day Summary returns to it; a new episode replaces the editor with its summary.
    if (existing && date === initialDate) back(`/day/${date}`);
    else navigate(`/day/${date}`, { replace: true });
  };

  return (
    <div className="app">
      <TopBar
        title={existing ? "Edit Episode" : "New Episode"}
        backLabel="Cancel"
        right={
          <button className="text-btn accent" onClick={save}>
            Save
          </button>
        }
      />

      <div className="center muted" style={{ marginTop: 6 }}>
        {formatLong(date)} · {episodeLabel(date)}
      </div>

      <div className="rating-dial">
        <div className="value" style={{ color: tier.color }}>
          {fmt(rating)}
        </div>
        <div className="tier" style={{ color: tier.color }}>
          {tier.label}
        </div>
        <input
          className="range"
          type="range"
          min={0}
          max={10}
          step={0.1}
          value={rating}
          onChange={(e) => setRating(Number(e.target.value))}
          aria-label="Rating"
        />
        <div className="stepper">
          <button onClick={() => bump(-0.1)} aria-label="Minus 0.1">
            <Minus size={16} />
          </button>
          {[3, 5, 7, 8, 9].map((v) => (
            <button key={v} onClick={() => setRating(v)} style={{ color: tierFor(v).color }}>
              {v}
            </button>
          ))}
          <button onClick={() => bump(0.1)} aria-label="Plus 0.1">
            <Plus size={16} />
          </button>
        </div>
      </div>

      <div className="stack" style={{ marginTop: 20 }}>
        <label className="field">
          <span>Episode title</span>
          <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Creamy Pesto Pasta" maxLength={60} />
        </label>
        <label className="field">
          <span>What happened?</span>
          <textarea className="textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="The day unfolded at a steady pace…" />
        </label>
        {!existing && (
          <label className="field">
            <span>Date</span>
            <input className="input" type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} />
          </label>
        )}

        <div className="field">
          <span>Photo</span>
          <div className="photo-picker">
            {photo ? <img src={photo} alt="" /> : (
              <>
                <Camera size={26} />
                <span className="small">Add a still from today</span>
              </>
            )}
            <input type="file" accept="image/*" onChange={(e) => pickPhoto(e.target.files?.[0])} aria-label="Choose photo" />
          </div>
          {photo && (
            <button className="text-btn" style={{ color: "var(--danger)", alignSelf: "flex-start" }} onClick={() => setPhoto(undefined)}>
              Remove photo
            </button>
          )}
        </div>
      </div>

      <div className="section">
        <div className="section-title h3">Characters</div>
        <div className="chips">
          {sortedPeople.map((p) => (
            <button key={p.id} className="chip selectable" aria-pressed={people.includes(p.id)} onClick={() => setPeople(toggle(people, p.id))}>
              <Avatar name={p.name} /> {p.name}
            </button>
          ))}
        </div>
        <div className="row" style={{ marginTop: 10 }}>
          <input
            className="input"
            value={newPerson}
            onChange={(e) => setNewPerson(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addPerson()}
            placeholder="Add someone to the cast"
          />
          <button className="btn small" onClick={addPerson} disabled={!newPerson.trim()}>
            Add
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title h3">Tags</div>
        <div className="chips">
          {visibleTags.map((t) => (
            <button key={t.id} className="chip selectable" aria-pressed={tags.includes(t.id)} onClick={() => setTags(toggle(tags, t.id))}>
              <span>{t.emoji}</span> {t.name}
            </button>
          ))}
          {!showAllTags && sortedTags.length > visibleTags.length && (
            <button className="chip add" onClick={() => setShowAllTags(true)}>
              +{sortedTags.length - visibleTags.length} more
            </button>
          )}
          <button className="chip add" onClick={() => setTagDialog(true)}>
            <Plus size={14} /> New tag
          </button>
        </div>
      </div>

      <div className="section">
        <div className="section-title h3">Location</div>
        <div className="chips">
          {sortedPlaces.map((p) => (
            <button key={p.id} className="chip selectable" aria-pressed={placeId === p.id} onClick={() => setPlaceId(placeId === p.id ? undefined : p.id)}>
              <MapPin size={14} /> {p.name}
            </button>
          ))}
          <button className="chip add" onClick={() => setPlaceDialog(true)}>
            <Plus size={14} /> New place
          </button>
        </div>
      </div>

      <button className="btn primary block" style={{ marginTop: 30 }} onClick={save}>
        Save episode
      </button>
      <button className="btn block" style={{ marginTop: 10 }} onClick={() => back()}>
        Cancel
      </button>

      <NewTagDialog
        open={tagDialog}
        onClose={() => setTagDialog(false)}
        onCreate={(t) => {
          store.upsertTag(t);
          setTags((list) => [...list, t.id]);
        }}
        existing={data.tags}
      />
      <NewPlaceDialog
        open={placeDialog}
        onClose={() => setPlaceDialog(false)}
        onCreate={(p) => {
          store.upsertPlace(p);
          setPlaceId(p.id);
        }}
      />
    </div>
  );
}

function NewTagDialog({ open, onClose, onCreate, existing }: { open: boolean; onClose: () => void; onCreate: (t: Tag) => void; existing: Tag[] }) {
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("⭐");
  const [genre, setGenre] = useState("Other");
  const clash = existing.some((t) => t.name.toLowerCase() === name.trim().toLowerCase());
  const create = () => {
    if (!name.trim() || clash) return;
    onCreate({ id: uid("t"), name: name.trim(), emoji, genre });
    setName("");
    onClose();
  };
  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="h2" style={{ marginBottom: 14 }}>
        New tag
      </h2>
      <div className="stack">
        <label className="field">
          <span>Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Board Games" autoFocus />
          {clash && <span className="small" style={{ color: "var(--danger)" }}>You already have a tag with that name.</span>}
        </label>
        <div className="field">
          <span>Emoji</span>
          <div className="chips">
            {EMOJI_CHOICES.map((e) => (
              <button key={e} className="chip selectable" aria-pressed={emoji === e} onClick={() => setEmoji(e)} style={{ fontSize: 18, padding: "5px 9px" }}>
                {e}
              </button>
            ))}
          </div>
        </div>
        <label className="field">
          <span>Genre</span>
          <select className="select" value={genre} onChange={(e) => setGenre(e.target.value)}>
            {GENRES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </label>
        <button className="btn primary block" onClick={create} disabled={!name.trim() || clash}>
          Create tag
        </button>
      </div>
    </Dialog>
  );
}

interface GeoResult {
  display_name: string;
  lat: string;
  lon: string;
}

function NewPlaceDialog({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (p: Place) => void }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [results, setResults] = useState<GeoResult[]>([]);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setName("");
    setCoords(null);
    setResults([]);
  };

  const locate = () => {
    if (!navigator.geolocation) return toast("Location isn't available on this device.");
    setBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setBusy(false);
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        toast("Pinned your current location");
      },
      () => {
        setBusy(false);
        toast("Couldn't get your location.");
      },
      { enableHighAccuracy: false, timeout: 10_000 },
    );
  };

  const lookup = async () => {
    if (!name.trim()) return;
    setBusy(true);
    try {
      // OpenStreetMap's free geocoder. One request per tap keeps us well within its usage policy.
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=5&q=${encodeURIComponent(name.trim())}`, {
        headers: { Accept: "application/json" },
      });
      const list = (await res.json()) as GeoResult[];
      setResults(list);
      if (!list.length) toast("No matches — you can still save it without a pin.");
    } catch {
      toast("Couldn't search the map right now.");
    } finally {
      setBusy(false);
    }
  };

  const create = () => {
    if (!name.trim()) return;
    onCreate({ id: uid("pl"), name: name.trim(), ...(coords ?? {}) });
    reset();
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={() => {
        reset();
        onClose();
      }}
    >
      <h2 className="h2" style={{ marginBottom: 14 }}>
        New place
      </h2>
      <div className="stack">
        <label className="field">
          <span>Name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Greenwich Village" autoFocus />
        </label>
        <div className="row">
          <button className="btn small grow" onClick={lookup} disabled={busy || !name.trim()}>
            <Search size={16} /> Find on map
          </button>
          <button className="btn small grow" onClick={locate} disabled={busy}>
            <LocateFixed size={16} /> I'm here
          </button>
        </div>
        {results.length > 0 && (
          <div className="col" style={{ gap: 6 }}>
            {results.map((r) => (
              <button
                key={`${r.lat},${r.lon}`}
                className="list-row"
                style={{ padding: 10 }}
                onClick={() => {
                  setCoords({ lat: Number(r.lat), lng: Number(r.lon) });
                  setResults([]);
                }}
              >
                <MapPin size={16} color="#f7a531" />
                <span className="grow small" style={{ lineHeight: 1.35 }}>
                  {r.display_name}
                </span>
              </button>
            ))}
          </div>
        )}
        {coords && (
          <div className="row small muted">
            <MapPin size={14} color="#4ade80" /> Pinned at {coords.lat.toFixed(3)}, {coords.lng.toFixed(3)}
            <button className="icon-btn" style={{ width: 26, height: 26 }} onClick={() => setCoords(null)} aria-label="Remove pin">
              <X size={14} />
            </button>
          </div>
        )}
        <button className="btn primary block" onClick={create} disabled={!name.trim()}>
          Add place
        </button>
        <div className="key-hint">Places with a pin show up on your Locations map. Map search uses OpenStreetMap.</div>
      </div>
    </Dialog>
  );
}
