import { Database, Download, Eye, EyeOff, KeyRound, Smartphone, Sparkles, Trash2, Upload, UserRound } from "lucide-react";
import { useState } from "react";
import { Dialog, Legend, TopBar, useToast } from "../components/ui";
import { AI_MODEL } from "../lib/claude";
import { todayISO } from "../lib/dates";
import { downloadText } from "../lib/image";
import { navigate } from "../lib/router";
import { parseBackup, serializeBackup, useStore } from "../lib/store";

export function SettingsScreen() {
  const store = useStore();
  const { data, persistent } = store;
  const toast = useToast();
  const [key, setKey] = useState(data.settings.apiKey);
  const [reveal, setReveal] = useState(false);
  const [confirm, setConfirm] = useState<null | "demo" | "reset">(null);
  const count = Object.keys(data.days).length;

  const saveKey = () => {
    store.setSettings({ ...data.settings, apiKey: key.trim() });
    toast(key.trim() ? "API key saved on this device" : "API key removed");
  };

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

      <div className="section">
        <h2 className="section-title h3">
          <Sparkles size={18} color="#f7c948" /> AI narrator
        </h2>
        <div className="card stack">
          <p className="small muted" style={{ margin: 0, lineHeight: 1.5 }}>
            The Narrator's Cut works offline out of the box. Add your own Anthropic API key and Claude ({AI_MODEL}) will write your week, season and year
            recaps. The key stays on this device and is only sent to api.anthropic.com. It's never included in backups.
          </p>
          <div className="search-box" style={{ background: "var(--card-2)" }}>
            <KeyRound size={16} />
            <input
              type={reveal ? "text" : "password"}
              value={key}
              onChange={(e) => setKey(e.target.value)}
              placeholder="sk-ant-…"
              autoComplete="off"
              spellCheck={false}
              aria-label="Anthropic API key"
            />
            <button onClick={() => setReveal(!reveal)} aria-label={reveal ? "Hide key" : "Show key"} className="muted">
              {reveal ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
          <button className="btn primary block" onClick={saveKey} disabled={key.trim() === data.settings.apiKey}>
            Save key
          </button>
          <a className="small" style={{ color: "var(--link)" }} href="https://console.anthropic.com/settings/keys" target="_blank" rel="noreferrer">
            Get an API key →
          </a>
        </div>
      </div>

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
