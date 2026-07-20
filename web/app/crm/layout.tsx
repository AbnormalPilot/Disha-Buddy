import Link from "next/link";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100">
      <nav className="flex items-center gap-6 border-b border-neutral-800 px-6 py-3 text-sm">
        <span className="font-semibold">Disha Buddy CRM</span>
        <Link href="/crm" className="text-neutral-400 hover:text-neutral-100">
          Dashboard
        </Link>
        <Link href="/crm/students" className="text-neutral-400 hover:text-neutral-100">
          Students
        </Link>
      </nav>
      <div className="p-6">{children}</div>
    </div>
  );
}
