import Link from "next/link";
import ChatDemo from "./ChatDemo";

async function getBotUsername(): Promise<string | null> {
  const base = process.env.HERMES_CONTROL_URL ?? "http://hermes:8300";
  const token = process.env.CONTROL_TOKEN ?? "";
  try {
    const res = await fetch(`${base}/status`, { headers: { "X-Control-Token": token }, cache: "no-store" });
    if (!res.ok) return null;
    const data = await res.json();
    return data.bot_username ?? null;
  } catch {
    return null;
  }
}

function TelegramCta({ botUsername, className = "" }: { botUsername: string | null; className?: string }) {
  if (botUsername) {
    return (
      <a
        href={`https://t.me/${botUsername}`}
        target="_blank"
        rel="noreferrer"
        className={
          "inline-flex items-center justify-center gap-2 rounded-full bg-coral-dark px-6 py-3 font-display text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(179,58,25,0.5)] transition-transform hover:scale-[1.03] hover:bg-[#8f2e19] " +
          className
        }
      >
        Chat with Disha on Telegram →
      </a>
    );
  }
  return (
    <Link
      href="/hermes"
      className={
        "inline-flex items-center justify-center gap-2 rounded-full bg-coral-dark px-6 py-3 font-display text-sm font-semibold text-white shadow-[0_8px_24px_-8px_rgba(179,58,25,0.5)] transition-transform hover:scale-[1.03] hover:bg-[#8f2e19] " +
        className
      }
    >
      Set up Disha →
    </Link>
  );
}

export default async function LandingPage() {
  const botUsername = await getBotUsername();

  return (
    <main className="overflow-x-hidden">
      {/* ---------- Hero ---------- */}
      <section className="relative border-b border-rule bg-paper px-6 pb-20 pt-16 sm:pt-24">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "repeating-linear-gradient(to bottom, transparent, transparent 27px, #D8D2C4 28px)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center gap-12 lg:flex-row lg:items-center lg:gap-16">
          <div className="flex flex-col items-center gap-6 text-center lg:items-start lg:text-left">
            <span className="rounded-full border border-rule bg-white px-3 py-1 text-xs font-medium text-ink-soft">
              India AI Impact Festival 2026
            </span>
            <h1 className="max-w-md font-display text-4xl font-semibold leading-[1.1] text-ink sm:text-5xl">
              The older sibling who already found your colleges.
            </h1>
            <p className="max-w-md text-base leading-relaxed text-ink-soft sm:text-lg">
              Disha remembers your marks, your budget, your deadlines — and texts{" "}
              <em className="not-italic text-ink">you</em> first when something needs your attention.
              Free, in Hinglish, on Telegram.
            </p>
            <TelegramCta botUsername={botUsername} />
          </div>
          <div className="w-full max-w-sm shrink-0">
            <ChatDemo />
          </div>
        </div>
      </section>

      {/* ---------- It remembers you ---------- */}
      <section className="border-b border-rule bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-semibold text-ink">
            It remembers you. Portals don&apos;t.
          </h2>
          <p className="mt-3 max-w-xl text-ink-soft">
            Every college website makes you start over. Disha doesn&apos;t.
          </p>
          <div className="mt-10 grid grid-cols-1 gap-6 sm:grid-cols-3">
            {[
              {
                title: "Never re-explains itself",
                body: "Tell it your marks and budget once. Three weeks later it still knows — no forms, no login.",
              },
              {
                title: "Texts you first",
                body: "A counseling round closing in 72 hours? You hear about it before you have to ask.",
              },
              {
                title: "Talks like a person",
                body: "Hindi, English, or however you mix the two — not shuddh Hindi, not corporate English, however you write it, Disha writes it back.",
              },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-rule bg-paper p-5">
                <h3 className="font-display text-lg font-semibold text-ink">{f.title}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---------- How it works ---------- */}
      <section className="border-b border-rule bg-paper px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-semibold text-ink">How it works</h2>
          <ol className="mt-10 grid grid-cols-1 gap-8 sm:grid-cols-3">
            {[
              {
                n: "1",
                title: "Open Telegram",
                body: "Tap the button, say hi. No app to install, no account to create.",
              },
              {
                n: "2",
                title: "Tell Disha a bit about you",
                body: "Marks, stream, budget, where you'd want to study. A couple of questions per chat, never a form.",
              },
              {
                n: "3",
                title: "Get fit, not just names",
                body: "Colleges matched to you — cited, dated, and honest about what's uncertain.",
              },
            ].map((s) => (
              <li key={s.n} className="flex flex-col gap-2">
                <span className="font-display text-4xl font-semibold text-coral-dark">{s.n}</span>
                <h3 className="font-display text-lg font-semibold text-ink">{s.title}</h3>
                <p className="text-sm leading-relaxed text-ink-soft">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ---------- Trust & data ---------- */}
      <section className="border-b border-rule bg-white px-6 py-20">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-3xl font-semibold text-ink">Where the data comes from</h2>
          <div className="mt-8 grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-rule bg-paper p-5">
              <h3 className="font-display text-base font-semibold text-sage">Live, cited data</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                College facts, fees, and cutoffs are cached from real crawls, refreshed nightly. Anything
                time-sensitive — a counseling round, a deadline — gets checked live, powered by{" "}
                <a
                  href="https://www.datablue.dev"
                  target="_blank"
                  rel="noreferrer"
                  className="text-tg-dark underline underline-offset-2"
                >
                  DataBlue
                </a>
                . Disha always says when a fact was last checked, and never guesses at a cutoff or date.
              </p>
            </div>
            <div className="rounded-xl border border-rule bg-paper p-5">
              <h3 className="font-display text-base font-semibold text-sage">Built for minors, on purpose</h3>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-soft">
                No document uploads, no exact address, no caste/category questions. Never guarantees an
                admission. If a chat turns heavy, Disha responds with care and points toward a trusted
                adult — always free, always yours to leave.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ---------- Footer ---------- */}
      <footer className="bg-ink px-6 py-12 text-paper">
        <div className="mx-auto flex max-w-5xl flex-col items-center gap-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <div>
            <p className="font-display text-lg font-semibold">Disha Buddy</p>
            <p className="mt-1 text-sm text-paper/70">
              India AI Impact Festival 2026 entry · data by{" "}
              <a href="https://www.datablue.dev" target="_blank" rel="noreferrer" className="underline underline-offset-2">
                DataBlue
              </a>
            </p>
          </div>
          <TelegramCta botUsername={botUsername} />
        </div>
      </footer>
    </main>
  );
}
