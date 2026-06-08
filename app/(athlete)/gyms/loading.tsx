export default function GymsLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 animate-pulse">
      {/* Header */}
      <div className="mb-6">
        <div className="w-32 h-6 rounded-full bg-gray-800 mb-3" />
        <div className="w-56 h-4 rounded-full bg-gray-800/60" />
      </div>

      {/* Search bar placeholder */}
      <div className="w-full h-12 rounded-2xl bg-gray-800 mb-6" />

      {/* Filter chips */}
      <div className="flex gap-2 mb-6 overflow-hidden">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="w-20 h-8 rounded-full bg-gray-800 shrink-0" />
        ))}
      </div>

      {/* Gym cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl bg-gray-800/50 overflow-hidden">
            {/* Image placeholder */}
            <div className="w-full h-40 bg-gray-800" />
            {/* Card content */}
            <div className="p-4 space-y-3">
              <div className="w-3/4 h-5 rounded-full bg-gray-700" />
              <div className="w-1/2 h-3 rounded-full bg-gray-700/60" />
              <div className="flex gap-2">
                <div className="w-16 h-6 rounded-full bg-gray-700/40" />
                <div className="w-16 h-6 rounded-full bg-gray-700/40" />
              </div>
              {/* Rating + distance */}
              <div className="flex justify-between">
                <div className="w-20 h-4 rounded-full bg-gray-700/40" />
                <div className="w-16 h-4 rounded-full bg-gray-700/40" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
