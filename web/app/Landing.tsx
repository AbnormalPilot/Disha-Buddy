"use client";

import { useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useGSAP } from "@gsap/react";
import ChatPhone from "./ChatPhone";

gsap.registerPlugin(ScrollTrigger, useGSAP);

const CTA_LABEL = "Chat with Disha on Telegram";

function Cta({
  botUsername,
  dark = false,
  className = "",
}: {
  botUsername: string | null;
  dark?: boolean;
  className?: string;
}) {
  const base =
    "inline-flex items-center justify-center gap-2 rounded-full px-7 py-3.5 font-display text-sm font-semibold transition-all hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] " +
    (dark
      ? "bg-white text-night hover:bg-ivory "
      : "bg-cobalt text-white shadow-[0_12px_32px_-12px_rgba(29,79,215,0.6)] hover:bg-cobalt-deep ");
  if (botUsername) {
    return (
      <a href={`https://t.me/${botUsername}`} target="_blank" rel="noreferrer" className={base + className}>
        {CTA_LABEL} →
      </a>
    );
  }
  return (
    <Link href="/hermes" className={base + className}>
      Set up Disha →
    </Link>
  );
}

const COLLEGES = [
  "IIT Delhi",
  "NIT Trichy",
  "BITS Pilani",
  "DU",
  "AKTU",
  "IIIT Hyderabad",
  "VIT",
  "Jadavpur",
  "Anna University",
  "SRM",
  "MIT Manipal",
  "COEP Pune",
];

const STACK_CARDS = [
  {
    key: "memory",
    theme: "bg-white text-night border border-hairline",
    bubbleA: "btw maine budget kitna bataya tha?",
    bubbleB: "1.2L/year, hostel ke saath. sab yaad hai ✓",
    title: "Never re-explains itself",
    body: "Tell it your marks and budget once. Three weeks later it still knows. No forms, no logins, no starting over.",
  },
  {
    key: "first",
    theme: "bg-cobalt text-white",
    bubbleA: "AKTU round 2 kal raat band ho raha hai",
    bubbleB: "form abhi fill nahi kiya tune, isliye bata rahi hu",
    title: "Texts you first",
    body: "A counseling round closing in 72 hours? You hear about it before you knew to ask.",
  },
  {
    key: "voice",
    theme: "bg-night text-white",
    bubbleA: "yaar samajh nahi aa raha kya karu",
    bubbleB: "ek kaam karte hain, options nikalti hu. tension mat le",
    title: "Talks like a person",
    body: "Hindi, English, or however you mix the two. However you write it, Disha writes it back.",
  },
];

export default function Landing({ botUsername }: { botUsername: string | null }) {
  const rootRef = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();
      mm.add("(prefers-reduced-motion: no-preference)", () => {
        // Hero: masked line reveal, then sub + CTA, then the phone answers.
        gsap
          .timeline({ defaults: { ease: "power4.out" } })
          .from(".hero-line", { yPercent: 110, duration: 0.9, stagger: 0.1 })
          .from(".hero-sub", { y: 24, opacity: 0, duration: 0.6 }, "-=0.45")
          .from(".hero-cta", { y: 16, opacity: 0, duration: 0.5 }, "-=0.4")
          .from(".hero-phone", { y: 56, opacity: 0, duration: 0.9 }, "-=0.55");

        // College marquee: one continuous loop (the one marquee on the page).
        gsap.to(".marquee-track", { xPercent: -50, ease: "none", duration: 30, repeat: -1 });

        // Sticky stack: as the next card arrives, the previous one recedes.
        const cards = gsap.utils.toArray<HTMLElement>(".stack-card");
        cards.forEach((card, i) => {
          if (i === cards.length - 1) return;
          gsap.to(card.querySelector(".stack-inner"), {
            scale: 0.93,
            opacity: 0.45,
            ease: "none",
            scrollTrigger: {
              trigger: cards[i + 1],
              start: "top bottom",
              end: "top top",
              scrub: true,
            },
          });
        });

        // Section reveals: children stagger in once per section.
        gsap.utils.toArray<HTMLElement>("[data-reveal]").forEach((section) => {
          const children = section.querySelectorAll("[data-reveal-child]");
          gsap.from(children.length ? children : section, {
            y: 28,
            opacity: 0,
            duration: 0.7,
            ease: "power3.out",
            stagger: children.length ? 0.1 : 0,
            scrollTrigger: { trigger: section, start: "top 80%", once: true },
          });
        });

        // Finale: each word lands separately.
        gsap.from(".finale-word", {
          yPercent: 120,
          duration: 0.7,
          stagger: 0.09,
          ease: "power4.out",
          scrollTrigger: { trigger: ".finale", start: "top 75%", once: true },
        });
      });
    },
    { scope: rootRef }
  );

  return (
    <main ref={rootRef} className="overflow-x-hidden bg-ivory text-night">
      {/* ---------- Nav ---------- */}
      <header className="flex h-16 items-center px-6 sm:px-10">
        <span className="font-display text-lg font-bold tracking-tight">Disha</span>
      </header>

      {/* ---------- Hero ---------- */}
      <section className="px-6 pb-24 pt-10 sm:px-10 sm:pt-16">
        <div className="mx-auto grid max-w-6xl grid-cols-1 items-center gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h1 className="font-display text-[13vw] font-bold leading-[0.98] tracking-tight sm:text-6xl lg:text-7xl">
              <span className="block overflow-hidden pb-1">
                <span className="hero-line block">Colleges, sorted.</span>
              </span>
              <span className="block overflow-hidden pb-2">
                <span className="hero-line block italic leading-[1.1] text-cobalt">Aaram se.</span>
              </span>
            </h1>
            <p className="hero-sub mt-6 max-w-md text-base leading-relaxed text-dusk sm:text-lg">
              Disha remembers your marks, budget, and deadlines, then texts you first when something
              needs attention. Free, on Telegram.
            </p>
            <div className="hero-cta mt-8">
              <Cta botUsername={botUsername} />
            </div>
          </div>
          <div className="hero-phone lg:col-span-5">
            <ChatPhone />
          </div>
        </div>
      </section>

      {/* ---------- College marquee ---------- */}
      <section className="border-y border-hairline bg-white py-6" aria-label="Colleges Disha covers">
        <div className="overflow-hidden">
          <div className="marquee-track flex w-max items-center whitespace-nowrap">
            {[0, 1].map((dup) => (
              <div key={dup} className="flex items-center" aria-hidden={dup === 1}>
                {COLLEGES.map((c) => (
                  <span
                    key={`${dup}-${c}`}
                    className="mx-8 font-display text-xl font-semibold text-night/30"
                  >
                    {c}
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- Sticky feature stack ---------- */}
      <section aria-label="What Disha does">
        {STACK_CARDS.map((card) => (
          <div key={card.key} className="stack-card sticky top-0 flex min-h-[100dvh] items-center justify-center px-4 py-8 sm:px-10">
            <div
              className={`stack-inner flex w-full max-w-5xl flex-col items-start gap-10 rounded-[32px] p-8 shadow-[0_32px_80px_-32px_rgba(20,24,29,0.35)] sm:p-14 lg:flex-row lg:items-center lg:justify-between ${card.theme}`}
            >
              <div className="max-w-md">
                <h2 className="font-display text-3xl font-bold tracking-tight sm:text-5xl">{card.title}</h2>
                <p className={`mt-4 text-base leading-relaxed sm:text-lg ${card.theme.includes("text-white") ? "text-white/75" : "text-dusk"}`}>
                  {card.body}
                </p>
              </div>
              <div className="flex w-full max-w-xs flex-col gap-2 text-sm">
                <div
                  className={
                    "self-start rounded-2xl rounded-bl-sm px-4 py-2.5 " +
                    (card.theme.includes("bg-white")
                      ? "bg-ivory text-night"
                      : "bg-white/15 text-white backdrop-blur-sm")
                  }
                >
                  {card.bubbleA}
                </div>
                <div
                  className={
                    "self-end rounded-2xl rounded-br-sm px-4 py-2.5 " +
                    (card.theme.includes("bg-white")
                      ? "bg-cobalt text-white"
                      : "bg-white text-night")
                  }
                >
                  {card.bubbleB}
                </div>
              </div>
            </div>
          </div>
        ))}
      </section>

      {/* ---------- How it works ---------- */}
      <section className="bg-ivory px-6 py-24 sm:px-10" data-reveal>
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" data-reveal-child>
            How it works
          </h2>
          <ol className="mt-12 grid grid-cols-1 gap-10 sm:grid-cols-3 sm:gap-8">
            {[
              {
                title: "Open Telegram",
                body: "Tap the button, say hi. No app to install, no account to create.",
              },
              {
                title: "Tell Disha about you",
                body: "Marks, stream, budget, where you'd want to study. A couple of questions per chat, never a form.",
              },
              {
                title: "Get fit, not just names",
                body: "Colleges matched to you: cited, dated, and honest about what's uncertain.",
              },
            ].map((s, i) => (
              <li key={s.title} className="border-t-2 border-cobalt pt-5" data-reveal-child>
                <span className="font-display text-5xl font-bold text-cobalt">{i + 1}</span>
                <h3 className="mt-3 font-display text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-dusk">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Trust ---------- */}
      <section className="border-t border-hairline bg-white px-6 py-24 sm:px-10" data-reveal>
        <div className="mx-auto max-w-6xl">
          <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl" data-reveal-child>
            Honest about its facts
          </h2>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-ivory p-7" data-reveal-child>
              <h3 className="font-display text-lg font-semibold text-cobalt">Live, cited data</h3>
              <p className="mt-2 text-sm leading-relaxed text-dusk sm:text-base">
                Fees, cutoffs, and college facts come from real crawls, refreshed nightly. Anything
                time-sensitive, like a counseling round, gets checked live via{" "}
                <a
                  href="https://www.datablue.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-cobalt underline underline-offset-2"
                >
                  DataBlue
                </a>
                . Disha says when a fact was last checked, and never guesses a date.
              </p>
            </div>
            <div className="rounded-2xl bg-ivory p-7" data-reveal-child>
              <h3 className="font-display text-lg font-semibold text-cobalt">Built for minors, on purpose</h3>
              <p className="mt-2 text-sm leading-relaxed text-dusk sm:text-base">
                No document uploads, no exact address, no caste or category questions, and never a
                guaranteed admission. If a chat turns heavy, Disha responds with care and points toward
                a trusted adult. Always free, always yours to leave.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Finale ---------- */}
      <section className="finale bg-ivory px-6 py-32 text-center sm:px-10">
        <h2 className="mx-auto max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-7xl">
          {["Say", "hi."].map((w) => (
            <span key={w} className="inline-block overflow-hidden pb-1 align-bottom">
              <span className="finale-word inline-block pr-3">{w}</span>
            </span>
          ))}
          <br />
          {["Baaki", "Disha", "dekh", "legi."].map((w) => (
            <span key={w} className="inline-block overflow-hidden pb-2 align-bottom">
              <span className="finale-word inline-block pr-3 italic leading-[1.15] text-cobalt">{w}</span>
            </span>
          ))}
        </h2>
        <div className="mt-10">
          <Cta botUsername={botUsername} />
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="bg-night px-6 py-12 text-white sm:px-10">
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-display text-lg font-bold">Disha Buddy</p>
            <p className="mt-1 text-sm text-white/60">
              India AI Impact Festival 2026 entry · data by{" "}
              <a
                href="https://www.datablue.dev"
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-2"
              >
                DataBlue
              </a>
            </p>
          </div>
          <p className="text-sm text-white/60">Free for every student. That part is permanent.</p>
        </div>
      </footer>
    </main>
  );
}
