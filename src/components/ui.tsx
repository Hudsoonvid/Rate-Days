import { BarChart3, ChevronLeft, ChevronRight, Clapperboard, Crown, Plus, Search, Settings, X } from "lucide-react";
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { back, navigate } from "../lib/router";
import { fmt, fmtDelta, TIERS, tierFor } from "../lib/ratings";
import type { Day, Tag } from "../lib/types";

export function AppHeader() {
  return (
    <header className="app-header">
      <button className="brand" onClick={() => navigate("/")} aria-label="Home">
        <span>
          Rate<span className="days">Days</span>
        </span>
      </button>
      <button className="crown" onClick={() => navigate("/narrator")} aria-label="The Narrator's Cut">
        <Crown size={17} strokeWidth={2.4} />
      </button>
      <div className="grow" />
      <button className="icon-btn" onClick={() => navigate("/search")} aria-label="Search">
        <Search size={22} />
      </button>
      <button className="icon-btn" onClick={() => navigate("/finales")} aria-label="Season finales">
        <Clapperboard size={22} />
      </button>
      <button className="icon-btn" onClick={() => navigate("/stats")} aria-label="Stats">
        <BarChart3 size={23} strokeWidth={2.6} />
      </button>
      <button className="icon-btn" onClick={() => navigate("/settings")} aria-label="Settings">
        <Settings size={22} />
      </button>
      <button className="plus-btn" onClick={() => navigate("/edit/today")} aria-label="Rate today">
        <Plus size={22} strokeWidth={3} />
      </button>
    </header>
  );
}

export function TopBar({ title, right, onBack, backLabel = "Back", close }: {
  title?: ReactNode;
  right?: ReactNode;
  onBack?: () => void;
  backLabel?: string;
  /** Render a round × on the right instead of a back chevron on the left. */
  close?: boolean;
}) {
  const goBack = onBack ?? (() => back());
  return (
    <div className="top-bar">
      <div className="left">
        {!close && (
          <button className="back-btn" onClick={goBack}>
            <ChevronLeft size={26} /> {backLabel}
          </button>
        )}
      </div>
      <div className="title">{title}</div>
      <div className="right">
        {right}
        {close && (
          <button className="close-btn" onClick={goBack} aria-label="Close">
            <X size={18} strokeWidth={2.6} />
          </button>
        )}
      </div>
    </div>
  );
}

export function RatingBadge({ rating, size = 40 }: { rating: number; size?: number }) {
  const t = tierFor(rating);
  return (
    <span className="badge" style={{ width: size, height: size, background: t.color, color: t.ink, fontSize: size * 0.36 }}>
      {fmt(rating)}
    </span>
  );
}

export function SeasonBadge({ label, avg }: { label: string; avg: number }) {
  const t = tierFor(avg);
  return (
    <span className="season-badge" style={{ background: t.color, color: t.ink, fontSize: label.length > 3 ? 14 : 17 }}>
      {label}
    </span>
  );
}

const AVATAR_COLORS = ["#2f6df6", "#7c4dff", "#00a3a3", "#e2563b", "#d6337f", "#3f9c35", "#c97a00", "#5865f2"];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

export function Avatar({ name, large }: { name: string; large?: boolean }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return (
    <span className={`avatar${large ? " lg" : ""}`} style={{ background: AVATAR_COLORS[h % AVATAR_COLORS.length] }}>
      {initials(name)}
    </span>
  );
}

export function Legend() {
  return (
    <div className="legend">
      {TIERS.map((t) => (
        <span key={t.key}>
          <i className="dot" style={{ background: t.color }} /> {t.label}
        </span>
      ))}
    </div>
  );
}

export function Delta({ value }: { value: number }) {
  return <span className={`delta ${value >= 0 ? "pos" : "neg"}`}>{fmtDelta(value)}</span>;
}

export function Ring({ value, max, color, size = 46, children }: { value: number; max: number; color: string; size?: number; children?: ReactNode }) {
  const stroke = 4;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max ? Math.min(1, value / max) : 0;
  return (
    <span style={{ position: "relative", width: size, height: size, display: "inline-grid", placeItems: "center", flex: "none" }}>
      <svg width={size} height={size} style={{ position: "absolute", inset: 0, transform: "rotate(-90deg)" }} aria-hidden>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#2c2c30" strokeWidth={stroke} />
        {pct > 0 && (
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />
        )}
      </svg>
      <span style={{ color, display: "grid", placeItems: "center" }}>{children}</span>
    </span>
  );
}

export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="segmented" role="group">
      {options.map((o) => (
        <button key={o.value} aria-pressed={o.value === value} onClick={() => onChange(o.value)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Pager({ page, pageSize, total, onChange }: { page: number; pageSize: number; total: number; onChange: (p: number) => void }) {
  if (total <= pageSize) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, from + pageSize - 1);
  return (
    <span className="pager">
      <button onClick={() => onChange(page - 1)} disabled={page === 0} aria-label="Previous page">
        <ChevronLeft size={18} />
      </button>
      {from}–{to}
      <button onClick={() => onChange(page + 1)} disabled={to >= total} aria-label="Next page">
        <ChevronRight size={18} />
      </button>
    </span>
  );
}

export function Empty({ emoji = "🎬", title, children }: { emoji?: string; title: string; children?: ReactNode }) {
  return (
    <div className="empty">
      <div className="emoji">{emoji}</div>
      <div style={{ color: "var(--text)", fontWeight: 600, marginBottom: 6 }}>{title}</div>
      <div className="small">{children}</div>
    </div>
  );
}

export function Dialog({ open, onClose, children }: { open: boolean; onClose: () => void; children: ReactNode }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="backdrop" onClick={onClose}>
      <div className="dialog" role="dialog" aria-modal onClick={(e) => e.stopPropagation()}>
        <div className="grabber" />
        {children}
      </div>
    </div>
  );
}

/** Artwork for a day without a photo: its tier colour plus its headline tag. */
export function Poster({ day, tags, className }: { day: Day; tags: Tag[]; className?: string }) {
  const t = tierFor(day.rating);
  const tag = tags.find((x) => x.id === day.tags[0]);
  return (
    <div
      className={`poster ${className ?? ""}`}
      style={{ background: `radial-gradient(90% 90% at 30% 20%, ${t.color} 0%, ${t.color}99 35%, #121214 100%)` }}
    >
      <span className="emoji">{tag?.emoji ?? "🎬"}</span>
    </div>
  );
}

// ---------- toast ----------

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const timer = useRef<number>();
  const show = useCallback((m: string) => {
    setMsg(m);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), 2600);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
