// Generates per-scene TTS narration for the OPTIONAL voiced render.
// Uses macOS `say` (offline Indian-English voice) -> wav in public/audio/.
// The silent caption-only master is the festival-compliant deliverable;
// this voiced track is a convenience/backup version.
import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";

const VOICE = process.env.VOICE || "Tara"; // en_IN, warm. Try "Aman" / "Rishi".
const OUT = "public/audio";
mkdirSync(OUT, { recursive: true });

// Narration per scene id. Must fit inside the scene's duration (see timings.ts).
const narration = {
  intro:
    "Meet Disha Buddy. A free mentor on Telegram that helps Indian students find the right college, and never miss a deadline.",
  problem:
    "Every year, fifteen lakh students chase college seats. But ninety three percent of Indian schools have no career counsellor. That's one counsellor for every three thousand students. First generation and small town students miss deadlines, don't know real cutoffs or fees, and can't afford private guidance.",
  solution:
    "Disha changes that. A warm, Hinglish speaking buddy on the app students already use. It remembers each student's marks, budget, and stream. It recommends colleges that genuinely fit, with cited sources, never false promises. And it texts first, before a counselling round closes.",
  demo:
    "Here's how it feels. A student messages in Hinglish: seventy eight percent aaye, budget one lakh. Disha replies in seconds with real colleges, fees, and cutoffs, each backed by a dated source. Days later, it reaches out on its own: Riya, AKTU round two kal band ho raha hai. A privacy first C R M tracks every student and deadline, one line summaries only, never full chats.",
  tech:
    "Under the hood: an A I agent runtime with persistent memory, generative A I for natural Hinglish, and retrieval augmented generation over a crawled college dataset, so every answer is grounded. Built to run G P U free on Intel's OpenVINO.",
  future:
    "What's next: all of India, more languages, WhatsApp, and scholarship matching. So every student has a mentor in their pocket. Disha Buddy. Sahi disha, sahi decision.",
};

const report = [];
for (const [id, text] of Object.entries(narration)) {
  const aiff = `${OUT}/${id}.aiff`;
  const wav = `${OUT}/${id}.wav`;
  execSync(`say -v ${VOICE} -o ${JSON.stringify(aiff)} ${JSON.stringify(text)}`);
  execSync(
    `ffmpeg -y -i ${JSON.stringify(aiff)} -ar 48000 -ac 2 ${JSON.stringify(wav)} 2>/dev/null`
  );
  const dur = parseFloat(
    execSync(
      `ffprobe -v error -show_entries format=duration -of default=nokey=1:noprint_wrappers=1 ${JSON.stringify(wav)}`
    )
      .toString()
      .trim()
  );
  execSync(`rm -f ${JSON.stringify(aiff)}`);
  report.push({ id, seconds: Math.round(dur * 100) / 100 });
}
writeFileSync(`${OUT}/durations.json`, JSON.stringify(report, null, 2));
console.log("voice:", VOICE);
console.table(report);
