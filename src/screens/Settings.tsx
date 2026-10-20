import { CalendarRange, Check, Copy, Database, Download, Plug, Smartphone, Sparkles, Trash2, Upload, UserRound } from "lucide-react";
import { useState } from "react";
import { Dialog, Legend, Segmented, TopBar, useToast } from "../components/ui";
import { formatShort, MONTHS, MONTHS_SHORT, todayISO } from "../lib/dates";
import { downloadText } from "../lib/image";
import { connectToAi, mixedContentWarning, normalizeServerUrl } from "../lib/localAi";
import { NarratorError } from "../lib/recapPrompt";
import { navigate } from "../lib/router";
import { seasonOf } from "../lib/seasons";
import { parseBackup, serializeBackup, useStore } from "../lib/store";
import type { SeriesFormat } from "../lib/types";

const SETUP_COMMAND = "irm https://raw.githubusercontent.com/Hudsoonvid/Rate-Days/main/ai/setup.ps1 | iex";

export function SettingsScreen() {
  const store = useStore();
  const { data, persistent } = store;
  const toast = useToast();
  const [confirm, setConfirm] = useState<null | "demo" | "reset">(null);
  const count = Object.keys(data.days).length;

  const exportData = () => {
    downloadText(`ratedays-backup-${todayISO()}.json`, serializeBackup(data));
    toast("Backup downloaded");
  };

  const importData = async (file?: File) => {
    if (!file) return;
    try {
      const next = parseBackup(await file.text());
      next.settings = data.settings;
      await store.replaceAll(next);
      toast(`Imported ${Object.keys(next.days).length} episodes`);
    } catch (e) {
      toast(e instanceof SyntaxError ? "That file isn't valid JSON." : (e as Error).message);
    }
  };

  return (
    <div className="app">
      <TopBar title="Settings" />

      <div className="section" style={{ marginTop: 10 }}>
        <button className="list-row" onClick={() => navigate("/profile")}>
          <UserRound size={20} color="#b57bff" />
          <span className="grow">
            <b>Profile & poster</b>
            <div className="small muted">{data.profile.storyTitle || "My Story"}</div>
          </span>
        </button>
      </div>

      <SeasonFormatCard />
      <AiCard />

      <div className="section">
        <h2 className="section-title h3">
          <Database size={18} color="#4fd1c5" /> Your data
        </h2>
        <div className="card stack">
          <div className="small muted">
            {count} episode{count === 1 ? "" : "s"} · {data.people.length} characters · {data.places.length} places · {data.tags.length} tags
            {!persistent && <div style={{ color: "var(--danger)", marginTop: 6 }}>This browser isn't letting RateDays save data — changes will be lost when you close it.</div>}
          </div>
          <button className="btn block" onClick={exportData}>
            <Download size={18} /> Export backup (.json)
          </button>
          <label className="btn block" style={{ position: "relative" }}>
            <Upload size={18} /> Import backup
            <input type="file" accept="application/json,.json" style={{ position: "absolute", inset: 0, opacity: 0 }} onChange={(e) => importData(e.target.files?.[0])} />
          </label>
          <button className="btn block" onClick={() => setConfirm("demo")}>
            🎬 Load demo year
          </button>
          <button className="btn danger block" onClick={() => setConfirm("reset")}>
            <Trash2 size={18} /> Erase everything
          </button>
        </div>
      </div>

      <div className="section">
        <h2 className="section-title h3">
          <Smartphone size={18} color="#5ea0ff" /> Install on your phone
        </h2>
        <div className="card small muted" style={{ lineHeight: 1.55 }}>
          On iPhone, open this page in Safari, tap <b style={{ color: "#fff" }}>Share</b>, then <b style={{ color: "#fff" }}>Add to Home Screen</b>. On Android, use
          the browser menu's <b style={{ color: "#fff" }}>Install app</b>. RateDays then opens full-screen and works offline. Everything is stored on your device.
        </div>
      </div>

      <div className="section">
        <h2 className="section-title h3">Rating scale</h2>
        <div className="card">
          <Legend />
          <p className="small muted center" style={{ marginBottom: 0 }}>
            9+ Awesome · 8+ Great · 7+ Good · 5+ Average · 3+ Bad · under 3 Garbage
          </p>
        </div>
      </div>

      <Dialog open={confirm !== null} onClose={() => setConfirm(null)}>
        <h2 className="h2">{confirm === "demo" ? "Load the demo year?" : "Erase everything?"}</h2>
        <p className="muted">
          {confirm === "demo"
            ? "This replaces your current episodes, cast, places and goals with a sample year. Export a backup first if you want to keep them."
            : "Every episode, photo, person, place and goal on this device will be deleted. This can't be undone."}
        </p>
        <div className="col">
          <button
            className={`btn block ${confirm === "demo" ? "primary" : "danger"}`}
            onClick={async () => {
              if (confirm === "demo") await store.loadDemo();
              else await store.reset();
              setConfirm(null);
              navigate("/", { replace: true });
            }}
          >
            {confirm === "demo" ? "Load demo" : "Erase"}
          </button>
          <button className="btn block" onClick={() => setConfirm(null)}>
            Cancel
          </button>
        </div>
      </Dialog>
    </div>
  );
}

function SeasonFormatCard() {
  const { data, series, setFormat } = useStore();
  const toast = useToast();
  const f = data.format;
  const school = f.mode === "school";
  const first = seasonOf(series.premiere, series);
  const update = (next: SeriesFormat) => {
    setFormat(next);
    toast(next.mode === "school" ? "Seasons are now semesters" : "Seasons are now months");
  };
  const summer = f.springEnd + 1 <= f.schoolStart - 1;

  return (
    <div className="section">
      <h2 className="section-title h3">
        <CalendarRange size={18} color="#4ade80" /> Seasons
      </h2>
      <div className="card stack">
        <Segmented
          value={f.mode}
          onChange={(mode) => update({ ...f, mode })}
          options={[
            { value: "calendar", label: "Months" },
            { value: "school", label: "School year" },
          ]}
        />
        <p className="small muted" style={{ marginBottom: 0, lineHeight: 1.5 }}>
          {school ? (
            <>
              Each semester is a season: <b style={{ color: "#fff" }}>Fall</b> ({MONTHS_SHORT[f.schoolStart]}–Dec), <b style={{ color: "#fff" }}>Spring</b> (Jan–
              {MONTHS_SHORT[f.springEnd]}){summer ? (
                <>
                  {" "}and <b style={{ color: "#fff" }}>Summer break</b> ({MONTHS_SHORT[f.springEnd + 1]}
                  {f.schoolStart - 1 > f.springEnd + 1 ? `–${MONTHS_SHORT[f.schoolStart - 1]}` : ""})
                </>
              ) : null}
              . The year runs {MONTHS_SHORT[f.schoolStart]} to {MONTHS_SHORT[(f.schoolStart + 11) % 12]}.
            </>
          ) : (
            <>Each month is a season.</>
          )}{" "}
          Season 1 is <b style={{ color: "#fff" }}>{first.name}</b>, starting with your first episode ({formatShort(series.premiere)}); every{" "}
          {school ? "semester" : "month"} after that is the next season.
        </p>
        {school && (
          <div className="row" style={{ gap: 10 }}>
            <label className="field grow">
              <span>Fall starts</span>
              <select className="select" value={f.schoolStart} onChange={(e) => update({ ...f, schoolStart: Number(e.target.value) })}>
                {[6, 7, 8].map((m) => (
                  <option key={m} value={m}>
                    {MONTHS[m]}
                  </option>
                ))}
              </select>
            </label>
            <label className="field grow">
              <span>Spring ends</span>
              <select className="select" value={f.springEnd} onChange={(e) => update({ ...f, springEnd: Number(e.target.value) })}>
                {[3, 4, 5].map((m) => (
                  <option key={m} value={m}>
                    {MONTHS[m]}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}
      </div>
    </div>
  );
}

function AiCard() {
  const { data, setSettings } = useStore();
  const toast = useToast();
  const s = data.settings;
  const [url, setUrl] = useState(s.localUrl);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [help, setHelp] = useState(false);
  const connected = Boolean(s.localUrl && s.localModel);
  const warning = url.trim() ? mixedContentWarning(normalizeServerUrl(url), window.location.protocol) : null;

  const connect = async () => {
    setBusy(true);
    setError(null);
    try {
      const { url: address, model } = await connectToAi(url);
      setSettings({ localUrl: address, localModel: model });
      toast("Connected to AI");
    } catch (e) {
      setError(e instanceof NarratorError ? e.message : "Couldn't connect.");
    } finally {
      setBusy(false);
    }
  };

  const copyCommand = async () => {
    try {
      await navigator.clipboard.writeText(SETUP_COMMAND);
      toast("Copied — paste it into PowerShell on that computer");
    } catch {
      toast("Couldn't copy; select the command and copy it manually");
    }
  };

  return (
    <div className="section">
      <h2 className="section-title h3">
        <Sparkles size={18} color="#f7c948" /> Connect to AI
      </h2>
      <div className="card stack">
        {connected ? (
          <>
            <div className="row">
              <span className="nav-icon" style={{ background: "rgba(74,222,128,0.14)", color: "#4ade80" }}>
                <Check size={20} strokeWidth={3} />
              </span>
              <span className="grow">
                <b>Connected</b>
                <div className="small muted ellipsis">{s.localUrl}</div>
              </span>
            </div>
            <p className="small muted" style={{ marginBottom: 0, lineHeight: 1.5 }}>
              Open the Narrator's Cut and tap <b style={{ color: "#fff" }}>Write with AI</b>.
            </p>
            <button
              className="btn block"
              onClick={() => {
                setSettings({ localUrl: "", localModel: "" });
                setUrl("");
              }}
            >
              Disconnect
            </button>
          </>
        ) : (
          <>
            <p className="small muted" style={{ marginBottom: 0, lineHeight: 1.5 }}>
              Let an AI write your recaps. It runs on your own computer, so your episodes never leave your devices.
            </p>
            <input
              className="input"
              style={{ background: "var(--card-2)" }}
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && url.trim() && !busy && connect()}
              placeholder="Paste your AI address"
              aria-label="AI address"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              inputMode="url"
            />
            {warning && <p className="small" style={{ color: "#f7c948", marginBottom: 0 }}>{warning}</p>}
            <button className="btn primary block" onClick={connect} disabled={busy || !url.trim()}>
              <Plug size={17} /> {busy ? "Connecting…" : "Connect"}
            </button>
            {busy && <p className="small muted center" style={{ marginBottom: 0 }}>The first connection can take a minute while the AI starts up.</p>}
            {error && <p className="small" style={{ color: "var(--danger)", marginBottom: 0 }}>{error}</p>}
            <button className="text-btn small" style={{ alignSelf: "flex-start", padding: 0 }} onClick={() => setHelp(!help)}>
              {help ? "Hide setup" : "Don't have an address? Set it up"}
            </button>
            {help && (
              <ol className="small muted" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.6 }}>
                <li>
                  Install <a href="https://tailscale.com/download" target="_blank" rel="noreferrer" style={{ color: "var(--link)" }}>Tailscale</a> on
                  this phone and on a Windows PC with a good graphics card, and sign in to both.
                </li>
                <li>
                  On the PC, open PowerShell and run:
                  <code className="tiny" style={{ display: "block", wordBreak: "break-all", color: "#c7c7cc", margin: "6px 0", lineHeight: 1.5 }}>
                    {SETUP_COMMAND}
                  </code>
                  <button className="btn small" onClick={copyCommand}>
                    <Copy size={14} /> Copy
                  </button>
                </li>
                <li>Paste the address it prints above and tap Connect.</li>
              </ol>
            )}
          </>
        )}
      </div>
    </div>
  );
}
