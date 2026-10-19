import { ChevronLeft, ChevronRight, MonitorPlay, RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Segmented, TopBar } from "../components/ui";
import { aiRecap, describeRecapSource, NarratorError } from "../lib/claude";
import { gatherFacts, localRecap, type RecapContent } from "../lib/narrator";
import { periodContaining, shiftPeriod, type PeriodKind } from "../lib/periods";
import { navigate } from "../lib/router";
import { inRange, sortedDays } from "../lib/stats";
import { useStore } from "../lib/store";

const KINDS: PeriodKind[] = ["week", "season", "year"];

export function Narrator({ initialKind }: { initialKind: string | null }) {
  const { data, today, saveRecap } = useStore();
  const [kind, setKind] = useState<PeriodKind>(KINDS.includes(initialKind as PeriodKind) ? (initialKind as PeriodKind) : "season");
  const all = useMemo(() => sortedDays(data.days), [data.days]);

  const startFor = (k: PeriodKind) => {
    const p = periodContaining(k, today);
    // A brand-new week or month has nothing to recap yet; open on the last one instead.
    return inRange(all, p.start, p.end).length ? 0 : -1;
  };
  const [offset, setOffset] = useState(() => startFor(kind));
  const period = shiftPeriod(periodContaining(kind, today), offset);
  const facts = useMemo(() => gatherFacts(data, period), [data, period.key]);
  const cached = data.recaps[period.key];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let recap: RecapContent = localRecap(facts);
  let source = "Told by your local narrator";
  if (cached) {
    try {
      recap = JSON.parse(cached.text) as RecapContent;
      source = describeRecapSource(cached.createdAt);
    } catch {
      // Ignore a corrupt cache entry and fall back to the local recap.
    }
  }

  const changeKind = (k: PeriodKind) => {
    setKind(k);
    setOffset(startFor(k));
    setError(null);
  };

  const writeWithClaude = async () => {
    setBusy(true);
    setError(null);
    try {
      const content = await aiRecap(data.settings.apiKey, data, facts);
      saveRecap({ key: period.key, text: JSON.stringify(content), createdAt: Date.now() });
    } catch (e) {
      setError(e instanceof NarratorError ? e.message : "Something went wrong writing the recap.");
    } finally {
      setBusy(false);
    }
  };

  const atLatest = offset >= 0;
  const hasKey = Boolean(data.settings.apiKey);

  return (
    <div className="app">
      <TopBar close right={<span />} />
      <div className="feature-head">
        <div className="feature-icon">
          <MonitorPlay size={30} />
        </div>
        <h1>The Narrator's Cut</h1>
        <p>Your story, told by the one who's seen every episode</p>
      </div>

      <div className="center" style={{ marginTop: 16 }}>
        <Segmented
          value={kind}
          onChange={changeKind}
          options={[
            { value: "week", label: "Week" },
            { value: "season", label: "Season" },
            { value: "year", label: "Year" },
          ]}
        />
      </div>

      <div className="recap-card">
        <div className="period-nav">
          <button className="icon-btn" onClick={() => setOffset(offset - 1)} aria-label="Previous">
            <ChevronLeft size={22} />
          </button>
          <div className="center">
            <div style={{ fontSize: 22, fontWeight: 800 }}>{period.title}</div>
            <div className="small muted">{period.subtitle}</div>
          </div>
          <button className="icon-btn" onClick={() => setOffset(offset + 1)} disabled={atLatest} aria-label="Next">
            <ChevronRight size={22} />
          </button>
        </div>

        <p className="logline">{recap.logline}</p>
        <hr />
        {recap.best && (
          <p>
            <span className="label">Best episode:</span> {recap.best.title} ({recap.best.when}). {recap.best.line}
          </p>
        )}
        {recap.worst && (
          <p>
            <span className="label">Worst episode:</span> {recap.worst.title} ({recap.worst.when}). {recap.worst.line}
          </p>
        )}
        {recap.paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p style={{ fontStyle: "italic" }}>{recap.closing}</p>
        <div className="tiny dim" style={{ marginTop: 8 }}>
          {source}
        </div>
      </div>

      {facts.days.length > 0 && (
        <div style={{ marginTop: 16 }}>
          {hasKey ? (
            <button className="btn primary block" onClick={writeWithClaude} disabled={busy}>
              {busy ? (
                <>
                  <RefreshCw size={18} className="spin" /> The narrator is writing…
                </>
              ) : (
                <>
                  <Sparkles size={18} /> {cached ? "Rewrite with Claude" : "Write this recap with Claude"}
                </>
              )}
            </button>
          ) : (
            <button className="list-row" onClick={() => navigate("/settings")}>
              <Sparkles size={20} color="#f7c948" />
              <span className="grow small">
                <b>Want an AI-written recap?</b>
                <div className="muted">Add your Anthropic API key in Settings and Claude will narrate each week, season and year.</div>
              </span>
              <ChevronRight size={18} className="chev" />
            </button>
          )}
          {error && (
            <p className="small" style={{ color: "var(--danger)", marginTop: 10 }}>
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
