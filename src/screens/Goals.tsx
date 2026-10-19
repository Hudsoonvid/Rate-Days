import {
  Ban, Banknote, BookOpen, Check, ChevronRight, Crosshair, Dumbbell, Flag, Flame, Footprints, Leaf, Moon, Plus, Trash2, Users, Wind,
  type LucideIcon,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Delta, Dialog, Ring, TopBar, useToast } from "../components/ui";
import { commitmentResult, weekCount, weekStreak } from "../lib/goals";
import { GOAL_PRESETS } from "../lib/presets";
import { fmt } from "../lib/ratings";
import { sortedDays } from "../lib/stats";
import { uid, useStore } from "../lib/store";
import type { Commitment } from "../lib/types";

const ICONS: Record<string, LucideIcon> = {
  dumbbell: Dumbbell, moon: Moon, leaf: Leaf, ban: Ban, crosshair: Crosshair, footprints: Footprints,
  wind: Wind, users: Users, book: BookOpen, banknote: Banknote,
};
const RING_COLORS = ["#4ade80", "#7c6cff", "#f7a531", "#f7c948", "#8e8e93", "#ff5a4f", "#4fd1c5"];

export function Goals() {
  const store = useStore();
  const { data, today } = store;
  const toast = useToast();
  const { goals } = data;
  const [editing, setEditing] = useState<Commitment | null>(null);
  const [adding, setAdding] = useState(false);
  const days = useMemo(() => sortedDays(data.days), [data.days]);
  const tagById = new Map(data.tags.map((t) => [t.id, t]));

  const toggleGoal = (id: string) => {
    const preset = GOAL_PRESETS.find((g) => g.id === id)!;
    const on = goals.selected.includes(id);
    const selected = on ? goals.selected.filter((g) => g !== id) : [...goals.selected, id];
    let commitments = goals.commitments;
    if (!on && !commitments.some((c) => c.tagId === preset.suggestion.tagId)) {
      commitments = [...commitments, { id: uid("c"), goalId: id, ...preset.suggestion }];
      toast(`Added “${preset.suggestion.label}” · ${preset.suggestion.perWeek}× a week`);
    }
    store.setGoals({ selected, commitments });
  };

  const saveCommitment = (c: Commitment) => {
    const exists = goals.commitments.some((x) => x.id === c.id);
    store.setGoals({ ...goals, commitments: exists ? goals.commitments.map((x) => (x.id === c.id ? c : x)) : [...goals.commitments, c] });
  };
  const removeCommitment = (id: string) => store.setGoals({ ...goals, commitments: goals.commitments.filter((c) => c.id !== id) });

  return (
    <div className="app">
      <TopBar close right={<span />} />
      <div className="feature-head">
        <div className="feature-icon">
          <Flag size={28} fill="#f7a531" />
        </div>
        <h1>Your Season Goal</h1>
        <p>What you're chasing, your commitments, and the results</p>
      </div>

      <div className="section">
        <div className="eyebrow">This season I want to</div>
        <div className="small muted" style={{ margin: "2px 0 12px" }}>
          pick as many as you like — they shape your commitments
        </div>
        <div className="goal-grid">
          {GOAL_PRESETS.map((g) => {
            const Icon = ICONS[g.icon];
            const on = goals.selected.includes(g.id);
            return (
              <button key={g.id} className="goal-chip" aria-pressed={on} onClick={() => toggleGoal(g.id)}>
                <Icon size={18} color={on ? "#4ade80" : "#8e8e93"} /> {g.label}
                {on && <Check size={16} className="check" strokeWidth={3} />}
              </button>
            );
          })}
        </div>
      </div>

      <div className="section">
        <div className="eyebrow">Weekly commitments</div>
        <div className="small muted" style={{ margin: "2px 0 12px" }}>
          tag the day and the habit ticks itself
        </div>
        {goals.commitments.map((c, i) => {
          const n = weekCount(data.days, c, today);
          const color = RING_COLORS[i % RING_COLORS.length];
          const streak = weekStreak(data.days, c, today);
          const tag = tagById.get(c.tagId);
          return (
            <button key={c.id} className="commit-row" onClick={() => setEditing(c)}>
              <Ring value={n} max={c.perWeek} color={color} size={48}>
                <span style={{ fontSize: 19 }}>{tag?.emoji ?? "⭐"}</span>
              </Ring>
              <span className="grow">
                <div style={{ fontWeight: 600, fontSize: 17 }}>{c.label}</div>
                <div className="small" style={{ color: n >= c.perWeek ? "#4ade80" : n > 0 ? "#f7a531" : "var(--muted)" }}>
                  {n} of {c.perWeek} this week
                </div>
              </span>
              {streak >= 2 && (
                <span className="streak-badge">
                  <Flame size={13} /> {streak}w
                </span>
              )}
              {n >= c.perWeek && streak < 2 && <Flame size={20} color="#f7a531" />}
              <ChevronRight size={18} className="dim" />
            </button>
          );
        })}
        <button className="btn block" style={{ marginTop: 12 }} onClick={() => setAdding(true)}>
          <Plus size={18} /> Add a commitment
        </button>
      </div>

      {goals.commitments.length > 0 && days.length > 0 && (
        <div className="section">
          <div className="eyebrow">The results</div>
          <div className="small muted" style={{ margin: "2px 0 12px" }}>
            your average on days you did it vs days you didn't
          </div>
          <div className="card">
            {goals.commitments.map((c) => {
              const r = commitmentResult(days, c);
              return (
                <div key={c.id} className="impact-row">
                  <span className="emoji">{tagById.get(c.tagId)?.emoji ?? "⭐"}</span>
                  <span className="grow">
                    <div>{c.label}</div>
                    <div className="small muted">
                      {r.withCount ? `${fmt(r.withAvg)} with · ${fmt(r.withoutAvg)} without · ${r.withCount} days` : "not tagged yet"}
                    </div>
                  </span>
                  {r.withCount > 0 && r.withoutCount > 0 && <Delta value={r.withAvg - r.withoutAvg} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <CommitmentDialog
        key={editing?.id ?? (adding ? "new" : "none")}
        open={Boolean(editing) || adding}
        initial={editing}
        onClose={() => {
          setEditing(null);
          setAdding(false);
        }}
        onSave={saveCommitment}
        onDelete={editing ? () => removeCommitment(editing.id) : undefined}
      />
    </div>
  );
}

function CommitmentDialog({ open, initial, onClose, onSave, onDelete }: {
  open: boolean;
  initial: Commitment | null;
  onClose: () => void;
  onSave: (c: Commitment) => void;
  onDelete?: () => void;
}) {
  const { data } = useStore();
  const [tagId, setTagId] = useState(initial?.tagId ?? data.tags[0]?.id ?? "");
  const [label, setLabel] = useState(initial?.label ?? "");
  const [perWeek, setPerWeek] = useState(initial?.perWeek ?? 3);
  const tag = data.tags.find((t) => t.id === tagId);

  return (
    <Dialog open={open} onClose={onClose}>
      <h2 className="h2" style={{ marginBottom: 14 }}>
        {initial ? "Edit commitment" : "New commitment"}
      </h2>
      <div className="stack">
        <label className="field">
          <span>Counts a day when it's tagged</span>
          <select className="select" value={tagId} onChange={(e) => setTagId(e.target.value)}>
            {data.tags
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name))
              .map((t) => (
                <option key={t.id} value={t.id}>
                  {t.emoji} {t.name}
                </option>
              ))}
          </select>
        </label>
        <label className="field">
          <span>Name</span>
          <input className="input" value={label} onChange={(e) => setLabel(e.target.value)} placeholder={tag?.name ?? "Daily walk"} />
        </label>
        <div className="field">
          <span>Times per week</span>
          <div className="segmented">
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <button key={n} aria-pressed={perWeek === n} onClick={() => setPerWeek(n)} style={{ padding: "8px 13px" }}>
                {n}
              </button>
            ))}
          </div>
        </div>
        <button
          className="btn primary block"
          disabled={!tagId}
          onClick={() => {
            onSave({ id: initial?.id ?? uid("c"), goalId: initial?.goalId, tagId, perWeek, label: label.trim() || tag?.name || "Commitment" });
            onClose();
          }}
        >
          Save
        </button>
        {onDelete && (
          <button
            className="btn danger block"
            onClick={() => {
              onDelete();
              onClose();
            }}
          >
            <Trash2 size={17} /> Remove commitment
          </button>
        )}
      </div>
    </Dialog>
  );
}
