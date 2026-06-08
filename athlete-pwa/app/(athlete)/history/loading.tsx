export default function HistoryLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-28 h-7 rounded-full bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Filter tabs */}
      <div className="flex gap-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="w-20 h-8 rounded-full bg-gray-800/60" />
        ))}
      </div>

      {/* Summary stats */}
      <div className="flex gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex-1 h-16 rounded-2xl bg-gray-800/50" />
        ))}
      </div>

      {/* History list */}
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="bg-gray-800/30 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="w-32 h-5 rounded-full bg-gray-800" />
              <div className="w-20 h-4 rounded-full bg-gray-800/60" />
            </div>
            <div className="flex gap-4">
              <div className="w-16 h-4 rounded-full bg-gray-800/40" />
              <div className="w-20 h-4 rounded-full bg-gray-800/40" />
              <div className="w-14 h-4 rounded-full bg-gray-800/40" />
            </div>
            <div className="flex gap-2">
              <div className="w-12 h-6 rounded-full bg-gray-800/30" />
              <div className="w-16 h-6 rounded-full bg-gray-800/30" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
