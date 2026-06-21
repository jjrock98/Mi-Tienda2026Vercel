export default function AdminLoading() {
  return (
    <div className="animate-pulse space-y-6">
      {/* Title */}
      <div className="h-8 w-64 rounded-xl bg-surface-2" />

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="card p-5 space-y-3">
            <div className="h-10 w-10 rounded-xl bg-surface-2" />
            <div className="h-7 w-16 rounded-lg bg-surface-2" />
            <div className="h-3 w-3/4 rounded-lg bg-surface-2" />
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="card p-5 space-y-4">
        <div className="h-5 w-40 rounded-lg bg-surface-2" />
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 w-24 rounded-lg bg-surface-2" />
              <div className="h-4 flex-1 rounded-lg bg-surface-2" />
              <div className="h-4 w-20 rounded-lg bg-surface-2" />
              <div className="h-4 w-16 rounded-lg bg-surface-2" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
