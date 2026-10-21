/**
 * The content pages, moved from Orravan's current site on 21 Oct 2026:
 * About Us, Services, Building Automation Systems, HVAC Systems, Support
 * and Contact. The words are theirs, with spelling fixed ("warrantee",
 * "commited", "manufactures") and nothing added that they didn't say.
 */

export const ABOUT = {
  eyebrow: "About us",
  head: ["We are", "Orravan."],
  lede:
    "Orravan Mechanical, Inc. is a heating, ventilation and air conditioning company started on hard work, dedication and a commitment to customer satisfaction with high-level expertise.",
  focus: "Commercial building automation control systems, chiller and boiler integration, and air-side mechanical solutions.",
  blocks: [
    {
      title: "System integrators",
      text: "We are a team of committed system integrators who provide customers quality installations backed by a parts and labor warranty. We guarantee your project will be done right.",
    },
    {
      title: "Engineering and IT",
      text: "Orravan offers complete engineering services, Information Technology (IT) planning and development, and installations.",
    },
    {
      title: "The right parts",
      text: "We've connected with leading industry manufacturers to deliver the best in controllers, sensors, software, networking devices and accessories.",
    },
    {
      title: "Quality guarantee",
      text: "Orravan is set apart by fast, safe and professional service at an affordable cost. As a fully licensed and bonded company, we stand behind all of our work.",
    },
  ],
  understand: "We take our time to fully understand your HVAC needs and specifications.",
} as const;

export const SERVICES_PAGE = {
  eyebrow: "What we do",
  head: ["Engineering the", "buildings of the future."],
  lede:
    "High-quality air conditioning solutions for buildings across California. Orravan Mechanical, Inc. offers complete installations, retrofit, repairs, parts and automation engineering.",
  served: ["Health care facilities", "Data centers", "Hotels", "Office buildings", "Churches", "Schools"],
  call:
    "If you are a commercial building owner interested in upgrading your existing HVAC system, installing a new energy-efficient system, or signing up for a custom maintenance contract, talk to us today.",
  columns: [
    {
      title: "System controls",
      href: "/services/building-automation",
      items: ["New install, retrofit or repair", "HVAC control", "Lighting control", "3rd-party integration"],
      sub: { title: "Protocols", items: ["BACnet IP", "BACnet MSTP", "N2 (Johnson Controls)", "Modbus", "Zigbee (wireless)"] },
    },
    {
      title: "Mechanical engineering",
      href: "/services/hvac",
      items: [
        "New install, retrofit or repair",
        "Preventative maintenance",
        "Package units",
        "Built-up systems",
        "Low-temp refrigeration",
        "Boilers",
        "Air handlers",
        "VFDs (variable frequency drives)",
        "Pumps",
      ],
    },
    {
      title: "Building chillers",
      href: "/services/hvac",
      items: [
        "Maintenance and services",
        "Water-cooled chillers",
        "Air-cooled chillers",
        "Cooling towers",
        "Tube cleaning",
        "Refrigerant analysis",
        "Eddy current tube analysis",
      ],
    },
  ],
  strengths: [
    { title: "Automation efficiency", text: "Automated tasks that lower the risk of falling short of demanding regulations." },
    { title: "Powerful systems", text: "Facilities that meet high efficiency requirements, certified to the highest local standards." },
    { title: "Accurate testing", text: "The latest processing solutions, backed by decades of work experience." },
    { title: "Quality guarantee", text: "Fast, safe and professional service at an affordable cost." },
  ],
} as const;

export const AUTOMATION_PAGE = {
  eyebrow: "Building automation systems",
  head: ["One solution for", "every control."],
  lede: "A one-stop solution for building automation controls, replacement parts and new system installations.",
  paragraphs: [
    "Orravan Mechanical, Inc. works closely with facility managers, consulting engineers and mechanical contractors in Southern California to provide high-technology solutions and services in building automation and energy management systems.",
    "We live in the information age, and integration is necessary to bring all of your building automation systems together. Orravan realizes the increasing need to encompass HVAC, lighting, fire life safety, security and other third-party systems.",
    "BACnet provides the medium to integrate all of your building automation systems while freeing you from the high cost of proprietary systems. We design, engineer, install and service a wide variety of equipment and systems, and work with you to create and maintain systems tailored to your unique needs.",
  ],
} as const;

export const HVAC_PAGE = {
  eyebrow: "HVAC systems",
  head: ["No one-size-fits-all", "HVAC."],
  lede: "At Orravan Mechanical, Inc., nothing is more important than the satisfaction of our clients. We take our time to fully understand your HVAC needs and specifications.",
  paragraphs: [
    "We have the expertise to analyze, budget and competitively price virtually any HVAC project of any scope and size.",
    "Our team produces on-the-mark estimates from predesigned drawings supplied by the client, and works on your side to keep your project in line with the plans and within budget.",
    "Every commercial building owner knows the importance of keeping tenants comfortable while maximizing HVAC efficiency and keeping costs down. We understand that each commercial building is different, and that there is no such thing as a one-size-fits-all HVAC solution.",
  ],
} as const;

export const SUPPORT_PAGE = {
  eyebrow: "Support",
  head: ["Watching over", "your building."],
  lede: "Remote monitoring by certified Tridium and Metasys building technicians, a controls panel shop, and full technician support.",
  monitoring: {
    title: "Remote monitoring",
    text: "An extra layer of protection, 24/7, for remote sites. You're notified instantly of readings outside preset parameters and possible threats to unattended equipment or facilities.",
    items: [
      "Detect issues quickly and monitor controls efficiently",
      "Watch systems for unwanted changes and emergencies",
      "Track temperature changes, power failures, pressure, timers, alarms, excess humidity and intrusion",
      "Help operators prevent costly problems and dangerous industrial accidents",
      "Take action before production is impacted, equipment and property are damaged, or the environment is contaminated",
    ],
  },
  panels: {
    title: "Fast and efficient panels",
    text: "Our controls panel shop has quick turnaround times and provides on-site support when problems occur.",
  },
  techs: {
    title: "Technician support",
    text: "Fully qualified expertise by computer, phone and on-site.",
  },
  inventory: {
    title: "Warehouse inventory",
    text: "Unique parts and supplies for emergency situations.",
  },
} as const;

export const CONTACT_PAGE = {
  eyebrow: "Contact",
  head: ["Get in", "touch."],
  lede: "Questions, a building that needs attention, or a project to scope. Send us a message and the office will get back to you.",
  sent: "Thanks. Your message is with the office, and we'll be in touch soon.",
  failed: "Sorry, that didn't go through. Please call us at (855) 677-2826 or email info@orravan.ai.",
} as const;
