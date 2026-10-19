import { lazy, Suspense, useEffect } from "react";
import { useRoute } from "./lib/router";
import { useStore } from "./lib/store";
import { Home } from "./screens/Home";
import { DayView } from "./screens/DayView";
import { DayEditor } from "./screens/DayEditor";
import { Stats } from "./screens/Stats";
import { TagImpactScreen } from "./screens/TagImpact";
import { Narrator } from "./screens/Narrator";
import { People } from "./screens/People";
import { Goals } from "./screens/Goals";
import { SearchScreen } from "./screens/Search";
import { Finales } from "./screens/Finales";
import { FinaleStory } from "./screens/FinaleStory";
import { SettingsScreen } from "./screens/Settings";
import { ProfileEditor } from "./screens/ProfileEditor";
import { Onboarding } from "./screens/Onboarding";

// Leaflet only loads when someone opens the map.
const Places = lazy(() => import("./screens/Places").then((m) => ({ default: m.Places })));

function Screen() {
  const { parts, query } = useRoute();
  const [head, arg] = parts;
  switch (head) {
    case undefined:
      return <Home />;
    case "day":
      return <DayView date={arg} />;
    case "edit":
      return <DayEditor date={arg} />;
    case "stats":
      return <Stats />;
    case "impact":
      return <TagImpactScreen />;
    case "narrator":
      return <Narrator initialKind={query.get("kind")} />;
    case "people":
      return <People />;
    case "places":
      return (
        <Suspense fallback={<div className="app" />}>
          <Places initialTab={query.get("tab")} />
        </Suspense>
      );
    case "goals":
      return <Goals />;
    case "search":
      return <SearchScreen initialQuery={query.get("q") ?? ""} />;
    case "finales":
      return <Finales />;
    case "finale":
      return <FinaleStory month={arg} />;
    case "settings":
      return <SettingsScreen />;
    case "profile":
      return <ProfileEditor />;
    default:
      return <Home />;
  }
}

export function App() {
  const { ready, data } = useStore();
  const { path } = useRoute();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [path]);

  if (!ready) return <div className="app" />;
  if (!data.onboarded) return <Onboarding />;
  return <Screen />;
}
