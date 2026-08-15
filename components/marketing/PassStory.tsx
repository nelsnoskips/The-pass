import Image from "next/image";
import { PassMark } from "./PassMark";

const CHEF_IMAGE =
  "https://images.unsplash.com/photo-1577219491135-ce391730fb2c?w=1200&q=78&fm=jpg";

/**
 * The name, explained: the pass is where nothing reaches the guest
 * unfinished. The chef-under-the-pass-light photograph anchors the metaphor.
 */
export function PassStory() {
  return (
    <section
      id="about"
      className="scroll-mt-24 bg-[#1A1310] px-5 py-24 sm:px-8 sm:py-32"
    >
      <div className="mx-auto grid max-w-[1200px] items-center gap-12 lg:grid-cols-2 lg:gap-20">
        <figure className="relative order-last aspect-[4/5] max-h-[640px] overflow-hidden lg:order-first">
          <Image
            src={CHEF_IMAGE}
            alt="A chef finishing a plated dish beneath the copper heat lamps of the pass"
            fill
            quality={90}
            sizes="(max-width: 1024px) 100vw, 50vw"
            className="object-cover"
          />
          <div aria-hidden className="absolute inset-0 ring-1 ring-inset ring-[#B79A68]/25" />
        </figure>

        <div>
          <PassMark size={30} color="#B79A68" />
          <h2 className="mt-8 font-editorial text-[38px] leading-[1.08] text-[#F1EDE5] sm:text-[46px]">
            In every kitchen, there is a place where nothing reaches the guest{" "}
            <em className="italic text-[#B79A68]">unfinished.</em>
          </h2>
          <div className="mt-8 space-y-5 text-[15px] leading-relaxed text-[#F1EDE5]/70">
            <p>
              The pass is where a restaurant&apos;s standards live. Every dish is
              inspected, organized, and handed from kitchen to service with
              intention, under the light.
            </p>
            <p>
              We named our studio after it because that is how we treat your
              website. Every detail considered. Every page working. Every
              experience prepared to perform. Nothing reaches the guest
              without purpose.
            </p>
          </div>
          <div className="mt-10 max-w-[380px]">
            <div className="mk-passline h-px bg-[#B79A68]/25" />
            <p className="mk-label mt-4 text-[#B79A68]">
              Anyone can launch a website. We conduct one.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
