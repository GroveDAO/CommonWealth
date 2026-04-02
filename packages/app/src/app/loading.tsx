export default function GlobalLoading() {
  return (
    <main className="max-w-7xl mx-auto px-6 py-12">
      <div className="rounded-card border border-border bg-bg-card p-6 animate-pulse">
        <div className="h-4 w-32 rounded-full bg-bg-surface mb-4" />
        <div className="h-10 w-3/4 rounded-full bg-bg-surface mb-6" />
        <div className="grid gap-4 md:grid-cols-3">
          <div className="h-28 rounded-card bg-bg-surface" />
          <div className="h-28 rounded-card bg-bg-surface" />
          <div className="h-28 rounded-card bg-bg-surface" />
        </div>
      </div>
    </main>
  );
}