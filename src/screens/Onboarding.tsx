import { useState } from "react";
import { useStore } from "../lib/store";

export function Onboarding() {
  const { data, finishOnboarding, loadDemo, setFormat } = useStore();
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const school = data.format.mode === "school";

  const start = () => {
    const n = name.trim();
    finishOnboarding({ name: n, storyTitle: n ? `${n}'s Story` : "My Story", tagline: "Every day is an episode." });
  };

  return (
    <div className="app" style={{ display: "flex", flexDirection: "column", justifyContent: "center", minHeight: "100dvh" }}>
      <div className="hero-glow" />
      <div className="headline gradient-text">
        Rate your life
        <br />
        like a series
      </div>
      <p style={{ fontSize: 20, color: "#d1d1d6", margin: "14px 0 30px" }}>Every day is an episode.</p>

      <div className="card stack" style={{ background: "rgba(28,28,30,0.85)" }}>
        <div className="small muted" style={{ lineHeight: 1.55 }}>
          Rate each day from 0 to 10. Months become seasons, the people you spend time with become your cast, and RateDays shows you what makes your best
          episodes.
        </div>
        <label className="field">
          <span>What should we call the main character?</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" onKeyDown={(e) => e.key === "Enter" && start()} />
        </label>
        <button
          className="chip selectable"
          aria-pressed={school}
          onClick={() => setFormat({ ...data.format, mode: school ? "calendar" : "school" })}
          style={{ alignSelf: "flex-start" }}
        >
          🎓 I'm a student — make my seasons Fall & Spring
        </button>
        <button className="btn primary block" onClick={start}>
          Start my story
        </button>
        <button
          className="btn block"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            await loadDemo();
          }}
        >
          Explore with a demo year
        </button>
      </div>
      <p className="tiny dim center" style={{ marginTop: 18 }}>
        Your episodes stay on this device.
      </p>
    </div>
  );
}
