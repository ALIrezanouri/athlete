export default function BodyStatsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-28 h-6 rounded bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-2xl p-4 space-y-2">
            <div className="w-10 h-4 rounded bg-gray-700" />
            <div className="w-16 h-6 rounded bg-gray-700" />
            <div className="w-12 h-3 rounded bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Chart placeholder */}
      <div className="bg-gray-800/50 rounded-2xl p-4 space-y-3">
        <div className="w-20 h-5 rounded bg-gray-800" />
        <div className="w-full h-40 rounded-xl bg-gray-700" />
      </div>

      {/* Measurement list */}
      <div className="space-y-2">
        <div className="w-32 h-5 rounded bg-gray-800" />
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="flex items-center justify-between bg-gray-800/50 rounded-xl p-3">
            <div className="w-20 h-4 rounded bg-gray-700" />
            <div className="w-16 h-4 rounded bg-gray-700" />
          </div>
        ))}
      </div>
    </div>
  );
}
