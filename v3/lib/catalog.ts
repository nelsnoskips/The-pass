/**
 * The parts catalog, moved from orravan.ai/all-products on 21 Oct 2026.
 * Every SKU, overview, category and tag is Orravan's own, copied from
 * the product pages (abbreviations written out; FX-SC8BASE-0 never had
 * an overview, so it has none here); photos are theirs too. No prices were ever shown,
 * so the catalog builds a parts list that is sent as a quote request.
 */

export type Product = {
  sku: string;
  overview: string;
  categories: string[];
  tags: string[];
};

/** The category tree, as their store listed it. */
export const CATEGORY_TREE: { name: string; children: string[] }[] = [
  { name: "Controllers", children: ["FAC", "IOM", "PCA", "PCV", "PCX", "UNT", "VAV"] },
  { name: "Building Automation Systems", children: ["FX80", "Repeaters"] },
  { name: "Boiler & FSG", children: ["Expansion Modules"] },
  { name: "Supervisory Devices", children: ["SC"] },
];

const PCX = (io: string) => `FX-PCX expansion I/O module for FX-PC series controllers with ${io}.`;

export const PRODUCTS: Product[] = [
  {
    sku: "FX-PCA4911-0",
    overview:
      "28-point advanced application programmable controller with 10 UI, 6 BI, 4 BO, 4 AO and 4 CO; 24 VAC; SA Bus; integral real-time clock; 2 Ethernet ports for BACnet/IP communications.",
    categories: ["Controllers", "PCA", "Building Automation Systems"],
    tags: ["BACnet IP", "Programmable Controller"],
  },
  {
    sku: "FX-PCG2621-0G",
    overview: "FX-PCG controller (UNT).",
    categories: ["Controllers", "PCV", "UNT", "Building Automation Systems", "FX80"],
    tags: ["BACnet MSTP", "Programmable Controller"],
  },
  {
    sku: "FX-PCV1615-1",
    overview: "VAV controller assembly with integral actuator and differential pressure transducer.",
    categories: ["Controllers", "PCV", "VAV", "Building Automation Systems", "Repeaters"],
    tags: ["Application Specific Controller", "BACnet MSTP"],
  },
  {
    sku: "FX-PCV1628-1",
    overview: "VAV controller assembly, without actuator.",
    categories: ["Controllers", "PCV", "VAV", "Building Automation Systems", "Repeaters"],
    tags: ["Application Specific Controller", "BACnet MSTP"],
  },
  {
    sku: "FX-PCV1630-1",
    overview: "VAV controller assembly with integral actuator and differential pressure transducer.",
    categories: ["Controllers", "PCV", "VAV", "Building Automation Systems", "Repeaters"],
    tags: ["Application Specific Controller", "BACnet MSTP"],
  },
  {
    sku: "FX-PCV1630-1G",
    overview: "FX-PCV VAV controller with 3 UI, 3 BO and 2 CO, with integral actuator.",
    categories: ["Controllers", "PCV", "VAV", "Building Automation Systems", "Repeaters"],
    tags: ["Application Specific Controller", "BACnet MSTP"],
  },
  { sku: "FX-PCX2711-0", overview: PCX("2 UI, 2 RO and 2 UO (6 I/O)"), categories: ["Controllers", "PCX", "Boiler & FSG", "Expansion Modules"], tags: ["Controller I/O"] },
  { sku: "FX-PCX2721-0", overview: PCX("8 UI and 2 AO"), categories: ["Controllers", "PCX", "Boiler & FSG", "Expansion Modules"], tags: ["Controller I/O"] },
  { sku: "FX-PCX3711-0", overview: PCX("4 UI, 4 RO and 4 UO (12 I/O)"), categories: ["Controllers", "PCX", "Boiler & FSG", "Expansion Modules"], tags: ["Controller I/O"] },
  { sku: "FX-PCX3721-0", overview: PCX("16 BI"), categories: ["Controllers", "PCX", "Boiler & FSG", "Expansion Modules"], tags: ["Controller I/O"] },
  { sku: "FX-PCX3731-0", overview: PCX("8 BI and 8 BO"), categories: ["Controllers", "PCX", "Boiler & FSG", "Expansion Modules"], tags: ["Controller I/O"] },
  { sku: "FX-PCX4711-0", overview: PCX("6 UI, 2 BI, 4 CO and 3 BO (17 I/O)"), categories: ["Controllers", "PCX", "Boiler & FSG", "Expansion Modules"], tags: ["Controller I/O"] },
  { sku: "FX-PCX4711-0G", overview: PCX("6 UI, 2 BI, 4 CO and 3 BO (17 I/O)"), categories: ["Controllers", "PCX", "Boiler & FSG", "Expansion Modules"], tags: ["Controller I/O"] },
  {
    sku: "FX-SC8BASE-0",
    overview: "",
    categories: ["Supervisory Devices", "SC", "Building Automation Systems", "FX80"],
    tags: ["Supervisory"],
  },
  {
    sku: "PAKLJF001BH0",
    overview:
      "MS-FAC2611-0 and MS-IOM1711-0 panel mounted in a 24 in. W x 36 in. H x 6-5/8 in. enclosure, with a 96 VA power supply.",
    categories: ["Controllers", "FAC", "IOM"],
    tags: ["Panel"],
  },
];

export const productImage = (sku: string) => `/images/products/${sku.toLowerCase()}.webp`;

export const BRAND = "Johnson Controls";

export const FULFILLMENT = "Installation provided by Orravan technicians. Shipping is scheduled the same day as installation.";
