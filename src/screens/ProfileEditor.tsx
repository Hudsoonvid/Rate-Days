import { Camera } from "lucide-react";
import { useState } from "react";
import { TopBar, useToast } from "../components/ui";
import { DEFAULT_COVER } from "../lib/coverArt";
import { fileToDataUrl } from "../lib/image";
import { back } from "../lib/router";
import { useStore } from "../lib/store";

export function ProfileEditor() {
  const { data, setProfile } = useStore();
  const toast = useToast();
  const [name, setName] = useState(data.profile.name);
  const [storyTitle, setStoryTitle] = useState(data.profile.storyTitle);
  const [tagline, setTagline] = useState(data.profile.tagline);
  const [cover, setCover] = useState(data.profile.cover);

  const save = () => {
    setProfile({ name: name.trim(), storyTitle: storyTitle.trim() || (name.trim() ? `${name.trim()}'s Story` : "My Story"), tagline: tagline.trim(), cover });
    back();
  };

  return (
    <div className="app">
      <TopBar
        title="Edit Profile"
        backLabel="Cancel"
        right={
          <button className="text-btn accent" onClick={save}>
            Save
          </button>
        }
      />
      <div className="row" style={{ justifyContent: "center", marginTop: 12 }}>
        <label style={{ position: "relative", cursor: "pointer" }}>
          <img src={cover || DEFAULT_COVER} alt="" style={{ width: 150, height: 212, objectFit: "cover", borderRadius: 14 }} />
          <span
            className="row small"
            style={{ position: "absolute", bottom: 8, left: 8, right: 8, justifyContent: "center", gap: 6, background: "rgba(0,0,0,0.6)", borderRadius: 10, padding: 6 }}
          >
            <Camera size={15} /> Change poster
          </span>
          <input
            type="file"
            accept="image/*"
            style={{ position: "absolute", inset: 0, opacity: 0 }}
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              try {
                setCover(await fileToDataUrl(f, 900));
              } catch (err) {
                toast((err as Error).message);
              }
            }}
          />
        </label>
      </div>
      {cover && (
        <div className="center">
          <button className="text-btn" onClick={() => setCover(undefined)}>
            Use the default poster
          </button>
        </div>
      )}
      <div className="stack" style={{ marginTop: 18 }}>
        <label className="field">
          <span>Your name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Alex" />
        </label>
        <label className="field">
          <span>Series title</span>
          <input className="input" value={storyTitle} onChange={(e) => setStoryTitle(e.target.value)} placeholder={name ? `${name}'s Story` : "My Story"} />
        </label>
        <label className="field">
          <span>Logline</span>
          <input className="input" value={tagline} onChange={(e) => setTagline(e.target.value)} placeholder="A year of growth and balance." maxLength={80} />
        </label>
        <button className="btn primary block" onClick={save}>
          Save
        </button>
      </div>
    </div>
  );
}
