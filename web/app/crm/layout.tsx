import Link from "next/link";
import AccessToggle from "./AccessToggle";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <nav className="flex items-center gap-6 border-b border-zinc-200 bg-white px-6 py-3 text-sm">
        <span className="font-semibold text-zinc-900">Disha Buddy CRM</span>
        <Link href="/crm" className="text-zinc-500 transition-colors hover:text-zinc-900">
          Dashboard
        </Link>
        <Link href="/crm/students" className="text-zinc-500 transition-colors hover:text-zinc-900">
          Students
        </Link>
        <span className="ml-auto">
          <AccessToggle />
        </span>
      </nav>
      <div className="mx-auto max-w-6xl p-6">{children}</div>
    </div>
  );
}
