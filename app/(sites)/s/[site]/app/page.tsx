import { AppConfigProvider } from "@/components/app/AppContext";
import { AppFrame } from "@/components/app/AppFrame";
import { AppHome } from "@/components/app/AppHome";
import { loadAppPage } from "@/components/app/load";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ site: string }>; searchParams: Promise<{ preview?: string }> };

/** The restaurant's app: its home screen of buttons. */
export default async function AppHomePage({ params, searchParams }: Props) {
  const [{ site }, { preview }] = await Promise.all([params, searchParams]);
  const app = await loadAppPage(site, preview);
  return (
    <div className="papp-root">
      <AppConfigProvider initial={app.config} preview={app.draft}>
        <AppFrame base={app.base} q={app.q} features={app.features} tab="home" preview={app.draft}>
          <AppHome base={app.base} q={app.q} features={app.features} preview={app.draft} />
        </AppFrame>
      </AppConfigProvider>
    </div>
  );
}
