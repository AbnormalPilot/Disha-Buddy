"use client";

import type { ValidateResult } from "./types";

export function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-sm font-medium text-neutral-200">{label}</span>
      {hint && <span className="text-xs text-neutral-500">{hint}</span>}
      {children}
    </label>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={
        "rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-400 " +
        (props.className ?? "")
      }
    />
  );
}

export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={
        "rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-400 " +
        (props.className ?? "")
      }
    />
  );
}

export function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="rounded border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 outline-none focus:border-neutral-400"
    >
      <option value="">Select…</option>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Button({
  variant = "primary",
  className = "",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const styles = {
    primary: "bg-emerald-600 hover:bg-emerald-500 text-white disabled:bg-neutral-700",
    secondary: "bg-neutral-800 hover:bg-neutral-700 text-neutral-100 disabled:opacity-50",
    danger: "bg-red-700 hover:bg-red-600 text-white disabled:opacity-50",
  }[variant];
  return (
    <button
      {...props}
      className={`rounded px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed ${styles} ${className}`}
    />
  );
}

export function ValidateBadge({ result }: { result: ValidateResult | null | undefined }) {
  if (!result) return null;
  return (
    <div
      className={
        "flex items-start gap-2 rounded px-3 py-2 text-xs " +
        (result.ok ? "bg-emerald-950 text-emerald-300" : "bg-red-950 text-red-300")
      }
    >
      <span>{result.ok ? "✓" : "✗"}</span>
      <span>{result.message}</span>
    </div>
  );
}

export function StepShell({
  title,
  description,
  step,
  totalSteps,
  children,
}: {
  title: string;
  description?: string;
  step: number;
  totalSteps: number;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2 text-xs text-neutral-500">
        {Array.from({ length: totalSteps }, (_, i) => (
          <span
            key={i}
            className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-emerald-600" : "bg-neutral-800"}`}
          />
        ))}
      </div>
      <div>
        <h2 className="text-xl font-semibold text-neutral-50">{title}</h2>
        {description && <p className="mt-1 text-sm text-neutral-400">{description}</p>}
      </div>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  );
}
