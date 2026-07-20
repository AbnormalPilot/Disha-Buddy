"use client";

import { useEffect, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Button, Field, Select, StepShell, TextArea, TextInput, ValidateBadge } from "./ui";
import { EMPTY_FORM, toConfigPayload, type ValidateAllResponse, type ValidateResult, type WizardFormState } from "./types";

const STEP_TITLES = ["Telegram", "Brain", "Voice", "Data", "Persona", "Launch"];

const LLM_PROVIDERS = [
  { value: "openrouter", label: "OpenRouter" },
  { value: "openai", label: "OpenAI" },
  { value: "anthropic", label: "Anthropic" },
  { value: "gemini", label: "Google Gemini" },
  { value: "nous", label: "Nous Portal (API key)" },
  { value: "custom", label: "Custom (OpenAI-compatible base URL)" },
];

const TRANSCRIPTION_PROVIDERS = [
  { value: "groq", label: "Groq (Whisper, fast + cheap)" },
  { value: "openai", label: "OpenAI" },
  { value: "mistral", label: "Mistral" },
  { value: "xai", label: "xAI" },
  { value: "local", label: "Local (faster-whisper, no key needed)" },
];

async function api(path: string, opts?: RequestInit) {
  const res = await fetch(`/api/hermes/${path}`, {
    ...opts,
    headers: { "Content-Type": "application/json", ...(opts?.headers ?? {}) },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`${res.status}: ${text.slice(0, 300)}`);
  }
  return res.json();
}

export default function Wizard({ onLaunched }: { onLaunched: () => void }) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardFormState>(EMPTY_FORM);
  const [validation, setValidation] = useState<Partial<ValidateAllResponse>>({});
  const [validating, setValidating] = useState(false);
  const [validateError, setValidateError] = useState<string | null>(null);
  const [persona, setPersona] = useState<{ soul_md: string; agents_md: string } | null>(null);
  const [launching, setLaunching] = useState(false);
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [launched, setLaunched] = useState(false);
  const [collegesCount, setCollegesCount] = useState<number | null>(null);

  useEffect(() => {
    api("colleges/count").then((r) => setCollegesCount(r.count)).catch(() => {});
    api("config").then((cfg) => {
      if (!cfg.configured) return;
      setForm((f) => ({
        ...f,
        telegram_bot_username: cfg.telegram_bot_username ?? "",
        llm_provider: cfg.llm_provider ?? "",
        llm_model: cfg.llm_model ?? "",
        llm_base_url: cfg.llm_base_url ?? "",
        transcription_provider: cfg.transcription_provider ?? "",
        voice_enabled: cfg.voice_enabled ?? true,
        persona_extra_instructions: cfg.persona_extra_instructions ?? "",
        telegram_allowed_users: (cfg.telegram_allowed_users ?? []).join(", "),
      }));
    }).catch(() => {});
    api("persona").then((p) => {
      setPersona({ soul_md: p.soul_md, agents_md: p.agents_md });
      setForm((f) => (f.persona_extra_instructions ? f : { ...f, persona_extra_instructions: p.extra_instructions ?? "" }));
    }).catch(() => {});
  }, []);

  function set<K extends keyof WizardFormState>(key: K, value: WizardFormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function runValidate() {
    setValidating(true);
    setValidateError(null);
    try {
      const result: ValidateAllResponse = await api("validate", {
        method: "POST",
        body: JSON.stringify(toConfigPayload(form)),
      });
      setValidation(result);
      if (result.telegram?.bot_username) {
        set("telegram_bot_username", result.telegram.bot_username);
      }
      return result;
    } catch (err) {
      setValidateError(String(err));
      return null;
    } finally {
      setValidating(false);
    }
  }

  async function handleLaunch() {
    setLaunching(true);
    setLaunchError(null);
    try {
      await api("config", { method: "POST", body: JSON.stringify(toConfigPayload(form)) });
      await api("gateway/start", { method: "POST" });
      setLaunched(true);
      onLaunched();
    } catch (err) {
      setLaunchError(String(err));
    } finally {
      setLaunching(false);
    }
  }

  const totalSteps = STEP_TITLES.length;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-6">
      <div className="flex gap-3 text-xs text-neutral-500">
        {STEP_TITLES.map((t, i) => (
          <span key={t} className={i === step ? "font-semibold text-emerald-400" : ""}>
            {i + 1}. {t}
          </span>
        ))}
      </div>

      {step === 0 && (
        <StepShell
          title="Connect your Telegram bot"
          description="Create a bot with @BotFather on Telegram if you haven't already: send /newbot, follow the prompts, and paste the token it gives you below."
          step={step}
          totalSteps={totalSteps}
        >
          <Field label="Bot token">
            <TextInput
              type="password"
              value={form.telegram_bot_token}
              onChange={(e) => set("telegram_bot_token", e.target.value)}
              placeholder="123456789:AAExampleTokenFromBotFather"
            />
          </Field>
          <Field label="Allowed Telegram user IDs (optional, comma-separated)" hint="Leave blank during a private pilot only if you understand the risk — otherwise list the numeric IDs allowed to DM the bot.">
            <TextInput
              value={form.telegram_allowed_users}
              onChange={(e) => set("telegram_allowed_users", e.target.value)}
              placeholder="123456789, 987654321"
            />
          </Field>
          <ValidateBadge result={validation.telegram} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={runValidate} disabled={validating || !form.telegram_bot_token}>
              {validating ? "Checking…" : "Validate"}
            </Button>
            <Button onClick={() => setStep(1)} disabled={!validation.telegram?.ok}>
              Next
            </Button>
          </div>
        </StepShell>
      )}

      {step === 1 && (
        <StepShell
          title="Pick the brain"
          description="Which LLM provider powers Disha's replies."
          step={step}
          totalSteps={totalSteps}
        >
          <Field label="Provider">
            <Select
              value={form.llm_provider}
              onChange={(v) => set("llm_provider", v as WizardFormState["llm_provider"])}
              options={LLM_PROVIDERS}
            />
          </Field>
          {form.llm_provider === "custom" && (
            <Field label="Base URL" hint="Any OpenAI-compatible endpoint">
              <TextInput
                value={form.llm_base_url}
                onChange={(e) => set("llm_base_url", e.target.value)}
                placeholder="https://your-endpoint/v1"
              />
            </Field>
          )}
          <Field label="API key">
            <TextInput
              type="password"
              value={form.llm_api_key}
              onChange={(e) => set("llm_api_key", e.target.value)}
            />
          </Field>
          <Field label="Model" hint="e.g. anthropic/claude-opus-4.6, gpt-4o, openrouter/pareto-code">
            <TextInput
              value={form.llm_model}
              onChange={(e) => set("llm_model", e.target.value)}
              placeholder="anthropic/claude-opus-4.6"
            />
          </Field>
          <ValidateBadge result={validation.llm} />
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(0)}>
              Back
            </Button>
            <Button
              variant="secondary"
              onClick={runValidate}
              disabled={validating || !form.llm_provider || !form.llm_api_key}
            >
              {validating ? "Checking…" : "Validate"}
            </Button>
            <Button onClick={() => setStep(2)} disabled={!validation.llm?.ok}>
              Next
            </Button>
          </div>
        </StepShell>
      )}

      {step === 2 && (
        <StepShell
          title="Voice notes"
          description="Students often send voice notes instead of typing. Pick a transcription provider, or turn voice off for now."
          step={step}
          totalSteps={totalSteps}
        >
          <Field label="Enable voice notes">
            <label className="flex items-center gap-2 text-sm text-neutral-300">
              <input
                type="checkbox"
                checked={form.voice_enabled}
                onChange={(e) => set("voice_enabled", e.target.checked)}
              />
              Transcribe incoming voice messages
            </label>
          </Field>
          {form.voice_enabled && (
            <>
              <Field label="Transcription provider">
                <Select
                  value={form.transcription_provider}
                  onChange={(v) => set("transcription_provider", v as WizardFormState["transcription_provider"])}
                  options={TRANSCRIPTION_PROVIDERS}
                />
              </Field>
              {form.transcription_provider && form.transcription_provider !== "local" && (
                <Field label="API key">
                  <TextInput
                    type="password"
                    value={form.transcription_api_key}
                    onChange={(e) => set("transcription_api_key", e.target.value)}
                  />
                </Field>
              )}
              <ValidateBadge result={validation.transcription} />
            </>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(1)}>
              Back
            </Button>
            {form.voice_enabled && (
              <Button variant="secondary" onClick={runValidate} disabled={validating || !form.transcription_provider}>
                {validating ? "Checking…" : "Validate"}
              </Button>
            )}
            <Button
              onClick={() => setStep(3)}
              disabled={form.voice_enabled && !!form.transcription_provider && !validation.transcription?.ok}
            >
              Next
            </Button>
          </div>
        </StepShell>
      )}

      {step === 3 && (
        <StepShell
          title="College data"
          description="DataBlue powers cached college data and live counseling-deadline lookups."
          step={step}
          totalSteps={totalSteps}
        >
          <Field label="DataBlue API key">
            <TextInput
              type="password"
              value={form.datablue_api_key}
              onChange={(e) => set("datablue_api_key", e.target.value)}
            />
          </Field>
          <ValidateBadge result={validation.datablue} />
          <div className="rounded border border-neutral-800 bg-neutral-900 px-3 py-2 text-xs text-neutral-400">
            {collegesCount === null
              ? "Checking cached college data…"
              : collegesCount > 0
                ? `${collegesCount} college${collegesCount === 1 ? "" : "s"} cached and ready.`
                : "No colleges cached yet."}{" "}
            {collegesCount === 0 && (
              <>
                Run{" "}
                <code className="rounded bg-neutral-800 px-1 py-0.5">
                  docker compose run hermes python scripts/crawl_colleges.py
                </code>{" "}
                from a terminal on the host once your DataBlue key is set.
              </>
            )}
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(2)}>
              Back
            </Button>
            <Button variant="secondary" onClick={runValidate} disabled={validating || !form.datablue_api_key}>
              {validating ? "Checking…" : "Validate"}
            </Button>
            <Button onClick={() => setStep(4)}>Next</Button>
          </div>
          {!form.datablue_api_key && (
            <p className="text-xs text-neutral-500">
              You can skip this and add it later — Disha just won't have live college data until you do.
            </p>
          )}
        </StepShell>
      )}

      {step === 4 && (
        <StepShell
          title="Persona"
          description="This is Disha's default voice and standing rules — not editable here, but you can add extra instructions on top."
          step={step}
          totalSteps={totalSteps}
        >
          {persona && (
            <details className="rounded border border-neutral-800 bg-neutral-900 p-3 text-xs text-neutral-400">
              <summary className="cursor-pointer text-neutral-200">Preview SOUL.md + AGENTS.md</summary>
              <pre className="mt-2 whitespace-pre-wrap">{persona.soul_md}</pre>
              <hr className="my-2 border-neutral-800" />
              <pre className="whitespace-pre-wrap">{persona.agents_md}</pre>
            </details>
          )}
          <Field label="Extra instructions (optional)" hint="Appended to the mission/rules file, e.g. regional focus or tone tweaks.">
            <TextArea
              rows={4}
              value={form.persona_extra_instructions}
              onChange={(e) => set("persona_extra_instructions", e.target.value)}
            />
          </Field>
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setStep(3)}>
              Back
            </Button>
            <Button onClick={() => setStep(5)}>Next</Button>
          </div>
        </StepShell>
      )}

      {step === 5 && (
        <StepShell title="Launch" description="Review, then start the bot." step={step} totalSteps={totalSteps}>
          <ul className="flex flex-col gap-1 rounded border border-neutral-800 bg-neutral-900 p-4 text-sm text-neutral-300">
            <li>Telegram bot: @{form.telegram_bot_username || "(not validated)"}</li>
            <li>LLM: {form.llm_provider} — {form.llm_model || "(default model)"}</li>
            <li>Voice notes: {form.voice_enabled ? `on (${form.transcription_provider || "not set"})` : "off"}</li>
            <li>DataBlue: {form.datablue_api_key ? "configured" : "not configured"}</li>
          </ul>
          {launchError && <ValidateBadge result={{ ok: false, message: launchError }} />}
          {launched ? (
            <div className="flex flex-col items-start gap-3 rounded border border-emerald-800 bg-emerald-950 p-4 text-sm text-emerald-300">
              <p>Disha is live.</p>
              {form.telegram_bot_username && (
                <>
                  <a
                    className="underline"
                    href={`https://t.me/${form.telegram_bot_username}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open t.me/{form.telegram_bot_username}
                  </a>
                  <div className="rounded bg-white p-3">
                    <QRCodeSVG value={`https://t.me/${form.telegram_bot_username}`} size={140} />
                  </div>
                  <p className="text-xs text-emerald-400">Scan to open the bot on a phone.</p>
                </>
              )}
            </div>
          ) : (
            <div className="flex gap-3">
              <Button variant="secondary" onClick={() => setStep(4)} disabled={launching}>
                Back
              </Button>
              <Button onClick={handleLaunch} disabled={launching}>
                {launching ? "Starting…" : "Save & start"}
              </Button>
            </div>
          )}
        </StepShell>
      )}
    </div>
  );
}
