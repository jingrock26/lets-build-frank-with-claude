import AppLayout from "@cloudscape-design/components/app-layout";
import SideNavigation from "@cloudscape-design/components/side-navigation";
import { useEffect, useState } from "react";
import { OverviewPage } from "./pages/OverviewPage";
import { ToolsPage } from "./pages/ToolsPage";

// Two pages (ADR-003). Hash routes, so Frank's static server needs no
// fallback rules to serve a deep link.
const pages = {
  "#/": { title: "Overview", Page: OverviewPage },
  "#/tools": { title: "Tools", Page: ToolsPage },
} as const;
type Route = keyof typeof pages;

function currentRoute(): Route {
  return window.location.hash in pages ? (window.location.hash as Route) : "#/";
}

export function App() {
  const [route, setRoute] = useState<Route>(currentRoute);

  useEffect(() => {
    const onHash = () => setRoute(currentRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const { Page } = pages[route];

  return (
    <AppLayout
      toolsHide
      navigation={
        <SideNavigation
          header={{ text: "Frank", href: "#/" }}
          activeHref={route}
          items={Object.entries(pages).map(([href, p]) => ({ type: "link" as const, text: p.title, href }))}
        />
      }
      content={<Page />}
    />
  );
}
