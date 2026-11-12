/**
 * The Brief: the studio's intake, as a document that writes itself.
 *
 * Chapters rather than one long form, because a form that shows thirty
 * fields at once gets abandoned and a form that shows one question at a
 * time takes twenty minutes. Every chapter is skippable and every field
 * is optional — the only thing actually required is an email, because
 * without one there is nobody to reply to.
 *
 * `summary` is how an answer reads back in the assembled brief. It is
 * what makes the thing feel like a document instead of a database
 * insert, and it is why the questions are phrased as questions rather
 * than as labels.
 */

export type Field = {
  id: string;
  label: string;
  /** The quiet line under a question, where the real ask usually lives. */
  hint?: string;
  type: "text" | "email" | "tel" | "url" | "long" | "choice" | "multi";
  options?: string[];
  placeholder?: string;
  required?: boolean;
  /** How this answer reads in the assembled brief. */
  summary: (v: string) => string;
};

export type Chapter = {
  id: string;
  n: string;
  title: string;
  lede: string;
  fields: Field[];
};

export const CHAPTERS: Chapter[] = [
  {
    id: "you",
    n: "01",
    title: "Who we'd be working with",
    lede: "So a reply goes to the right person, and so we know who has to be happy at the end.",
    fields: [
      { id: "name", label: "Your name", type: "text", placeholder: "Nelson Schnebelen",
        summary: (v) => `Our contact is ${v}.` },
      { id: "company", label: "Company", type: "text", placeholder: "Orravan Mechanical, Inc.",
        summary: (v) => `The company is ${v}.` },
      { id: "role", label: "Your role", type: "text", placeholder: "Operations Director",
        summary: (v) => `They are the ${v}.` },
      { id: "email", label: "Email", type: "email", required: true, placeholder: "you@company.com",
        summary: (v) => `Reachable at ${v}.` },
      { id: "phone", label: "Phone", hint: "Only if you'd rather talk than type.", type: "tel",
        placeholder: "(855) 000-0000",
        summary: (v) => `Phone ${v}.` },
      { id: "site", label: "Your current website", type: "url", placeholder: "https://",
        summary: (v) => `The current site is ${v}.` },
      { id: "deciders", label: "Who else signs this off?",
        hint: "Not to go around you — to make sure nothing gets built that a second opinion undoes.",
        type: "text", placeholder: "A partner, a board, nobody but me",
        summary: (v) => `Sign-off also runs through: ${v}.` },
    ],
  },
  {
    id: "work",
    n: "02",
    title: "What you want done",
    lede: "In your words. The shape of the job matters more here than the specifics.",
    fields: [
      { id: "scope", label: "What are we doing?", type: "choice",
        options: ["A new site from nothing", "A full redesign", "A partial redesign", "Adding to what exists", "Not sure yet"],
        summary: (v) => `The job: ${v.toLowerCase()}.` },
      { id: "why", label: "Why now?",
        hint: "Something usually prompts this. A rebrand, a launch, losing work to a competitor, or just being tired of it.",
        type: "long", placeholder: "What changed, or what finally tipped it over.",
        summary: (v) => `Why now — ${v}` },
      { id: "wrong", label: "What's wrong with the site you have?",
        hint: "Be blunt. This is the most useful answer on the form.",
        type: "long", placeholder: "Slow, dated, hard to update, doesn't bring in work, embarrassing to send…",
        summary: (v) => `What is wrong with it today — ${v}` },
      { id: "keep", label: "What's working that we shouldn't touch?",
        type: "long", placeholder: "A page that performs, a tool people use, the logo.",
        summary: (v) => `Leave alone — ${v}` },
    ],
  },
  {
    id: "audience",
    n: "03",
    title: "Who it's for",
    lede: "A site built for everyone converts nobody. This is the part most briefs skip and most projects miss.",
    fields: [
      { id: "who", label: "Who are your customers?",
        hint: "The real ones. Job titles, industries, or just 'the person who signs the cheque'.",
        type: "long", placeholder: "Facilities managers at hospitals and hotels across California…",
        summary: (v) => `Their customers — ${v}` },
      { id: "action", label: "What should someone do on the site?", type: "multi",
        options: ["Request a quote", "Call", "Book a meeting", "Buy something", "Apply for a job",
                  "Find a document or spec", "Log into a portal", "Understand what you do", "Trust you"],
        summary: (v) => `The site has to make people: ${v.toLowerCase()}.` },
      { id: "win", label: "What does a win look like in six months?",
        hint: "A number if you have one. A feeling if you don't.",
        type: "long", placeholder: "Ten qualified quote requests a month. Or: stops embarrassing us.",
        summary: (v) => `Success in six months — ${v}` },
      { id: "rivals", label: "Who do you lose work to?",
        hint: "Their sites are the ones we'll look at first.",
        type: "long", placeholder: "Names or links.",
        summary: (v) => `They compete with — ${v}` },
    ],
  },
  {
    id: "build",
    n: "04",
    title: "What it has to do",
    lede: "The functional part. Skip anything you haven't thought about — that's what the call is for.",
    fields: [
      { id: "pages", label: "What pages does it need?",
        type: "long", placeholder: "Home, services, about, inventory, contact, service portal…",
        summary: (v) => `Pages — ${v}` },
      { id: "features", label: "Anything beyond pages?", type: "multi",
        options: ["Quote or enquiry forms", "Online booking", "Payments", "Customer login",
                  "Inventory or catalogue", "Document downloads", "Blog or news", "Multiple locations",
                  "Multiple languages", "Something connected to other software"],
        summary: (v) => `Beyond pages it needs: ${v.toLowerCase()}.` },
      { id: "integrations", label: "What software does it need to talk to?",
        hint: "CRM, scheduling, accounting, an ERP, whatever runs the business.",
        type: "long", placeholder: "Or 'no idea', which is a real answer.",
        summary: (v) => `Must connect to — ${v}` },
      { id: "edit", label: "Who updates it after launch, and how often?",
        type: "text", placeholder: "Me, monthly. Or: nobody, ever.",
        summary: (v) => `Updates after launch — ${v}` },
    ],
  },
  {
    id: "brand",
    n: "05",
    title: "How it should feel",
    lede: "Taste is hard to write down, so links do more work here than adjectives.",
    fields: [
      { id: "assets", label: "What do you already have?", type: "multi",
        options: ["A logo we like", "A logo we don't like", "Brand guidelines", "Professional photography",
                  "Written copy", "None of it"],
        summary: (v) => `Existing material: ${v.toLowerCase()}.` },
      { id: "admire", label: "Three sites you admire",
        hint: "They don't have to be in your industry. Say what you like about each if you can.",
        type: "long", placeholder: "Links, and a word on why.",
        summary: (v) => `Sites they admire — ${v}` },
      { id: "avoid", label: "Anything you'd hate?",
        hint: "Just as useful. Sliders, stock photos of handshakes, whatever it is.",
        type: "long", placeholder: "What to stay away from.",
        summary: (v) => `Avoid — ${v}` },
      { id: "tone", label: "How should it sound?", type: "choice",
        options: ["Plain and technical", "Confident and direct", "Warm and human", "Premium and restrained", "Loud"],
        summary: (v) => `Tone: ${v.toLowerCase()}.` },
    ],
  },
  {
    id: "practical",
    n: "06",
    title: "Money and dates",
    lede: "Honest ranges beat precise guesses. Nothing here is binding, and skipping it doesn't cost you anything.",
    fields: [
      { id: "budget", label: "Roughly what's the budget?", type: "choice",
        options: ["Under $3,000", "$3,000 – $6,000", "$6,000 – $12,000", "$12,000+", "Tell me what it should be"],
        summary: (v) => `Budget: ${v}.` },
      { id: "ongoing", label: "Do you want it looked after afterwards?", type: "choice",
        options: ["Yes, hand it over entirely", "Yes, but we'll do small edits", "No, we'll take it from launch", "Not sure"],
        summary: (v) => `Ongoing care: ${v.toLowerCase()}.` },
      { id: "when", label: "When does it need to be live?",
        hint: "A hard date beats 'as soon as possible'. If there's a reason behind it, say so.",
        type: "text", placeholder: "Before a trade show, end of Q4, no rush",
        summary: (v) => `Needs to be live: ${v}.` },
      { id: "content", label: "Who's writing the words and finding the pictures?", type: "choice",
        options: ["You — take it off my hands", "Us, we have it ready", "Us, but slowly", "Let's split it"],
        summary: (v) => `Copy and imagery: ${v.toLowerCase()}.` },
    ],
  },
  {
    id: "rest",
    n: "07",
    title: "Anything else",
    lede: "The part of the job that doesn't fit in a field. Usually the most important thing in the brief.",
    fields: [
      { id: "anything", label: "What haven't we asked?",
        type: "long", placeholder: "Constraints, history, the thing that went wrong last time.",
        summary: (v) => `In their words — ${v}` },
    ],
  },
];

export const REQUIRED_IDS = CHAPTERS.flatMap((c) =>
  c.fields.filter((f) => f.required).map((f) => f.id),
);

export const ALL_FIELDS = CHAPTERS.flatMap((c) => c.fields);
