export default function Loading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-12 animate-pulse">
      {/* Hero skeleton */}
      <div className="mb-12 flex flex-col items-center gap-4">
        <div className="h-10 w-96 max-w-full rounded-2xl bg-surface-2" />
        <div className="h-5 w-64 rounded-xl bg-surface-2" />
        <div className="h-10 w-36 rounded-xl bg-surface-2" />
      </div>

      {/* Feature cards skeleton */}
      <div className="mb-10 grid grid-cols-2 gap-4 md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-4 space-y-2">
            <div className="h-6 w-6 rounded-lg bg-surface-2" />
            <div className="h-4 w-3/4 rounded-lg bg-surface-2" />
            <div className="h-3 w-full rounded-lg bg-surface-2" />
          </div>
        ))}
      </div>

      {/* Product grid skeleton */}
      <div className="h-7 w-48 rounded-xl bg-surface-2 mb-6" />
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="card overflow-hidden">
            <div className="aspect-square bg-surface-2" />
            <div className="p-4 space-y-2">
              <div className="h-4 w-full rounded-lg bg-surface-2" />
              <div className="h-3 w-2/3 rounded-lg bg-surface-2" />
              <div className="h-5 w-1/2 rounded-lg bg-surface-2 mt-3" />
              <div className="h-9 w-full rounded-xl bg-surface-2 mt-2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
