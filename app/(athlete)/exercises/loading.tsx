export default function ExercisesLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="w-28 h-6 rounded bg-gray-800" />
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Search bar */}
      <div className="w-full h-12 rounded-2xl bg-gray-800" />

      {/* Filter chips */}
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="w-16 h-8 rounded-full bg-gray-800" />
        ))}
      </div>

      {/* Exercise cards */}
      <div className="grid grid-cols-2 gap-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-2xl overflow-hidden space-y-2">
            <div className="w-full h-24 bg-gray-700" />
            <div className="p-2 space-y-1.5">
              <div className="w-3/4 h-3.5 rounded bg-gray-700" />
              <div className="w-1/2 h-2.5 rounded bg-gray-700" />
              <div className="flex gap-1">
                <div className="w-12 h-5 rounded-full bg-gray-700/60" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
