export default function ProductLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 animate-pulse">
      {/* Breadcrumb */}
      <div className="mb-6 flex gap-2">
        {[64, 24, 96, 24, 128].map((w, i) => (
          <div key={i} className="h-4 rounded-lg bg-surface-2" style={{ width: w }} />
        ))}
      </div>

      <div className="grid gap-10 lg:grid-cols-2">
        {/* Gallery */}
        <div className="space-y-3">
          <div className="aspect-square rounded-2xl bg-surface-2" />
          <div className="flex gap-2">
            {[1,2,3].map((i) => <div key={i} className="h-16 w-16 rounded-xl bg-surface-2" />)}
          </div>
        </div>

        {/* Info */}
        <div className="space-y-5">
          <div className="h-7 w-full rounded-xl bg-surface-2" />
          <div className="h-5 w-3/4 rounded-lg bg-surface-2" />
          <div className="grid grid-cols-2 gap-3">
            <div className="h-28 rounded-2xl bg-surface-2" />
            <div className="h-28 rounded-2xl bg-surface-2" />
          </div>
          <div className="h-4 w-48 rounded-lg bg-surface-2" />
          <div className="h-12 w-full rounded-xl bg-surface-2" />
          <div className="space-y-2">
            <div className="h-3 w-full rounded-lg bg-surface-2" />
            <div className="h-3 w-5/6 rounded-lg bg-surface-2" />
            <div className="h-3 w-4/6 rounded-lg bg-surface-2" />
          </div>
        </div>
      </div>
    </div>
  );
}
