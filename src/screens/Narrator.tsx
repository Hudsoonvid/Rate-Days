import { ChevronLeft, ChevronRight, MonitorPlay, RefreshCw, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { Segmented, TopBar } from "../components/ui";
import { localRecap as aiRecap } from "../lib/localAi";
import { gatherFacts, localRecap, type RecapContent } from "../lib/narrator";
import { periodContaining, shiftPeriod, type PeriodKind } from "../lib/periods";
import { describeRecapSource, NarratorError } from "../lib/recapPrompt";
import { navigate } from "../lib/router";
import { inRange, sortedDays } from "../lib/stats";
import { useStore } from "../lib/store";

const KINDS: PeriodKind[] = ["week", "season", "year"];

export function Narrator({ initialKind }: { initialKind: string | null }) {
  const { data, today, series, saveRecap } = useStore();
  const { settings } = data;
  const [kind, setKind] = useState<PeriodKind>(KINDS.includes(initialKind as PeriodKind) ? (initialKind as PeriodKind) : "season");
  const all = useMemo(() => sortedDays(data.days), [data.days]);

  const startFor = (k: PeriodKind) => {
    const p = periodContaining(k, today, series);
    // A brand-new week or season has nothing to recap yet; open on the last one instead.
    return inRange(all, p.start, p.end).length ? 0 : -1;
  };
  const [offset, setOffset] = useState(() => startFor(kind));
  const period = shiftPeriod(periodContaining(kind, today, series), offset);
  const facts = useMemo(() => gatherFacts(data, period), [data, period.key, series]);
  const cached = data.recaps[period.key];
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  let recap: RecapContent = localRecap(facts);
  let source = "Told by the built-in narrator";
  if (cached) {
    try {
      recap = JSON.parse(cached.text) as RecapContent;
      source = describeRecapSource(cached.createdAt, cached.source);
    } catch {
      // Ignore a corrupt cache entry and fall back to the built-in recap.
    }
  }

  const changeKind = (k: PeriodKind) => {
    setKind(k);
    setOffset(startFor(k));
    setError(null);
  };

  const connected = Boolean(settings.localUrl && settings.localModel);

  const write = async () => {
    setBusy(true);
    setError(null);
    try {
      const content = await aiRecap(settings, data, facts);
      saveRecap({ key: period.key, text: JSON.stringify(content), createdAt: Date.now(), source: "AI" });
    } catch (e) {
      setError(e instanceof NarratorError ? e.message : "Something went wrong writing the recap.");
    } finally {
      setBusy(false);
    }
  };

  const atLatest = offset >= 0;

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
            { value: "season", label: data.format.mode === "school" ? "Semester" : "Season" },
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
          {connected ? (
            <button className="btn primary block" onClick={write} disabled={busy}>
              {busy ? (
                <>
                  <RefreshCw size={18} className="spin" /> The AI is writing…
                </>
              ) : (
                <>
                  <Sparkles size={18} /> {cached ? "Rewrite with AI" : "Write with AI"}
                </>
              )}
            </button>
          ) : (
            <button className="list-row" onClick={() => navigate("/settings")}>
              <Sparkles size={20} color="#f7c948" />
              <span className="grow small">
                <b>Connect to AI</b>
                <div className="muted">Have an AI write this recap. Set it up once in Settings.</div>
              </span>
              <ChevronRight size={18} className="chev" />
            </button>
          )}
          {busy && (
            <p className="small muted center" style={{ marginTop: 10 }}>
              This can take a minute.
            </p>
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
