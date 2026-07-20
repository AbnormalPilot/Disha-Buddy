export type LlmProvider = "openrouter" | "anthropic" | "nous" | "openai" | "custom";
export type TranscriptionProvider = "groq" | "openai" | "mistral" | "xai" | "local";

export interface WizardFormState {
  telegram_bot_token: string;
  telegram_bot_username: string;
  telegram_allowed_users: string; // comma-separated in the UI, split before sending

  llm_provider: LlmProvider | "";
  llm_api_key: string;
  llm_model: string;
  llm_base_url: string;

  transcription_provider: TranscriptionProvider | "";
  transcription_api_key: string;
  voice_enabled: boolean;

  datablue_api_key: string;

  persona_extra_instructions: string;
}

export const EMPTY_FORM: WizardFormState = {
  telegram_bot_token: "",
  telegram_bot_username: "",
  telegram_allowed_users: "",
  llm_provider: "",
  llm_api_key: "",
  llm_model: "",
  llm_base_url: "",
  transcription_provider: "",
  transcription_api_key: "",
  voice_enabled: true,
  datablue_api_key: "",
  persona_extra_instructions: "",
};

export interface ValidateResult {
  ok: boolean;
  message: string;
  bot_username?: string;
}

export interface ValidateAllResponse {
  telegram: ValidateResult;
  llm: ValidateResult;
  transcription: ValidateResult;
  datablue: ValidateResult;
}

export interface StatusResponse {
  configured: boolean;
  gateway: "running" | "stopped" | "error";
  pid: number | null;
  uptime_seconds: number | null;
  control_plane_uptime_seconds: number;
  model: string | null;
  bot_username: string | null;
  last_error: { action: string; output: string; at: number } | null;
}

export function toConfigPayload(form: WizardFormState) {
  return {
    telegram_bot_token: form.telegram_bot_token || null,
    telegram_bot_username: form.telegram_bot_username || null,
    telegram_allowed_users: form.telegram_allowed_users
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean),
    llm_provider: form.llm_provider || null,
    llm_api_key: form.llm_api_key || null,
    llm_model: form.llm_model || null,
    llm_base_url: form.llm_base_url || null,
    transcription_provider: form.transcription_provider || null,
    transcription_api_key: form.transcription_api_key || null,
    voice_enabled: form.voice_enabled,
    datablue_api_key: form.datablue_api_key || null,
    persona_extra_instructions: form.persona_extra_instructions || null,
  };
}
