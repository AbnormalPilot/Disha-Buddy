import Landing from "./Landing";

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

export default async function LandingPage() {
  const botUsername = await getBotUsername();
  return <Landing botUsername={botUsername} />;
}
