export default function ShareWorkoutLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-gray-900 p-4 pb-24 space-y-4 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gray-800" />
          <div className="w-28 h-7 rounded-full bg-gray-800" />
        </div>
        <div className="w-8 h-8 rounded-lg bg-gray-800" />
      </div>

      {/* Workout preview card */}
      <div className="bg-gray-800/30 rounded-2xl p-4 space-y-4">
        {/* Workout name + date */}
        <div className="space-y-2">
          <div className="w-40 h-6 rounded-full bg-gray-800" />
          <div className="w-28 h-3 rounded-full bg-gray-800/40" />
        </div>

        {/* Duration + stats */}
        <div className="flex gap-4">
          <div className="w-16 h-4 rounded-full bg-gray-800/40" />
          <div className="w-20 h-4 rounded-full bg-gray-800/40" />
          <div className="w-14 h-4 rounded-full bg-gray-800/40" />
        </div>

        {/* Exercise summary */}
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex items-center justify-between py-1">
              <div className="w-28 h-4 rounded-full bg-gray-800/60" />
              <div className="w-20 h-3 rounded-full bg-gray-800/40" />
            </div>
          ))}
        </div>
      </div>

      {/* Share options */}
      <div className="space-y-2">
        <div className="w-24 h-5 rounded-full bg-gray-800" />
        <div className="flex gap-3 justify-center py-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="w-14 h-14 rounded-2xl bg-gray-800/50" />
          ))}
        </div>
      </div>

      {/* Copy link */}
      <div className="flex gap-2">
        <div className="flex-1 h-11 rounded-xl bg-gray-800/50" />
        <div className="w-20 h-11 rounded-xl bg-emerald-900/30" />
      </div>
    </div>
  );
}
