"use client";

import { useEffect, useRef, useState } from "react";

type Msg = { from: "bot" | "student"; text: string; day?: string };

const SCRIPT: Msg[] = [
  { from: "student", text: "hii, 12th mein hu, PCM liya hai. UP se hu, budget tight hai 😅" },
  { from: "bot", text: "welcome Riya! samjh gayi: PCM, UP, budget-conscious. JEE dene ka plan hai ya sirf UPCET?" },
  { from: "student", text: "JEE bhi try karungi, but backup UPCET" },
  { from: "bot", text: "perfect, dono track karti hu ✓", day: "3 din baad" },
  { from: "bot", text: "Riya! CUET ka result aa gaya kya? 👀" },
  { from: "bot", text: "btw, AKTU counseling round 2 kal raat band ho raha hai. UPCET wala form abhi tak fill nahi kiya tune, isliye bata rahi hu" },
];

const TYPING_MS = 26;
const PAUSE_AFTER_MS = 650;

export default function ChatPhone() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [typedChars, setTypedChars] = useState(0);
  const [reducedMotion, setReducedMotion] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReducedMotion(mql.matches);
    if (mql.matches) {
      setVisibleCount(SCRIPT.length);
      return;
    }

    let cancelled = false;
    let msgIndex = 0;

    function typeNext() {
      if (cancelled || msgIndex >= SCRIPT.length) return;
      const text = SCRIPT[msgIndex].text;
      let char = 0;
      setVisibleCount(msgIndex + 1);
      const interval = setInterval(() => {
        if (cancelled) {
          clearInterval(interval);
          return;
        }
        char++;
        setTypedChars(char);
        if (char >= text.length) {
          clearInterval(interval);
          setTimeout(() => {
            if (cancelled) return;
            msgIndex++;
            setTypedChars(0);
            typeNext();
          }, PAUSE_AFTER_MS);
        }
      }, TYPING_MS);
    }

    const startTimer = setTimeout(typeNext, 700);
    return () => {
      cancelled = true;
      clearTimeout(startTimer);
    };
  }, []);

  useEffect(() => {
    containerRef.current?.scrollTo({ top: containerRef.current.scrollHeight, behavior: "smooth" });
  }, [visibleCount, typedChars]);

  return (
    <div className="w-full max-w-sm rounded-[28px] border border-hairline bg-white shadow-[0_24px_64px_-24px_rgba(20,24,29,0.28)]">
      <div className="flex items-center gap-2.5 rounded-t-[28px] border-b border-hairline bg-ivory px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-cobalt text-sm font-semibold text-white">
          D
        </div>
        <div>
          <p className="font-display text-sm font-semibold leading-tight text-night">Disha</p>
          <p className="text-xs text-dusk">online</p>
        </div>
      </div>

      <div ref={containerRef} className="flex max-h-96 flex-col gap-2 overflow-y-auto px-4 py-4">
        {SCRIPT.slice(0, visibleCount).map((msg, i) => {
          const isLast = i === visibleCount - 1;
          const displayText =
            !reducedMotion && isLast && typedChars < msg.text.length
              ? msg.text.slice(0, typedChars)
              : msg.text;
          return (
            <div key={i} className="flex flex-col gap-1" style={{ animation: "fade-in-up 0.3s ease-out" }}>
              {msg.day && (
                <div className="my-1 self-center rounded-full bg-ivory px-3 py-1 text-[11px] text-dusk">
                  {msg.day}
                </div>
              )}
              <div
                className={
                  "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-snug " +
                  (msg.from === "bot"
                    ? "self-start rounded-bl-sm bg-ivory text-night"
                    : "self-end rounded-br-sm bg-cobalt text-white")
                }
              >
                {displayText}
                {!reducedMotion && isLast && typedChars < msg.text.length && (
                  <span
                    className="ml-0.5 inline-block h-3.5 w-[2px] translate-y-0.5 bg-current align-middle"
                    style={{ animation: "blink-caret 0.8s step-end infinite" }}
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
