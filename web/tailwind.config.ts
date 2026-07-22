import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#FAF7F0",
        "paper-dim": "#F1ECE0",
        ink: "#1E2328",
        "ink-soft": "#4A5058",
        // "tg" (bright brand blue, #229ED9) is decorative-only — it's
        // under 4.5:1 against both white and paper (verified: 3.02:1),
        // so it's used for large glyphs/icons, never for text or a
        // background behind text. "tg-dark" is what carries text/bubble
        // fills; both were picked to clear AA (6.23:1) rather than
        // approximate the brand color and hope.
        tg: "#229ED9",
        "tg-dark": "#15678F",
        // Same story for coral: the bright brand tone (kept as "coral"
        // for non-text accents like the hero shadow) measured 2.63–2.82:1
        // against paper/white — under even the 3:1 large-text floor.
        // "coral-dark" is what actually carries button/heading text.
        coral: "#FF6B4A",
        "coral-dark": "#B33A1F",
        rule: "#D8D2C4",
        sage: "#3F5C44",
        // v2 landing palette (cobalt-on-ivory). The older paper/coral tokens
        // above stay: /hermes setup pages still use them.
        ivory: "#F7F7F4",
        night: "#14181D",
        dusk: "#575E68",
        cobalt: "#1D4FD7",
        "cobalt-deep": "#16389D",
        hairline: "#E4E5DF",
      },
      fontFamily: {
        display: ["var(--font-display)"],
        body: ["var(--font-body)"],
      },
    },
  },
  plugins: [],
};

export default config;
