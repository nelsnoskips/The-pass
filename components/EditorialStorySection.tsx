"use client";

const IMG_INTERIOR =
  "https://images.unsplash.com/photo-1616394584738-fc6e612e71b9?q=80&w=2940&auto=format&fit=crop";
const IMG_TEXTURE =
  "https://images.unsplash.com/photo-1570172619644-dfd03ed5d881?q=80&w=2940&auto=format&fit=crop";
const IMG_HERO =
  "https://images.unsplash.com/photo-1552693673-1bf958298935?q=80&w=2946&auto=format&fit=crop";

const treatmentsCopy = [
  {
    title: "Precision injectables",
    body: "Botox and dermal filler with an artist’s eye. We restore balance and natural expression, never a frozen look.",
  },
  {
    title: "Laser & energy",
    body: "Resurfacing, tightening, and tone. Technology that delivers visible results with minimal downtime.",
  },
  {
    title: "Skin as foundation",
    body: "Chemical peels, microneedling, and medical-grade skincare. Healthy skin is the base of every treatment.",
  },
];

const philosophyCopy = {
  title: "Our philosophy",
  body: "We believe in enhancement, not alteration. Our space is calm and clinical—a place where science and serenity meet. Every treatment is tailored; every result is you, refined.",
};

export function EditorialStorySection() {
  return (
    <section id="story" className="relative z-10 min-h-screen">
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-2">
        {/* Left: sticky text */}
        <div className="flex flex-col justify-center bg-transparent px-6 py-20 backdrop-blur-md lg:sticky lg:top-0 lg:max-h-screen lg:py-24">
          <div className="mx-auto max-w-lg lg:pl-8">
            <h2 className="font-editorial text-4xl text-[#0f281e] md:text-5xl lg:text-6xl">
              Treatments
            </h2>
            <div className="mt-10 space-y-10">
              {treatmentsCopy.map((block, i) => (
                <div key={block.title}>
                  <h3 className="font-editorial text-2xl text-[#0f281e] md:text-3xl">
                    {block.title}
                  </h3>
                  <p className="mt-2 font-sans text-sm leading-relaxed text-[#0f281e]/85 md:text-base">
                    {block.body}
                  </p>
                </div>
              ))}
            </div>
            <h2 className="font-editorial mt-16 text-4xl text-[#0f281e] md:text-5xl lg:text-6xl">
              {philosophyCopy.title}
            </h2>
            <p className="mt-6 font-sans text-sm leading-relaxed text-[#0f281e]/85 md:text-base">
              {philosophyCopy.body}
            </p>
          </div>
        </div>

        {/* Right: scrolling gallery */}
        <div className="relative flex flex-col gap-0">
          <div className="min-h-[60vh] w-full">
            <img
              src={IMG_INTERIOR}
              alt=""
              className="h-full min-h-[70vh] w-full object-cover"
            />
          </div>
          <div className="min-h-[60vh] w-full">
            <img
              src={IMG_TEXTURE}
              alt=""
              className="h-full min-h-[70vh] w-full object-cover"
            />
          </div>
          <div className="min-h-[60vh] w-full">
            <img
              src={IMG_HERO}
              alt=""
              className="h-full min-h-[70vh] w-full object-cover"
            />
          </div>
          <div className="min-h-[20vh] w-full bg-[#0f281e]/5 backdrop-blur-sm" />
        </div>
      </div>
    </section>
  );
}
