export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold">Disha Buddy</h1>
      <p className="max-w-md text-sm text-neutral-500">
        The real landing page lands in a later build pass (HANDOVER.md §6.3). For now:{" "}
        <a className="underline" href="/hermes">
          set up the bot at /hermes
        </a>
        .
      </p>
    </main>
  );
}
