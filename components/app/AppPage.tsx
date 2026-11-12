import type { ReactNode } from "react";
import { AppConfigProvider } from "./AppContext";
import { AppFrame, type AppTab } from "./AppFrame";
import type { AppPage } from "./load";

/** An inner page of the app (Rewards, More, Menu, Visit), in the app's frame. */
export function AppScreen({ app, tab, title, children }: { app: AppPage; tab: AppTab; title: string; children: ReactNode }) {
  return (
    <div className="papp-root">
      <AppConfigProvider initial={app.config} preview={app.draft}>
        <AppFrame base={app.base} q={app.q} features={app.features} tab={tab} preview={app.draft}>
          <div className="papp-page">
            <h1>{title}</h1>
            {children}
          </div>
        </AppFrame>
      </AppConfigProvider>
    </div>
  );
}
