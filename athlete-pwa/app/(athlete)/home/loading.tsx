export default function HomeLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-6 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <div className="w-32 h-4 rounded bg-gray-800" />
          <div className="w-48 h-6 rounded bg-gray-800" />
        </div>
        <div className="w-10 h-10 rounded-full bg-gray-800" />
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="bg-gray-800/50 rounded-2xl p-4 space-y-2">
            <div className="w-8 h-8 rounded-lg bg-gray-700" />
            <div className="w-12 h-5 rounded bg-gray-700" />
            <div className="w-16 h-3 rounded bg-gray-700" />
          </div>
        ))}
      </div>

      {/* Upcoming Bookings */}
      <div className="space-y-3">
        <div className="w-36 h-5 rounded bg-gray-800" />
        <div className="bg-gray-800/50 rounded-2xl p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gray-700" />
            <div className="flex-1 space-y-2">
              <div className="w-24 h-4 rounded bg-gray-700" />
              <div className="w-32 h-3 rounded bg-gray-700" />
            </div>
          </div>
        </div>
      </div>

      {/* Popular Gyms */}
      <div className="space-y-3">
        <div className="w-28 h-5 rounded bg-gray-800" />
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="min-w-[140px] bg-gray-800/50 rounded-2xl p-3 space-y-2">
              <div className="w-full h-20 rounded-xl bg-gray-700" />
              <div className="w-20 h-3 rounded bg-gray-700" />
              <div className="w-14 h-3 rounded bg-gray-700" />
            </div>
          ))}
        </div>
      </div>

      {/* Active Workout Card */}
      <div className="bg-emerald-900/20 rounded-2xl p-4 space-y-3">
        <div className="w-28 h-4 rounded bg-emerald-900/40" />
        <div className="w-full h-3 rounded bg-emerald-900/30" />
        <div className="w-20 h-8 rounded-lg bg-emerald-900/40" />
      </div>
    </div>
  );
}
