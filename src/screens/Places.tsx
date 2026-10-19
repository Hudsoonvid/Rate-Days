import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Anchor, MapPin, Star } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { AppHeader, Delta, Empty, Segmented } from "../components/ui";
import { average, placeStats, rankByRating, sortedDays, type EntityStat } from "../lib/stats";
import { colorFor, fmt, tierFor } from "../lib/ratings";
import { navigate } from "../lib/router";
import { useStore } from "../lib/store";
import type { Place } from "../lib/types";

type Tab = "map" | "best" | "impact";

export function Places({ initialTab }: { initialTab: string | null }) {
  const { data } = useStore();
  const [tab, setTab] = useState<Tab>(initialTab === "best" || initialTab === "impact" ? initialTab : "map");
  const days = useMemo(() => sortedDays(data.days), [data.days]);
  const stats = useMemo(() => rankByRating(placeStats(data.places, days)), [data.places, days]);
  const baseline = average(days);

  return (
    <div className="app">
      <AppHeader />
      <h1 className="section-title" style={{ marginTop: 12 }}>
        <Anchor size={22} color="#f7a531" /> Locations
      </h1>
      <Segmented
        value={tab}
        onChange={setTab}
        options={[
          { value: "map", label: "Map" },
          { value: "best", label: "Best Places" },
          { value: "impact", label: "Impact" },
        ]}
      />
      <div style={{ marginTop: 14 }}>
        {!stats.length ? (
          <Empty emoji="🗺️" title="No places yet">
            Add a location when you rate a day to see where your best days happen.
          </Empty>
        ) : tab === "map" ? (
          <PlacesMap stats={stats} />
        ) : tab === "best" ? (
          stats.map((s, i) => (
            <button key={s.item.id} className="rank-row" style={{ borderRightColor: colorFor(s.avg) }} onClick={() => navigate(`/search?q=${encodeURIComponent(s.item.name)}`)}>
              <span className="rank-num">#{i + 1}</span>
              <span className="grow">
                <div style={{ fontWeight: 600 }}>{s.item.name}</div>
                <div className="small muted">
                  {s.count} episode{s.count === 1 ? "" : "s"}
                  {s.item.lat === undefined ? " · no pin" : ""}
                </div>
              </span>
              <span className="score-star">
                <Star size={16} fill={colorFor(s.avg)} color={colorFor(s.avg)} /> {fmt(s.avg)}
              </span>
            </button>
          ))
        ) : (
          <div className="card">
            <div className="small muted" style={{ marginBottom: 6 }}>
              How days in each place compare with your {fmt(baseline)} average
            </div>
            {stats
              .slice()
              .sort((a, b) => b.avg - a.avg)
              .map((s) => {
                const delta = s.avg - baseline;
                const width = Math.min(50, Math.abs(delta) * 12);
                return (
                  <div key={s.item.id} className="impact-row">
                    <MapPin size={18} color="#f7a531" style={{ flex: "none" }} />
                    <span style={{ width: 96, flex: "none" }} className="ellipsis">
                      {s.item.name}
                    </span>
                    <span className="grow" style={{ position: "relative", height: 10 }}>
                      <span style={{ position: "absolute", left: "50%", top: -4, bottom: -4, width: 1, background: "#3a3a3c" }} />
                      <span
                        style={{
                          position: "absolute",
                          top: 0,
                          height: 10,
                          borderRadius: 4,
                          background: delta >= 0 ? "#3fb950" : "#e5483d",
                          left: delta >= 0 ? "50%" : `${50 - width}%`,
                          width: `${width}%`,
                        }}
                      />
                    </span>
                    <span style={{ width: 52, textAlign: "right" }}>
                      <Delta value={delta} />
                    </span>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    </div>
  );
}

function PlacesMap({ stats }: { stats: EntityStat<Place>[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const pinned = stats.filter((s) => s.item.lat !== undefined && s.item.lng !== undefined);

  useEffect(() => {
    if (!ref.current || !pinned.length) return;
    const map = L.map(ref.current, { zoomControl: false, attributionControl: true });
    L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
      maxZoom: 18,
      subdomains: "abcd",
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>',
    }).addTo(map);

    const bounds = L.latLngBounds([]);
    for (const s of pinned) {
      const t = tierFor(s.avg);
      const html = `<div class="map-pin"><b style="background:${t.color};color:${t.ink}">${fmt(s.avg)}</b><span>${escapeHtml(s.item.name)}</span></div>`;
      const marker = L.marker([s.item.lat!, s.item.lng!], { icon: L.divIcon({ html, className: "", iconSize: [0, 0] }) }).addTo(map);
      marker.on("click", () => navigate(`/search?q=${encodeURIComponent(s.item.name)}`));
      bounds.extend([s.item.lat!, s.item.lng!]);
    }
    if (pinned.length === 1) map.setView(bounds.getCenter(), 10);
    else map.fitBounds(bounds, { padding: [50, 50] });
    return () => {
      map.remove();
    };
  }, [pinned.map((p) => `${p.item.id}:${p.avg}`).join("|")]); // re-render only when pins change

  if (!pinned.length) {
    return (
      <Empty emoji="📍" title="No pinned places">
        Your places don't have map pins yet. Use “Find on map” or “I'm here” when adding a place.
      </Empty>
    );
  }
  return <div className="map-box" ref={ref} />;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}
