export default function PRLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-36 h-7 rounded-full bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Summary stats */}
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-20 rounded-2xl bg-gray-800/50" />
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2 overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-16 h-8 rounded-full bg-gray-800/60 shrink-0" />
        ))}
      </div>

      {/* PR cards */}
      <div className="space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-800/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-gray-800" />
                <div className="space-y-1">
                  <div className="w-24 h-4 rounded-full bg-gray-800" />
                  <div className="w-16 h-3 rounded-full bg-gray-800/40" />
                </div>
              </div>
              <div className="text-right space-y-1">
                <div className="w-16 h-5 rounded-full bg-gray-800" />
                <div className="w-12 h-3 rounded-full bg-gray-800/40" />
              </div>
            </div>
            <div className="w-full h-1 rounded-full bg-gray-800/40" />
          </div>
        ))}
      </div>
    </div>
  );
}
