import type { Metadata } from "next";
import { Inventory } from "@/components/inventory";
import { PageHero, PageShell } from "@/components/pages";

export const metadata: Metadata = {
  title: "Inventory — Orravan Mechanical",
  description:
    "Johnson Controls building automation parts in Orravan's inventory: FX-PC controllers, expansion I/O modules, VAV controllers and supervisory devices.",
};

/** Inventory, moved from orravan.ai/all-products. */
export default function InventoryPage() {
  return (
    <PageShell>
      <PageHero
        eyebrow="Warehouse inventory"
        head={["Parts on", "the shelf."]}
        lede="Controllers, expansion modules, VAV assemblies and supervisory devices, with unique parts and supplies for emergency situations. Build a parts list and we'll come back with pricing and availability."
      />
      {/* The catalog takes the full width: in the rail layout only two
          cards fit across. */}
      <section className="o-inv-wrap">
        <Inventory />
      </section>
    </PageShell>
  );
}
